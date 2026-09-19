import { create } from "zustand";
import { api, ClientApiError, errorMessage } from "@/lib/client-api";
import type { BookingDTO, ProviderDTO, ServiceDTO, SlotDTO } from "@/types";

export const STEPS = ["service", "datetime", "customer", "payment", "success"] as const;
export type Step = (typeof STEPS)[number];

export interface CustomerForm {
  name: string;
  email: string;
  phone: string;
  address: string;
  serviceDetails: string;
  notes: string;
}

export interface CheckoutSession {
  clientSecret: string;
  paymentIntentId: string;
  /** Amount charged now (deposit or full price). */
  amountCents: number;
  totalCents: number;
  currency: string;
  holdExpiresAt: string;
}

type LoadStatus = "idle" | "loading" | "ready" | "error";

interface BookingState {
  provider: ProviderDTO | null;
  services: ServiceDTO[];

  step: Step;
  direction: 1 | -1;

  serviceId: string | null;
  date: string | null;
  slot: SlotDTO | null;

  slots: SlotDTO[];
  slotsStatus: LoadStatus;
  slotsError: string | null;
  monthAvailability: Record<string, Record<string, boolean>>;
  monthStatus: Record<string, LoadStatus>;

  customer: CustomerForm;
  customerErrors: Partial<Record<keyof CustomerForm, string>>;

  booking: BookingDTO | null;
  manageUrl: string | null;
  checkout: CheckoutSession | null;
  submitStatus: "idle" | "submitting" | "error";
  submitError: string | null;

  paymentStatus: "idle" | "processing" | "succeeded" | "error";
  paymentError: string | null;
}

interface BookingActions {
  init(provider: ProviderDTO, services: ServiceDTO[]): void;
  selectService(id: string): void;
  goTo(step: Step): void;
  next(): void;
  back(): void;
  setDate(date: string): void;
  loadSlots(date: string): Promise<void>;
  loadMonth(month: string): Promise<void>;
  selectSlot(slot: SlotDTO): void;
  setCustomer(patch: Partial<CustomerForm>): void;
  submitCustomer(): Promise<void>;
  retryCheckout(): Promise<void>;
  setPaymentStatus(status: BookingState["paymentStatus"], error?: string | null): void;
  reset(): void;
}

export type BookingStore = BookingState & BookingActions;

const emptyCustomer: CustomerForm = { name: "", email: "", phone: "", address: "", serviceDetails: "", notes: "" };

