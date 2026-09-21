import { create } from 'zustand';
import * as Crypto from 'expo-crypto';
import { Trip, TripSummary } from '@/utils/types';
import * as db from '@/services/database';

export const SUMMARY_PAGE_SIZE = 20;

interface TripStore {
  trips: Trip[];
  tripSummaries: TripSummary[];
  tripCounts: { total: number; active: number };
  hasMoreSummaries: boolean;
  isLoadingSummaries: boolean;
  isLoadingMoreSummaries: boolean;

  // `'all'` skips the LIMIT — used while searching, which filters in memory.
  loadTripSummaries: (limit: number | 'all') => Promise<void>;
  loadMoreSummaries: () => Promise<void>;
  loadTrip: (tripId: string) => Promise<Trip | null>;

  createTrip: (name: string, memberNames: string[], treasurerIndex?: number, currency?: string) => Promise<string>;
  updateTripCurrency: (tripId: string, currency: string) => Promise<void>;
  deleteTrip: (tripId: string) => Promise<void>;
  completeTrip: (tripId: string) => Promise<void>;
  reopenTrip: (tripId: string) => Promise<void>;
  updateTreasurer: (tripId: string, treasurerId?: string) => Promise<void>;

  addMember: (tripId: string, name: string) => Promise<void>;
  updateMemberName: (tripId: string, memberId: string, name: string) => Promise<void>;
  removeMember: (tripId: string, memberId: string) => Promise<void>;

  addExpense: (
    tripId: string,
    description: string,
    amount: number,
    participants: string[],
    paidBy?: string,
  ) => Promise<void>;
  updateExpense: (
    tripId: string,
    expenseId: string,
    description: string,
    amount: number,
    participants: string[],
    paidBy?: string,
  ) => Promise<void>;
  removeExpense: (tripId: string, expenseId: string) => Promise<void>;

  addPayment: (
    tripId: string,
    memberId: string,
    amount: number,
    note?: string,
  ) => Promise<void>;
  updatePayment: (
    tripId: string,
    paymentId: string,
    memberId: string,
    amount: number,
    note?: string,
  ) => Promise<void>;
  removePayment: (tripId: string, paymentId: string) => Promise<void>;
}

