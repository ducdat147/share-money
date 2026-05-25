import { Expense, Member, MemberSummary, Payment, Settlement, SettlementStrategy } from './types';
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

    // Sum all payments made by this member to the treasurer
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
    let balance = 0;
    let fundHeld = 0;

    if (member.id === treasurerId) {
      fundHeld = totalFundReceived;
      balance = totalPaid - totalShare - fundHeld;
    } else {
      balance = totalPaid - totalShare;
    }

    // Debt calculation for simplified settlement (relative to treasurer)
    // Positive = owes treasurer, Negative = treasurer owes them
    let debt = 0;
    if (treasurerId && member.id !== treasurerId) {
      debt = totalShare - totalPaid;
    }

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
      debt: roundCurrency(debt, currencyCode),
    };
  });
}

interface BalanceItem {
  id: string;
  name: string;
  amount: number;
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
): Settlement[] {
  const settlements: Settlement[] = [];
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
  strategy: SettlementStrategy = 'optimal',
  centralMemberId?: string,
): Settlement[] {
  if (strategy === 'centralized' && centralMemberId) {
    return calculateCentralizedSettlements(summaries, centralMemberId, currencyCode);
  }

  const settlements: Settlement[] = [];
  
  // Use pre-calculated balances. 
  // Positive balance = Creditor (owed money), Negative balance = Debtor (owes money)
  let balances = summaries
    .map((s) => ({
      id: s.memberId,
      name: s.name,
      amount: s.balance,
    }))
    .filter((b) => Math.abs(b.amount) > 0.01);

  const epsilon = 0.01;

  // Subset Sum Optimization (for groups up to 15 people)
  if (balances.length > 0 && balances.length <= 15) {
    for (let size = 2; size <= balances.length; size++) {
      let subset: BalanceItem[] | null;
      while ((subset = findZeroSumSubset(balances, size, epsilon))) {
        // Resolve this independent subset
        let subsetDebtors = subset.filter((b) => b.amount < 0).sort((a, b) => a.amount - b.amount);
        let subsetCreditors = subset.filter((b) => b.amount > 0).sort((a, b) => b.amount - a.amount);

        while (subsetDebtors.length > 0 && subsetCreditors.length > 0) {
          const debtor = subsetDebtors[0];
          const creditor = subsetCreditors[0];
          const amount = Math.min(Math.abs(debtor.amount), creditor.amount);

          settlements.push({
            fromId: debtor.id,
            fromName: debtor.name,
            toId: creditor.id,
            toName: creditor.name,
            amount: roundCurrency(amount, currencyCode),
          });

          debtor.amount += amount;
          creditor.amount -= amount;

          if (Math.abs(debtor.amount) < epsilon) subsetDebtors.shift();
          if (Math.abs(creditor.amount) < epsilon) subsetCreditors.shift();
        }
        
        // Remove processed members from the main balances pool
        const subsetIds = subset.map(b => b.id);
        balances = balances.filter(b => !subsetIds.includes(b.id));
      }
    }
  }

  // Final Greedy Pass for any remaining balances
  let debtors = balances.filter((b) => b.amount < 0).sort((a, b) => a.amount - b.amount);
  let creditors = balances.filter((b) => b.amount > 0).sort((a, b) => b.amount - a.amount);

  while (debtors.length > 0 && creditors.length > 0) {
    const debtor = debtors[0];
    const creditor = creditors[0];
    const amount = Math.min(Math.abs(debtor.amount), creditor.amount);

    settlements.push({
      fromId: debtor.id,
      fromName: debtor.name,
      toId: creditor.id,
      toName: creditor.name,
      amount: roundCurrency(amount, currencyCode),
    });

    debtor.amount += amount;
    creditor.amount -= amount;

    if (Math.abs(debtor.amount) < epsilon) debtors.shift();
    if (Math.abs(creditor.amount) < epsilon) creditors.shift();
  }

  return settlements;
}

export function getTotalExpenses(expenses: Expense[]): number {
  return expenses.reduce((sum, e) => sum + e.amount, 0);
}

export function getTotalPayments(payments: Payment[]): number {
  return payments.reduce((sum, p) => sum + p.amount, 0);
}

const AVATAR_COLORS = [
  '#FF5733', '#33FF57', '#3357FF', '#F333FF', '#33FFF3',
  '#FF3385', '#FF8533', '#8533FF', '#33FF85', '#5733FF',
];

export function getAvatarColor(name: string): string {
  if (!name) return '#95A5A6';
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % AVATAR_COLORS.length;
  return AVATAR_COLORS[index];
}

export const getMemberColor = getAvatarColor;

export function getInitials(name: string): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}
