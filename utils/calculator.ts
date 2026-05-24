import { Expense, Member, MemberSummary, Payment } from './types';
import { roundCurrency, CurrencyCode } from './currency';
export { formatCurrency, roundCurrency } from './currency';

export function calculateSummary(
  members: Member[],
  expenses: Expense[],
  payments: Payment[],
  treasurerId?: string,
  currencyCode: CurrencyCode = 'VND',
): MemberSummary[] {
  const totalFundReceived = payments.reduce((sum, p) => sum + p.amount, 0);

  return members.map((member) => {
    // Calculate share for each expense this member participates in
    const items = expenses
      .filter((expense) => expense.participants.includes(member.id))
      .map((expense) => ({
        description: expense.description,
        share: expense.amount / expense.participants.length,
      }));

    const totalShare = items.reduce((sum, item) => sum + item.share, 0);

    // Sum all payments this member made to the treasurer
    const fundPayments = payments
      .filter((payment) => payment.memberId === member.id)
      .reduce((sum, payment) => sum + payment.amount, 0);

    // Sum all expenses this member paid for directly
    const advancedItems = expenses
      .filter((expense) => expense.paidBy === member.id)
      .map((expense) => ({
        description: expense.description,
        amount: expense.amount,
      }));

    const advancedPayments = advancedItems.reduce((sum, item) => sum + item.amount, 0);

    const totalPaid = fundPayments + advancedPayments;

    // TRUE BALANCE: (Contribution) - (Consumption)
    // For normal members: totalPaid - totalShare
    // For treasurer: totalPaid - totalShare - (Total Fund they are holding)
    const fundHeld = member.id === treasurerId ? totalFundReceived : 0;
    
    let balance = totalPaid - totalShare - fundHeld;

    // Individual "Debt" for UI (Remaining to pay to treasurer or group)
    const debt = roundCurrency(-balance, currencyCode);

    return {
      memberId: member.id,
      name: member.name,
      items,
      advancedItems,
      totalShare: roundCurrency(totalShare, currencyCode),
      totalPaid: roundCurrency(totalPaid, currencyCode),
      fundPayments: roundCurrency(fundPayments, currencyCode),
      advancedPayments: roundCurrency(advancedPayments, currencyCode),
      fundHeld: roundCurrency(fundHeld, currencyCode),
      balance: roundCurrency(balance, currencyCode),
      debt,
    };
  });
}

type BalanceItem = { id: string; name: string; amount: number };

function runGreedy(balances: BalanceItem[], currencyCode: CurrencyCode): import('./types').Settlement[] {
  const settlements: import('./types').Settlement[] = [];
  const localBalances = balances.map(b => ({ ...b })); // Clone
  
  const creditors = localBalances.filter(b => b.amount > 0).sort((a, b) => b.amount - a.amount);
  const debtors = localBalances.filter(b => b.amount < 0).sort((a, b) => a.amount - b.amount);

  let i = 0; // creditor index
  let j = 0; // debtor index

  while (i < creditors.length && j < debtors.length) {
    const amount = Math.min(creditors[i].amount, -debtors[j].amount);
    
    if (amount > 0.01) {
      settlements.push({
        fromId: debtors[j].id,
        fromName: debtors[j].name,
        toId: creditors[i].id,
        toName: creditors[i].name,
        amount: roundCurrency(amount, currencyCode)
      });
    }

    creditors[i].amount -= amount;
    debtors[j].amount += amount;

    if (creditors[i].amount < 0.01) i++;
    if (debtors[j].amount > -0.01) j++;
  }

  return settlements;
}

function findZeroSumSubset(arr: BalanceItem[], size: number, epsilon: number): BalanceItem[] | null {
  function backtrack(start: number, currentCombo: BalanceItem[]): BalanceItem[] | null {
    if (currentCombo.length === size) {
      const sum = currentCombo.reduce((acc, val) => acc + val.amount, 0);
      if (Math.abs(sum) < epsilon) {
        return currentCombo;
      }
      return null;
    }
    for (let i = start; i < arr.length; i++) {
      const res = backtrack(i + 1, [...currentCombo, arr[i]]);
      if (res) return res;
    }
    return null;
  }
  return backtrack(0, []);
}

