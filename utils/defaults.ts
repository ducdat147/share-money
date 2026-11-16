import { Trip } from './types';

/**
 * Default payer for a new expense: the payer of the latest expense if still a
 * member, else the treasurer, else the first member.
 */
export function getDefaultPayerId(
  trip: Pick<Trip, 'members' | 'expenses' | 'treasurerId'>,
): string | undefined {
  const isMember = (id: string | undefined): id is string =>
    id !== undefined && trip.members.some((member) => member.id === id);

  const latest = trip.expenses.reduce<Trip['expenses'][number] | undefined>(
    (acc, expense) => (!acc || expense.createdAt > acc.createdAt ? expense : acc),
    undefined,
  );
  if (isMember(latest?.paidBy)) return latest?.paidBy;
  if (isMember(trip.treasurerId)) return trip.treasurerId;
  return trip.members[0]?.id;
}

/** Trim each name; blank names become a placeholder numbered from 1. */
export function fillMemberNames(names: string[], placeholder: (n: number) => string): string[] {
  return names.map((name, index) => name.trim() || placeholder(index + 1));
}

/** First name that repeats an earlier one (trimmed, case-insensitive); undefined when all are distinct. */
export function findDuplicateName(names: string[]): string | undefined {
  const seen = new Set<string>();
  for (const name of names) {
    const key = name.trim().toLowerCase();
    if (seen.has(key)) return name.trim();
    seen.add(key);
  }
  return undefined;
}

/** Expense description from a local-time `HH:mm` stamp. */
export function autoExpenseDescription(date: Date, label: (time: string) => string): string {
  const hh = String(date.getHours()).padStart(2, '0');
  const mm = String(date.getMinutes()).padStart(2, '0');
  return label(`${hh}:${mm}`);
}
