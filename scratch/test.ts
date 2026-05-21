import { calculateSettlements } from '../utils/calculator';

const summaries = [
  { memberId: 'A', name: 'An', balance: 60 },
  { memberId: 'B', name: 'Binh', balance: 40 },
  { memberId: 'C', name: 'Cuong', balance: 70 },
  { memberId: 'X', name: 'Xuan', balance: -100 },
  { memberId: 'Y', name: 'Yen', balance: -50 },
  { memberId: 'Z', name: 'Dung', balance: -20 },
] as any[];

const res = calculateSettlements(summaries);
console.log(res);
