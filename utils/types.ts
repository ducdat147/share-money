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
  totalShare: number;
  totalPaid: number;
  fundPayments: number; // Money paid to treasurer
  advancedPayments: number; // Money paid directly for expenses
  fundHeld: number; // Money held as treasurer
  balance: number; // Net balance (Positive = creditor, Negative = debtor)
  debt: number; // positive = owes treasurer, negative = treasurer owes them
}

export interface Settlement {
  fromId: string;
  fromName: string;
  toId: string;
  toName: string;
  amount: number;
}
