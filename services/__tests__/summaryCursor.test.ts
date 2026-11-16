import { describe, expect, test } from '@jest/globals';
import {
  buildSummaryCursorWhere,
  compareSummaryOrder,
  TripSummaryCursor,
} from '../summaryCursor';

type Row = { id: string; isCompleted: boolean; createdAt: number };

// JS mirror of the SQL produced by buildSummaryCursorWhere.
function isAfterCursor(row: Row, c: TripSummaryCursor): boolean {
  const done = row.isCompleted ? 1 : 0;
  const cDone = c.isCompleted ? 1 : 0;
  return (
    done > cDone ||
    (done === cDone &&
      (row.createdAt < c.createdAt || (row.createdAt === c.createdAt && row.id < c.id)))
  );
}

const rows: Row[] = [
  { id: 'a', isCompleted: false, createdAt: 10 },
  { id: 'b', isCompleted: true, createdAt: 50 },
  { id: 'c', isCompleted: false, createdAt: 30 },
  { id: 'd', isCompleted: false, createdAt: 30 }, // ties with c
  { id: 'e', isCompleted: true, createdAt: 20 },
  { id: 'f', isCompleted: false, createdAt: 40 },
  { id: 'g', isCompleted: true, createdAt: 20 }, // ties with e
];

describe('buildSummaryCursorWhere', () => {
  test('builds the exact SQL and params', () => {
    expect(buildSummaryCursorWhere({ isCompleted: false, createdAt: 5, id: 'k' })).toEqual({
      sql: '(t.is_completed > ? OR (t.is_completed = ? AND (t.created_at < ? OR (t.created_at = ? AND t.id < ?))))',
      params: [0, 0, 5, 5, 'k'],
    });
  });

  test('maps a completed cursor to 1', () => {
    expect(buildSummaryCursorWhere({ isCompleted: true, createdAt: 5, id: 'k' }).params).toEqual([
      1, 1, 5, 5, 'k',
    ]);
  });
});

describe('compareSummaryOrder', () => {
  test('puts active first, then newest, then higher id', () => {
    expect([...rows].sort(compareSummaryOrder).map((r) => r.id)).toEqual([
      'f', 'd', 'c', 'a', 'b', 'g', 'e',
    ]);
  });
});

describe('keyset paging', () => {
  test.each([1, 2, 3, 7])('pages of %i rebuild the full order without gaps or repeats', (size: number) => {
    const sorted = [...rows].sort(compareSummaryOrder);
    const paged: Row[] = [];
    let cursor: TripSummaryCursor | undefined;
    for (let guard = 0; guard < 20; guard++) {
      const page = sorted
        .filter((r) => !cursor || isAfterCursor(r, cursor))
        .slice(0, size);
      if (page.length === 0) break;
      paged.push(...page);
      const last = page[page.length - 1];
      cursor = { isCompleted: last.isCompleted, createdAt: last.createdAt, id: last.id };
    }
    expect(paged.map((r) => r.id)).toEqual(sorted.map((r) => r.id));
  });
});
