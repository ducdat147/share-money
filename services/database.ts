import * as SQLite from 'expo-sqlite';
import { Trip, TripSummary, Member, Expense, Payment } from '@/utils/types';

const DB_NAME = 'share_money.db';

// The promise itself is cached, not the instance: concurrent callers during
// startup would otherwise each open a connection and run initTables().
let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = (async () => {
      const database = await SQLite.openDatabaseAsync(DB_NAME);
      await initTables(database);
      return database;
    })().catch((error) => {
      dbPromise = null; // allow a later call to retry
      throw error;
    });
  }
  return dbPromise;
}

async function initTables(database: SQLite.SQLiteDatabase): Promise<void> {
  await database.execAsync(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS trips (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      treasurer_id TEXT,
      is_completed INTEGER DEFAULT 0,
      created_at INTEGER NOT NULL,
      currency TEXT DEFAULT 'VND'
    );

    CREATE TABLE IF NOT EXISTS members (
      id TEXT PRIMARY KEY,
      trip_id TEXT NOT NULL,
      name TEXT NOT NULL,
      FOREIGN KEY (trip_id) REFERENCES trips(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS expenses (
      id TEXT PRIMARY KEY,
      trip_id TEXT NOT NULL,
      description TEXT NOT NULL,
      amount REAL NOT NULL,
      created_at INTEGER NOT NULL,
      FOREIGN KEY (trip_id) REFERENCES trips(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS expense_participants (
      expense_id TEXT NOT NULL,
      member_id TEXT NOT NULL,
      PRIMARY KEY (expense_id, member_id),
      FOREIGN KEY (expense_id) REFERENCES expenses(id) ON DELETE CASCADE,
      FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS payments (
      id TEXT PRIMARY KEY,
      trip_id TEXT NOT NULL,
      member_id TEXT NOT NULL,
      amount REAL NOT NULL,
      note TEXT,
      created_at INTEGER NOT NULL,
      FOREIGN KEY (trip_id) REFERENCES trips(id) ON DELETE CASCADE,
      FOREIGN KEY (trip_id) REFERENCES trips(id) ON DELETE CASCADE,
      FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE
    );
  `);

  try {
    await database.execAsync('ALTER TABLE expenses ADD COLUMN paid_by TEXT;');
  } catch {
    // Column might already exist, ignore error
  }

  try {
    await database.execAsync("ALTER TABLE trips ADD COLUMN currency TEXT DEFAULT 'VND';");
  } catch {
    // Column might already exist, ignore error
  }
}

// ========== TRIPS ==========

// Cursor for keyset pagination. `created_at` alone is not unique enough to be a
// stable cursor, so `id` breaks ties — offsets would skip rows after a delete.
export interface TripSummaryCursor {
  createdAt: number;
  id: string;
}

export async function getTripSummaries(options: {
  limit?: number;
  cursor?: TripSummaryCursor;
} = {}): Promise<TripSummary[]> {
  const database = await getDatabase();
  const { limit, cursor } = options;

  const params: (string | number)[] = [];
  let where = '';
  if (cursor) {
    where = 'WHERE (t.created_at < ? OR (t.created_at = ? AND t.id < ?))';
    params.push(cursor.createdAt, cursor.createdAt, cursor.id);
  }

  let limitClause = '';
  if (limit !== undefined) {
    limitClause = 'LIMIT ?';
    params.push(limit);
  }

  // Aggregates stay in SQL: the home list only needs counts and a total, so
  // nothing from members/expenses/payments is carried into memory.
  const rows = await database.getAllAsync<{
    id: string;
    name: string;
    is_completed: number;
    created_at: number;
    currency: string | null;
    member_count: number;
    expense_count: number;
    total_expense: number;
    treasurer_name: string | null;
  }>(
    `SELECT
       t.id,
       t.name,
       t.is_completed,
       t.created_at,
       t.currency,
       (SELECT COUNT(*) FROM members m WHERE m.trip_id = t.id) AS member_count,
       (SELECT COUNT(*) FROM expenses e WHERE e.trip_id = t.id) AS expense_count,
       (SELECT COALESCE(SUM(e.amount), 0) FROM expenses e WHERE e.trip_id = t.id) AS total_expense,
       (SELECT m.name FROM members m WHERE m.id = t.treasurer_id) AS treasurer_name
     FROM trips t
     ${where}
     ORDER BY t.created_at DESC, t.id DESC
     ${limitClause}`,
    params,
  );

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    isCompleted: row.is_completed === 1,
    createdAt: row.created_at,
    currency: (row.currency as any) || 'VND',
    memberCount: row.member_count,
    expenseCount: row.expense_count,
    totalExpense: row.total_expense,
    treasurerName: row.treasurer_name ?? undefined,
  }));
}

export async function getTripCounts(): Promise<{ total: number; active: number }> {
  const database = await getDatabase();
  const row = await database.getFirstAsync<{ total: number; active: number }>(
    `SELECT
       COUNT(*) AS total,
       COALESCE(SUM(CASE WHEN is_completed = 0 THEN 1 ELSE 0 END), 0) AS active
     FROM trips`,
  );
  return { total: row?.total ?? 0, active: row?.active ?? 0 };
}

export async function getTripById(tripId: string): Promise<Trip | null> {
  const database = await getDatabase();
  const row = await database.getFirstAsync<{
    id: string;
    name: string;
    treasurer_id: string | null;
    is_completed: number;
    created_at: number;
    currency: string | null;
  }>('SELECT * FROM trips WHERE id = ?', [tripId]);

  if (!row) return null;

  const members = await getMembersByTrip(row.id);
  const expenses = await getExpensesByTrip(row.id);
  const payments = await getPaymentsByTrip(row.id);

  return {
    id: row.id,
    name: row.name,
    treasurerId: row.treasurer_id ?? undefined,
    isCompleted: row.is_completed === 1,
    createdAt: row.created_at,
    currency: (row.currency as any) || 'VND',
    members,
    expenses,
    payments,
  };
}

export async function insertTrip(
  id: string,
  name: string,
  treasurerId?: string,
  currency: string = 'VND',
): Promise<void> {
  const database = await getDatabase();
  await database.runAsync(
    'INSERT INTO trips (id, name, treasurer_id, is_completed, created_at, currency) VALUES (?, ?, ?, 0, ?, ?)',
    [id, name, treasurerId ?? null, Date.now(), currency],
  );
}

export async function updateTripCompleted(
  tripId: string,
  isCompleted: boolean,
): Promise<void> {
  const database = await getDatabase();
  await database.runAsync('UPDATE trips SET is_completed = ? WHERE id = ?', [
    isCompleted ? 1 : 0,
    tripId,
  ]);
}

export async function updateTripTreasurer(
  tripId: string,
  treasurerId?: string,
): Promise<void> {
  const database = await getDatabase();
  await database.runAsync('UPDATE trips SET treasurer_id = ? WHERE id = ?', [
    treasurerId ?? null,
    tripId,
  ]);
}

export async function deleteTrip(tripId: string): Promise<void> {
  const database = await getDatabase();
  await database.runAsync('DELETE FROM trips WHERE id = ?', [tripId]);
}

// ========== MEMBERS ==========

async function getMembersByTrip(tripId: string): Promise<Member[]> {
  const database = await getDatabase();
  const rows = await database.getAllAsync<{
    id: string;
    trip_id: string;
    name: string;
  }>('SELECT * FROM members WHERE trip_id = ?', [tripId]);

  return rows.map((r) => ({ id: r.id, tripId: r.trip_id, name: r.name }));
}

export async function insertMember(
  id: string,
  tripId: string,
  name: string,
): Promise<void> {
  const database = await getDatabase();
  await database.runAsync(
    'INSERT INTO members (id, trip_id, name) VALUES (?, ?, ?)',
    [id, tripId, name],
  );
}

export async function updateMemberName(
  memberId: string,
  name: string,
): Promise<void> {
  const database = await getDatabase();
  await database.runAsync('UPDATE members SET name = ? WHERE id = ?', [
    name,
    memberId,
  ]);
}

export async function deleteMember(memberId: string): Promise<void> {
  const database = await getDatabase();
  await database.runAsync('DELETE FROM members WHERE id = ?', [memberId]);
}

// ========== EXPENSES ==========

async function getExpensesByTrip(tripId: string): Promise<Expense[]> {
  const database = await getDatabase();
  const rows = await database.getAllAsync<{
    id: string;
    trip_id: string;
    description: string;
    amount: number;
    paid_by: string | null;
    created_at: number;
  }>('SELECT * FROM expenses WHERE trip_id = ? ORDER BY created_at DESC', [tripId]);

  const expenses: Expense[] = [];
  for (const row of rows) {
    const participants = await getExpenseParticipants(row.id);
    expenses.push({
      id: row.id,
      tripId: row.trip_id,
      description: row.description,
      amount: row.amount,
      paidBy: row.paid_by ?? undefined,
      participants,
      createdAt: row.created_at,
    });
  }
  return expenses;
}

async function getExpenseParticipants(expenseId: string): Promise<string[]> {
  const database = await getDatabase();
  const rows = await database.getAllAsync<{ member_id: string }>(
    'SELECT member_id FROM expense_participants WHERE expense_id = ?',
    [expenseId],
  );
  return rows.map((r) => r.member_id);
}

export async function insertExpense(
  id: string,
  tripId: string,
  description: string,
  amount: number,
  participants: string[],
  paidBy?: string,
): Promise<void> {
  const database = await getDatabase();
  await database.runAsync(
    'INSERT INTO expenses (id, trip_id, description, amount, paid_by, created_at) VALUES (?, ?, ?, ?, ?, ?)',
    [id, tripId, description, amount, paidBy ?? null, Date.now()],
  );
  for (const memberId of participants) {
    await database.runAsync(
      'INSERT INTO expense_participants (expense_id, member_id) VALUES (?, ?)',
      [id, memberId],
    );
  }
}

export async function deleteExpense(expenseId: string): Promise<void> {
  const database = await getDatabase();
  await database.runAsync('DELETE FROM expense_participants WHERE expense_id = ?', [expenseId]);
  await database.runAsync('DELETE FROM expenses WHERE id = ?', [expenseId]);
}

export async function updateExpense(
  id: string,
  description: string,
  amount: number,
  participants: string[],
  paidBy?: string,
): Promise<void> {
  const database = await getDatabase();
  await database.runAsync(
    'UPDATE expenses SET description = ?, amount = ?, paid_by = ? WHERE id = ?',
    [description, amount, paidBy ?? null, id],
  );
  await database.runAsync('DELETE FROM expense_participants WHERE expense_id = ?', [id]);
  for (const memberId of participants) {
    await database.runAsync(
      'INSERT INTO expense_participants (expense_id, member_id) VALUES (?, ?)',
      [id, memberId],
    );
  }
}

// ========== PAYMENTS ==========

async function getPaymentsByTrip(tripId: string): Promise<Payment[]> {
  const database = await getDatabase();
  const rows = await database.getAllAsync<{
    id: string;
    trip_id: string;
    member_id: string;
    amount: number;
    note: string | null;
    created_at: number;
  }>('SELECT * FROM payments WHERE trip_id = ? ORDER BY created_at DESC', [tripId]);

  return rows.map((r) => ({
    id: r.id,
    tripId: r.trip_id,
    memberId: r.member_id,
    amount: r.amount,
    note: r.note ?? undefined,
    createdAt: r.created_at,
  }));
}

export async function insertPayment(
  id: string,
  tripId: string,
  memberId: string,
  amount: number,
  note?: string,
): Promise<void> {
  const database = await getDatabase();
  await database.runAsync(
    'INSERT INTO payments (id, trip_id, member_id, amount, note, created_at) VALUES (?, ?, ?, ?, ?, ?)',
    [id, tripId, memberId, amount, note ?? null, Date.now()],
  );
}

export async function updatePayment(
  id: string,
  memberId: string,
  amount: number,
  note?: string,
): Promise<void> {
  const database = await getDatabase();
  await database.runAsync(
    'UPDATE payments SET member_id = ?, amount = ?, note = ? WHERE id = ?',
    [memberId, amount, note ?? null, id],
  );
}

export async function deletePayment(paymentId: string): Promise<void> {
  const database = await getDatabase();
  await database.runAsync('DELETE FROM payments WHERE id = ?', [paymentId]);
}