export function calculateCentralizedSettlements(
  summaries: MemberSummary[],
  centralMemberId: string,
  currencyCode: CurrencyCode = 'VND',
): import('./types').Settlement[] {
  const settlements: import('./types').Settlement[] = [];
  const centralMember = summaries.find(s => s.memberId === centralMemberId);
  if (!centralMember) return [];

  summaries.forEach(s => {
    if (s.memberId === centralMemberId) return;

    // Positive balance means they are a creditor (should receive money)
    // Negative balance means they are a debtor (should pay money)
    if (s.balance < -0.01) {
      // Debtor pays to central member
      settlements.push({
        fromId: s.memberId,
        fromName: s.name,
        toId: centralMember.memberId,
        toName: centralMember.name,
        amount: roundCurrency(Math.abs(s.balance), currencyCode)
      });
    } else if (s.balance > 0.01) {
      // Central member pays to creditor
      settlements.push({
        fromId: centralMember.memberId,
        fromName: centralMember.name,
        toId: s.memberId,
        toName: s.name,
        amount: roundCurrency(s.balance, currencyCode)
      });
    }
  });

  return settlements;
}

export function calculateSettlements(
  summaries: MemberSummary[],
  currencyCode: CurrencyCode = 'VND',
  strategy: import('./types').SettlementStrategy = 'optimal',
  centralMemberId?: string,
): import('./types').Settlement[] {
  if (strategy === 'centralized' && centralMemberId) {
    return calculateCentralizedSettlements(summaries, centralMemberId, currencyCode);
  }

  const settlements: import('./types').Settlement[] = [];
  
  // Use pre-calculated balances. 
  // Positive balance = Creditor (owed money), Negative balance = Debtor (owes money)
  let balances = summaries
    .map(s => ({
      id: s.memberId,
      name: s.name,
      amount: s.balance
    }))
    .filter(b => Math.abs(b.amount) > 0.01);

  // 1. TỐI ƯU HÓA: Tìm các nhóm nhỏ có tổng bằng 0 (Subset Sum)
  // Chỉ áp dụng nếu số lượng người có số dư khác 0 <= 15
  if (balances.length <= 15) {
    const epsilon = 0.01;
    // Tìm các tập con có kích thước từ nhỏ đến lớn (từ 2 đến N)
    // Ưu tiên tập con nhỏ trước để tối đa hóa số lượng tập con, qua đó tối thiểu hóa số giao dịch
    for (let size = 2; size <= balances.length; size++) {
      let found = true;
      while (found) {
        found = false;
        const combo = findZeroSumSubset(balances, size, epsilon);
        if (combo) {
          // Xử lý tập con có tổng = 0 bằng Greedy (luôn cho kết quả tối ưu với các tập con này)
          settlements.push(...runGreedy(combo, currencyCode));
          
          // Loại bỏ những thành viên đã được thanh toán khỏi mảng balances
          const comboIds = new Set(combo.map(c => c.id));
          balances = balances.filter(b => !comboIds.has(b.id));
          found = true; // Tiếp tục tìm các tập con khác có cùng kích thước
        }
      }
    }
  }

  // 2. GREEDY FALLBACK
  // Xử lý những người còn lại, hoặc xử lý tất cả nếu số lượng người > 15
  if (balances.length > 0) {
    settlements.push(...runGreedy(balances, currencyCode));
  }

  return settlements;
}

export function getTotalExpenses(expenses: Expense[]): number {
  return expenses.reduce((sum, e) => sum + e.amount, 0);
}

export function getTotalPayments(payments: Payment[]): number {
  return payments.reduce((sum, p) => sum + p.amount, 0);
}



export function getInitials(name: string): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].substring(0, 1).toUpperCase();
  return (parts[0].substring(0, 1) + parts[parts.length - 1].substring(0, 1)).toUpperCase();
}

const AVATAR_COLORS = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEEAD',
  '#D4A5A5', '#9B59B6', '#3498DB', '#E67E22', '#2ECC71',
  '#F1C40F', '#E74C3C', '#16A085', '#273C75', '#F368E0'
];

export function getMemberColor(name: string): string {
  if (!name) return '#95A5A6';
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % AVATAR_COLORS.length;
  return AVATAR_COLORS[index];
}