const initialState: BookingState = {
  provider: null,
  services: [],
  step: "service",
  direction: 1,
  serviceId: null,
  date: null,
  slot: null,
  slots: [],
  slotsStatus: "idle",
  slotsError: null,
  monthAvailability: {},
  monthStatus: {},
  customer: emptyCustomer,
  customerErrors: {},
  booking: null,
  manageUrl: null,
  checkout: null,
  submitStatus: "idle",
  submitError: null,
  paymentStatus: "idle",
  paymentError: null,
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateCustomer(c: CustomerForm, requireAddress: boolean): Partial<Record<keyof CustomerForm, string>> {
  const errors: Partial<Record<keyof CustomerForm, string>> = {};
  if (c.name.trim().length < 2) errors.name = "Please enter your full name";
  if (!EMAIL_RE.test(c.email.trim())) errors.email = "Enter a valid email address";
  if (requireAddress && c.address.trim().length < 5) errors.address = "Where should we come to?";
  if (c.phone.trim() && c.phone.trim().length < 7) errors.phone = "That phone number looks too short";
  return errors;
}

// Ignore slot responses that arrive after the user has already moved on.
let slotRequestSeq = 0;

export const useBookingStore = create<BookingStore>()((set, get) => ({
  ...initialState,

  init(provider, services) {
    set({ ...initialState, provider, services });
  },

  selectService(id) {
    const { serviceId } = get();
    if (serviceId === id) return;
    // Changing the service invalidates every slot computed for the old duration.
    set({ serviceId: id, slot: null, slots: [], slotsStatus: "idle", monthAvailability: {}, monthStatus: {} });
  },

  goTo(step) {
    const from = STEPS.indexOf(get().step);
    const to = STEPS.indexOf(step);
    set({ step, direction: to >= from ? 1 : -1 });
  },

  next() {
    const { step, serviceId, slot, goTo } = get();
    if (step === "service" && serviceId) goTo("datetime");
    else if (step === "datetime" && slot) goTo("customer");
  },

  back() {
    const { step, goTo } = get();
    if (step === "datetime") goTo("service");
    else if (step === "customer") goTo("datetime");
    else if (step === "payment") {
      set({ checkout: null, booking: null, paymentStatus: "idle", paymentError: null, submitStatus: "idle", submitError: null });
      goTo("customer");
    }
  },

  setDate(date) {
    if (get().date === date) return;
    set({ date, slot: null });
    void get().loadSlots(date);
  },

  async loadSlots(date) {
    const { provider, serviceId } = get();
    if (!provider || !serviceId) return;
    const seq = ++slotRequestSeq;
    set({ slotsStatus: "loading", slotsError: null });
    try {
      const params = new URLSearchParams({ providerId: provider.id, serviceId, date });
      const res = await api<{ slots: SlotDTO[] }>(`/api/slots?${params}`);
      if (seq !== slotRequestSeq) return;
      set({ slots: res.slots, slotsStatus: "ready" });
    } catch (err) {
      if (seq !== slotRequestSeq) return;
      set({ slots: [], slotsStatus: "error", slotsError: errorMessage(err, "Could not load times") });
    }
  },

  async loadMonth(month) {
    const { provider, serviceId, monthStatus } = get();
    if (!provider || !serviceId) return;
    if (monthStatus[month] === "loading" || monthStatus[month] === "ready") return;
    set((s) => ({ monthStatus: { ...s.monthStatus, [month]: "loading" } }));
    try {
      const params = new URLSearchParams({ providerId: provider.id, serviceId, month });
      const res = await api<{ days: Record<string, boolean> }>(`/api/slots?${params}`);
      set((s) => ({
        monthAvailability: { ...s.monthAvailability, [month]: res.days },
        monthStatus: { ...s.monthStatus, [month]: "ready" },
      }));
    } catch {
      set((s) => ({ monthStatus: { ...s.monthStatus, [month]: "error" } }));
    }
  },

  selectSlot(slot) {
    set({ slot });
  },

  setCustomer(patch) {
    set((s) => {
      const customer = { ...s.customer, ...patch };
      const customerErrors = { ...s.customerErrors };
      for (const key of Object.keys(patch) as (keyof CustomerForm)[]) delete customerErrors[key];
      return { customer, customerErrors };
    });
  },

  /**
   * Optimistic transition: we move to the payment step immediately (showing the
   * payment skeleton) while the hold + PaymentIntent are created. If anything
   * fails we slide back to the customer step with the error attached.
   */
  async submitCustomer() {
    const { provider, serviceId, slot, customer, goTo } = get();
    if (!provider || !serviceId || !slot) return;

    const errors = validateCustomer(customer, provider.locationMode === "MOBILE");
    if (Object.keys(errors).length > 0) {
      set({ customerErrors: errors });
      return;
    }

    set({ submitStatus: "submitting", submitError: null, checkout: null, paymentStatus: "idle", paymentError: null });
    // Pay-on-the-day providers have no payment step: keep the form (with its
    // loading button) until the server confirms, then jump straight to success.
    if (provider.takesDeposits) goTo("payment");

    try {
      const { booking, manageUrl, requiresPayment } = await api<{ booking: BookingDTO; manageUrl: string; requiresPayment: boolean }>("/api/bookings", {
        method: "POST",
        body: {
          providerId: provider.id,
          serviceId,
          startTime: slot.start,
          customer: {
            name: customer.name.trim(),
            email: customer.email.trim(),
            phone: customer.phone.trim() || null,
          },
          address: provider.locationMode === "MOBILE" ? customer.address.trim() : null,
          serviceDetails: customer.serviceDetails.trim() || null,
          notes: customer.notes.trim() || null,
        },
      });
      set({ booking, manageUrl });

      if (!requiresPayment) {
        // Provider is not taking deposits: the booking is already confirmed server-side.
        set({ submitStatus: "idle", paymentStatus: "succeeded" });
        goTo("success");
        return;
      }

      const checkout = await api<CheckoutSession>("/api/checkout", { method: "POST", body: { bookingId: booking.id } });
      set({ checkout, submitStatus: "idle" });
    } catch (err) {
      const message = errorMessage(err, "We could not reserve that slot");
      const slotGone = err instanceof ClientApiError && (err.code === "SLOT_UNAVAILABLE" || err.code === "HOLD_EXPIRED");
      const stripeMissing = err instanceof ClientApiError && err.code === "STRIPE_NOT_CONFIGURED";

      if (stripeMissing) {
        // Keep the booking (it is a valid hold) but surface the configuration problem on the payment step.
        set({ submitStatus: "error", submitError: message });
        return;
      }

      set({ submitStatus: "error", submitError: message, booking: null, checkout: null });
      if (slotGone) {
        set({ slot: null });
        goTo("datetime");
        const date = get().date;
        if (date) void get().loadSlots(date);
      } else {
        goTo("customer");
      }
    }
  },

  async retryCheckout() {
    const { booking } = get();
    if (!booking) return get().submitCustomer();
    set({ submitStatus: "submitting", submitError: null });
    try {
      const checkout = await api<CheckoutSession>("/api/checkout", { method: "POST", body: { bookingId: booking.id } });
      set({ checkout, submitStatus: "idle" });
    } catch (err) {
      set({ submitStatus: "error", submitError: errorMessage(err) });
    }
  },

  setPaymentStatus(status, error = null) {
    set({ paymentStatus: status, paymentError: error });
    if (status === "succeeded") {
      set((s) => ({
        booking:
          s.booking && s.booking.depositCents > 0 ? { ...s.booking, status: "PAID", paidAt: new Date().toISOString() } : s.booking,
      }));
      get().goTo("success");
    }
  },

  reset() {
    const { provider, services } = get();
    set({ ...initialState, provider, services });
  },
}));

export const selectService = (s: BookingStore) => s.services.find((x) => x.id === s.serviceId) ?? null;
export const selectStepIndex = (s: BookingStore) => STEPS.indexOf(s.step);
