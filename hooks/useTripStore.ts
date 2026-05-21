import { create } from 'zustand';
import * as Crypto from 'expo-crypto';
import { Trip } from '@/utils/types';
import * as db from '@/services/database';

interface TripStore {
  trips: Trip[];
  isLoading: boolean;

  loadTrips: () => Promise<void>;
  loadTrip: (tripId: string) => Promise<Trip | null>;

  createTrip: (name: string, memberNames: string[], treasurerIndex?: number, currency?: string) => Promise<string>;
  updateTripCurrency: (tripId: string, currency: string) => Promise<void>;
  deleteTrip: (tripId: string) => Promise<void>;
  completeTrip: (tripId: string) => Promise<void>;
  reopenTrip: (tripId: string) => Promise<void>;
  updateTreasurer: (tripId: string, treasurerId?: string) => Promise<void>;

  addMember: (tripId: string, name: string) => Promise<void>;
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
  isLoading: false,

  loadTrips: async () => {
    set({ isLoading: true });
    try {
      const trips = await db.getAllTrips();
      set({ trips });
    } finally {
      set({ isLoading: false });
    }
  },

  loadTrip: async (tripId: string) => {
    const trip = await db.getTripById(tripId);
    if (trip) {
      set((state) => ({
        trips: state.trips.map((t) => (t.id === tripId ? trip : t)),
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

    await get().loadTrips();
    return tripId;
  },

  deleteTrip: async (tripId) => {
    await db.deleteTrip(tripId);
    set((state) => ({
      trips: state.trips.filter((t) => t.id !== tripId),
    }));
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
