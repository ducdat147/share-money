// Pure helpers for the home list's keyset pagination. Kept free of expo-sqlite
// so they can be unit tested.

// The list is ordered `is_completed ASC, created_at DESC, id DESC`: active trips
// first. `created_at` alone is not unique, so `id` breaks ties — offsets would
// skip rows after a delete.
export interface TripSummaryCursor {
  isCompleted: boolean;
  createdAt: number;
  id: string;
}

// "Strictly after the cursor" in the order above.
export function buildSummaryCursorWhere(cursor: TripSummaryCursor): {
  sql: string;
  params: (string | number)[];
} {
  const done = cursor.isCompleted ? 1 : 0;
  return {
    sql: '(t.is_completed > ? OR (t.is_completed = ? AND (t.created_at < ? OR (t.created_at = ? AND t.id < ?))))',
    params: [done, done, cursor.createdAt, cursor.createdAt, cursor.id],
  };
}

// Same order as the SQL ORDER BY, for simulating pages in tests.
export function compareSummaryOrder(
  a: TripSummaryCursor,
  b: TripSummaryCursor,
): number {
  if (a.isCompleted !== b.isCompleted) return a.isCompleted ? 1 : -1;
  if (a.createdAt !== b.createdAt) return b.createdAt - a.createdAt;
  return a.id < b.id ? 1 : a.id > b.id ? -1 : 0;
}