export const useTripStore = create<TripStore>((set, get) => ({
  trips: [],
  tripSummaries: [],
  tripCounts: { total: 0, active: 0 },
  hasMoreSummaries: false,
  isLoadingSummaries: false,
  isLoadingMoreSummaries: false,

  loadTripSummaries: async (limit) => {
    set({ isLoadingSummaries: true });
    try {
      const summaries = await db.getTripSummaries({
        limit: limit === 'all' ? undefined : limit,
      });
      const counts = await db.getTripCounts();
      set({
        tripSummaries: summaries,
        tripCounts: counts,
        hasMoreSummaries: summaries.length < counts.total,
      });
    } finally {
      set({ isLoadingSummaries: false });
    }
  },

  loadMoreSummaries: async () => {
    // FlatList fires onEndReached repeatedly, so the guard lives here.
    const { hasMoreSummaries, isLoadingSummaries, isLoadingMoreSummaries, tripSummaries } = get();
    const last = tripSummaries[tripSummaries.length - 1];
    if (!hasMoreSummaries || isLoadingSummaries || isLoadingMoreSummaries || !last) return;

    set({ isLoadingMoreSummaries: true });
    try {
      const next = await db.getTripSummaries({
        limit: SUMMARY_PAGE_SIZE,
        cursor: { createdAt: last.createdAt, id: last.id },
      });
      set((state) => {
        // A focus refresh may have replaced the list while this page was in
        // flight; appending onto it would duplicate rows.
        if (state.tripSummaries[state.tripSummaries.length - 1]?.id !== last.id) {
          return state;
        }
        const merged = [...state.tripSummaries, ...next];
        return {
          tripSummaries: merged,
          hasMoreSummaries: merged.length < state.tripCounts.total,
        };
      });
    } finally {
      set({ isLoadingMoreSummaries: false });
    }
  },

  loadTrip: async (tripId: string) => {
    const trip = await db.getTripById(tripId);
    if (trip) {
      // Upsert: the home list only holds summaries, so a trip opened from it is
      // usually absent from `trips` and a map() alone would drop it.
      set((state) => ({
        trips: state.trips.some((t) => t.id === tripId)
          ? state.trips.map((t) => (t.id === tripId ? trip : t))
          : [...state.trips, trip],
      }));
    }
    return trip;
  },

  createTrip: async (name, memberNames, treasurerIndex, currency = 'VND') => {
    const tripId = Crypto.randomUUID();
    const memberIds: string[] = [];

    for (const memberName of memberNames) {
      memberIds.push(Crypto.randomUUID());
    }

    const treasurerId =
      treasurerIndex !== undefined ? memberIds[treasurerIndex] : undefined;

    await db.insertTrip(tripId, name, treasurerId, currency);

    for (let i = 0; i < memberNames.length; i++) {
      await db.insertMember(memberIds[i], tripId, memberNames[i]);
    }

    // The screen navigates straight into the trip, which hydrates it via
    // loadTrip; the home list refreshes its summaries on focus.
    return tripId;
  },

  deleteTrip: async (tripId) => {
    await db.deleteTrip(tripId);
    set((state) => {
      const removed = state.tripSummaries.find((s) => s.id === tripId);
      return {
        trips: state.trips.filter((t) => t.id !== tripId),
        tripSummaries: state.tripSummaries.filter((s) => s.id !== tripId),
        tripCounts: removed
          ? {
              total: state.tripCounts.total - 1,
              active: removed.isCompleted
                ? state.tripCounts.active
                : state.tripCounts.active - 1,
            }
          : state.tripCounts,
      };
    });
  },

  completeTrip: async (tripId) => {
    await db.updateTripCompleted(tripId, true);
    await get().loadTrip(tripId);
  },

  reopenTrip: async (tripId) => {
    await db.updateTripCompleted(tripId, false);
    await get().loadTrip(tripId);
  },

  updateTreasurer: async (tripId, treasurerId) => {
    await db.updateTripTreasurer(tripId, treasurerId);
    await get().loadTrip(tripId);
  },

  updateTripCurrency: async (tripId, currency) => {
    await db.updateTripCurrency(tripId, currency);
    await get().loadTrip(tripId);
  },

  addMember: async (tripId, name) => {
    const memberId = Crypto.randomUUID();
    await db.insertMember(memberId, tripId, name);
    await get().loadTrip(tripId);
  },

  updateMemberName: async (tripId, memberId, name) => {
    await db.updateMemberName(memberId, name);
    await get().loadTrip(tripId);
  },

  removeMember: async (tripId, memberId) => {
    await db.deleteMember(memberId);
    await get().loadTrip(tripId);
  },

  addExpense: async (tripId, description, amount, participants, paidBy) => {
    const expenseId = Crypto.randomUUID();
    await db.insertExpense(expenseId, tripId, description, amount, participants, paidBy);
    await get().loadTrip(tripId);
  },

  updateExpense: async (tripId, expenseId, description, amount, participants, paidBy) => {
    await db.updateExpense(expenseId, description, amount, participants, paidBy);
    await get().loadTrip(tripId);
  },

  removeExpense: async (tripId, expenseId) => {
    await db.deleteExpense(expenseId);
    await get().loadTrip(tripId);
  },

  addPayment: async (tripId, memberId, amount, note) => {
    const paymentId = Crypto.randomUUID();
    await db.insertPayment(paymentId, tripId, memberId, amount, note);
    await get().loadTrip(tripId);
  },

  updatePayment: async (tripId, paymentId, memberId, amount, note) => {
    await db.updatePayment(paymentId, memberId, amount, note);
    await get().loadTrip(tripId);
  },

  removePayment: async (tripId, paymentId) => {
    await db.deletePayment(paymentId);
    await get().loadTrip(tripId);
  },
}));
