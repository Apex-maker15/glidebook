import type { BookingStatus, BusinessCategory, LocationMode } from "@prisma/client";

export type { BookingStatus, BusinessCategory, LocationMode };

export interface TimeWindow {
  start: string; // "HH:mm" in the provider's timezone
  end: string;
}

export interface AvailabilitySlots {
  windows: TimeWindow[];
  breaks: TimeWindow[];
}

export interface AvailabilityDTO {
  dayOfWeek: number;
  slots: AvailabilitySlots;
}

export interface ServiceDTO {
  id: string;
  name: string;
  description: string | null;
  durationMinutes: number;
  priceCents: number;
  currency: string;
  active: boolean;
  sortOrder: number;
}

export interface ProviderDTO {
  id: string;
  slug: string;
  businessName: string;
  ownerName: string;
  category: BusinessCategory;
  timezone: string;
  currency: string;
  locationMode: LocationMode;
  studioAddress: string | null;
  /** MOBILE providers: readable coverage shown on the booking page. */
  serviceAreas: string | null;
  /** MOBILE providers: comma-separated ZIP/postcode prefixes accepted at booking. */
  serviceAreaCodes: string | null;
  depositPercent: number;
  cancelNoticeHours: number;
  slotIntervalMinutes: number;
  bufferMinutes: number;
  minNoticeMinutes: number;
  bookingHorizonDays: number;
  phone: string | null;
  country: string;
  /** False until the provider's Stripe account can accept charges; bookings then confirm without payment. */
  takesDeposits: boolean;
  stripeConnected: boolean;
}

export interface SlotDTO {
  start: string; // ISO-8601 UTC instant
  end: string;
  label: string; // "9:30 AM" rendered in provider timezone
}

export interface BookingDTO {
  id: string;
  providerId: string;
  customerId: string;
  serviceId: string;
  startTime: string;
  endTime: string;
  status: BookingStatus;
  amountCents: number;
  depositCents: number;
  platformFeeCents: number;
  currency: string;
  paidAt: string | null;
  address: string | null;
  postcode: string | null;
  serviceDetails: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  service: { id: string; name: string; durationMinutes: number };
  customer: { id: string; name: string; email: string; phone: string | null };
}

export type RealtimeEvent =
  | { type: "booking.created"; providerId: string; booking: BookingDTO }
  | { type: "booking.updated"; providerId: string; booking: BookingDTO };

export interface ApiError {
  error: string;
  code?: string;
  issues?: Record<string, string[]>;
}
