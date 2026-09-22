export interface Trip {
  id: string;
  name: string;
  treasurerId?: string;
  currency?: 'VND' | 'USD';
  members: Member[];
  expenses: Expense[];
  payments: Payment[];
  isCompleted: boolean;
  createdAt: number;
}

// Row shape backing the home list: aggregates only, no members/expenses/payments.
export interface TripSummary {
  id: string;
  name: string;
  currency?: 'VND' | 'USD';
  isCompleted: boolean;
  createdAt: number;
  memberCount: number;
  expenseCount: number;
  totalExpense: number;
  treasurerName?: string;
}

export interface Member {
  id: string;
  tripId: string;
  name: string;
}

export interface Expense {
  id: string;
  tripId: string;
  description: string;
  amount: number;
  participants: string[]; // member ids
  paidBy?: string; // member id of who paid
  createdAt: number;
}

export interface Payment {
  id: string;
  tripId: string;
  memberId: string;
  amount: number;
  note?: string;
  createdAt: number;
}

export interface MemberSummary {
  memberId: string;
  name: string;
  items: { description: string; share: number }[];
  advancedItems: { description: string; amount: number }[];
  totalShare: number;
  totalPaid: number;
  fundPayments: number; // Money paid to treasurer (0 for the treasurer)
  advancedPayments: number; // Money paid directly for expenses (treasurer: own money spent after the fund ran out)
  fundHeld: number; // Other members' cash the treasurer still holds
  balance: number; // Net balance (Positive = creditor, Negative = debtor)
  debt: number; // positive = still owes part of their share, negative = paid more than their share
}

export interface Settlement {
  fromId: string;
  fromName: string;
  toId: string;
  toName: string;
  amount: number;
}

export type SettlementStrategy = 'optimal' | 'centralized';
