import { create } from "zustand";
import { api, errorMessage } from "@/lib/client-api";
import { useToastStore } from "@/store/toast-store";
import type { BookingDTO, BookingStatus, RealtimeEvent } from "@/types";

export type Connection = "connecting" | "live" | "polling" | "offline";
export type BoardView = "board" | "list";
export type StatusFilter = "ALL" | BookingStatus;

interface DashboardState {
  bookings: Record<string, BookingDTO>;
  status: "idle" | "loading" | "ready" | "error";
  error: string | null;
  /** booking id -> timestamp the highlight was triggered; cleared after the glow animation */
  highlighted: Record<string, number>;
  pending: Record<string, boolean>;
  connection: Connection;
  view: BoardView;
  filter: StatusFilter;
  lastSyncedAt: number | null;
}

interface DashboardActions {
  load(): Promise<void>;
  applyEvent(event: RealtimeEvent): void;
  updateStatus(id: string, status: "CONFIRMED" | "CANCELLED"): Promise<void>;
  clearHighlight(id: string): void;
  setConnection(c: Connection): void;
  setView(v: BoardView): void;
  setFilter(f: StatusFilter): void;
}

export type DashboardStore = DashboardState & DashboardActions;

const HIGHLIGHT_MS = 4000;

export const useDashboardStore = create<DashboardStore>()((set, get) => ({
  bookings: {},
  status: "idle",
  error: null,
  highlighted: {},
  pending: {},
  connection: "connecting",
  view: "board",
  filter: "ALL",
  lastSyncedAt: null,

  async load() {
    const first = get().status === "idle";
    if (first) set({ status: "loading", error: null });
    try {
      const { bookings } = await api<{ bookings: BookingDTO[] }>("/api/bookings");
      set((s) => {
        const next: Record<string, BookingDTO> = {};
        for (const b of bookings) {
          const existing = s.bookings[b.id];
          // Never let a stale poll overwrite a fresher realtime update.
          next[b.id] = existing && existing.updatedAt > b.updatedAt ? existing : b;
        }
        return { bookings: next, status: "ready", error: null, lastSyncedAt: Date.now() };
      });
    } catch (err) {
      set({ status: first ? "error" : get().status, error: errorMessage(err, "Could not load your schedule") });
    }
  },

  applyEvent(event) {
    const incoming = event.booking;
    set((s) => {
      const existing = s.bookings[incoming.id];
      if (existing && existing.updatedAt > incoming.updatedAt) return s;

      const becameVisible =
        !existing ||
        (existing.status !== incoming.status && (incoming.status === "PAID" || incoming.status === "PENDING"));

      const highlighted = becameVisible ? { ...s.highlighted, [incoming.id]: Date.now() } : s.highlighted;
      return { bookings: { ...s.bookings, [incoming.id]: incoming }, highlighted };
    });

    if (get().highlighted[incoming.id]) {
      setTimeout(() => get().clearHighlight(incoming.id), HIGHLIGHT_MS);
    }
  },

  /** Optimistic: flip the card instantly, roll back if the server disagrees. */
  async updateStatus(id, status) {
    const before = get().bookings[id];
    if (!before || get().pending[id]) return;

    set((s) => ({
      bookings: { ...s.bookings, [id]: { ...before, status, updatedAt: new Date().toISOString() } },
      pending: { ...s.pending, [id]: true },
    }));

    try {
      const { booking } = await api<{ booking: BookingDTO }>(`/api/bookings/${id}`, { method: "PATCH", body: { status } });
      set((s) => ({ bookings: { ...s.bookings, [id]: booking } }));
      useToastStore.getState().push({
        tone: "success",
        title: status === "CANCELLED" ? "Booking cancelled" : "Booking confirmed",
        description:
          status === "CANCELLED" && before.status === "PAID"
            ? `${booking.customer.name} will be refunded automatically.`
            : `${booking.customer.name} has been notified.`,
      });
    } catch (err) {
      set((s) => ({ bookings: { ...s.bookings, [id]: before } }));
      useToastStore.getState().push({ tone: "error", title: "Could not update booking", description: errorMessage(err) });
    } finally {
      set((s) => {
        const pending = { ...s.pending };
        delete pending[id];
        return { pending };
      });
    }
  },

  clearHighlight(id) {
    set((s) => {
      if (!s.highlighted[id]) return s;
      const highlighted = { ...s.highlighted };
      delete highlighted[id];
      return { highlighted };
    });
  },

  setConnection(connection) {
    if (get().connection !== connection) set({ connection });
  },
  setView(view) {
    set({ view });
  },
  setFilter(filter) {
    set({ filter });
  },
}));

/** Pure helper - call inside useMemo; selectors must return stable references. */
export const sortBookings = (bookings: Record<string, BookingDTO>): BookingDTO[] =>
  Object.values(bookings).sort((a, b) => a.startTime.localeCompare(b.startTime));
