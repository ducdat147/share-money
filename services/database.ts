import * as SQLite from 'expo-sqlite';
import { Trip, Member, Expense, Payment } from '@/utils/types';

const DB_NAME = 'share_money.db';

let db: SQLite.SQLiteDatabase | null = null;

export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (!db) {
    db = await SQLite.openDatabaseAsync(DB_NAME);
    await initTables(db);
  }
  return db;
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
  } catch (error) {
    // Column might already exist, ignore error
  }

  try {
    await database.execAsync("ALTER TABLE trips ADD COLUMN currency TEXT DEFAULT 'VND';");
  } catch (error) {
    // Column might already exist, ignore error
  }
}

// ========== TRIPS ==========

export async function getAllTrips(): Promise<Trip[]> {
  const database = await getDatabase();
  const rows = await database.getAllAsync<{
    id: string;
    name: string;
    treasurer_id: string | null;
    is_completed: number;
    created_at: number;
    currency: string | null;
  }>('SELECT * FROM trips ORDER BY created_at DESC');

  const trips: Trip[] = [];
  for (const row of rows) {
    const members = await getMembersByTrip(row.id);
    const expenses = await getExpensesByTrip(row.id);
    const payments = await getPaymentsByTrip(row.id);
    trips.push({
      id: row.id,
      name: row.name,
      treasurerId: row.treasurer_id ?? undefined,
      isCompleted: row.is_completed === 1,
      createdAt: row.created_at,
      currency: (row.currency as any) || 'VND',
      members,
      expenses,
      payments,
    });
  }
  return trips;
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

export async function updateTripCurrency(
  tripId: string,
  currency: string,
): Promise<void> {
  const database = await getDatabase();
  await database.runAsync('UPDATE trips SET currency = ? WHERE id = ?', [
    currency,
    tripId,
  ]);
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
