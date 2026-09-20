import { formatInTimeZone } from "date-fns-tz";
import { prisma } from "@/lib/prisma";
import { appUrl, sendEmail } from "@/lib/email";
import { formatMoney } from "@/lib/utils";
import {
  BookingCancelledEmail,
  BookingConfirmedEmail,
  BookingReminderEmail,
  ProviderAlertEmail,
  type BookingEmailProps,
} from "@/emails/booking-emails";

const include = {
  service: { select: { name: true } },
  customer: { select: { name: true, email: true, phone: true } },
  provider: {
    select: {
      name: true,
      email: true,
      phone: true,
      businessName: true,
      timezone: true,
      locationMode: true,
      studioAddress: true,
      cancelNoticeHours: true,
    },
  },
} as const;

type Loaded = NonNullable<Awaited<ReturnType<typeof load>>>;

function load(bookingId: string) {
  return prisma.booking.findUnique({ where: { id: bookingId }, include });
}

export function manageUrlFor(booking: { id: string; manageToken: string }) {
  return appUrl(`/b/${booking.id}?t=${booking.manageToken}`);
}

function whenLabel(b: Loaded) {
  const tz = b.provider.timezone;
  return `${formatInTimeZone(b.startTime, tz, "EEEE d MMMM, HH:mm")} - ${formatInTimeZone(b.endTime, tz, "HH:mm")}`;
}

function locationFor(b: Loaded) {
  if (b.provider.locationMode !== "MOBILE") return b.provider.studioAddress ?? b.address;
  return [b.address, b.postcode].filter(Boolean).join(", ") || null;
}

function clientProps(b: Loaded): BookingEmailProps {
  const balance = b.amountCents - b.depositCents;
  return {
    clientName: b.customer.name,
    businessName: b.provider.businessName ?? b.provider.name,
    serviceName: b.service.name,
    when: whenLabel(b),
    timezone: b.provider.timezone,
    location: locationFor(b),
    totalLabel: formatMoney(b.amountCents, b.currency),
    paidLabel: b.depositCents > 0 ? formatMoney(b.depositCents, b.currency) : null,
    balanceLabel: balance > 0 ? formatMoney(balance, b.currency) : null,
    manageUrl: manageUrlFor(b),
    cancelNoticeHours: b.provider.cancelNoticeHours,
    providerPhone: b.provider.phone,
    depositLink: b.depositLink,
  };
}

/** RFC 5545 calendar file so the appointment lands in the client's diary. */
export function icsFor(b: Loaded): string {
  const fmt = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
  const esc = (s: string) => s.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/,/g, "\\,").replace(/;/g, "\\;");
  const business = b.provider.businessName ?? b.provider.name;
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//GlideBook//Booking//EN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${b.id}@glidebook`,
    `DTSTAMP:${fmt(new Date())}`,
    `DTSTART:${fmt(b.startTime)}`,
    `DTEND:${fmt(b.endTime)}`,
    `SUMMARY:${esc(`${b.service.name} with ${business}`)}`,
    `LOCATION:${esc(locationFor(b) ?? "")}`,
    `DESCRIPTION:${esc(`Manage your booking: ${manageUrlFor(b)}`)}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
}

/** Client confirmation + provider alert. Call after payment succeeds (or provider confirms a pay-on-day booking). */
export async function notifyBookingConfirmed(bookingId: string): Promise<void> {
  const b = await load(bookingId);
  if (!b) return;
  const props = clientProps(b);
  const balance = b.amountCents - b.depositCents;

  await Promise.all([
    sendEmail({
      to: b.customer.email,
      subject: `You're booked: ${b.service.name} with ${props.businessName}`,
      react: BookingConfirmedEmail(props),
      replyTo: b.provider.email,
      attachments: [{ filename: "appointment.ics", content: icsFor(b), contentType: "text/calendar; charset=utf-8; method=PUBLISH" }],
    }),
    sendEmail({
      to: b.provider.email,
      subject: `New booking: ${b.customer.name}, ${formatInTimeZone(b.startTime, b.provider.timezone, "EEE d MMM HH:mm")}`,
      react: ProviderAlertEmail({
        providerName: b.provider.name,
        clientName: b.customer.name,
        clientEmail: b.customer.email,
        clientPhone: b.customer.phone,
        serviceName: b.service.name,
        when: props.when,
        location: locationFor(b),
        serviceDetails: b.serviceDetails,
        notes: b.notes,
        paidLabel: b.depositLink ? `${props.paidLabel} deposit via your payment link - mark it received in your schedule` : props.paidLabel,
        balanceLabel: balance > 0 ? formatMoney(balance, b.currency) : null,
        dashboardUrl: appUrl("/dashboard"),
        kind: "new",
      }),
      replyTo: b.customer.email,
    }),
  ]);
}

export async function notifyBookingCancelled(bookingId: string, opts: { refunded: boolean; byProvider: boolean }): Promise<void> {
  const b = await load(bookingId);
  if (!b) return;
  const props = clientProps(b);
  const tasks: Promise<boolean>[] = [
    sendEmail({
      to: b.customer.email,
      subject: `Cancelled: ${b.service.name} with ${props.businessName}`,
      react: BookingCancelledEmail({ ...props, refunded: opts.refunded, byProvider: opts.byProvider }),
      replyTo: b.provider.email,
    }),
  ];
  if (!opts.byProvider) {
    tasks.push(
      sendEmail({
        to: b.provider.email,
        subject: `Cancelled: ${b.customer.name}, ${formatInTimeZone(b.startTime, b.provider.timezone, "EEE d MMM HH:mm")}`,
        react: ProviderAlertEmail({
          providerName: b.provider.name,
          clientName: b.customer.name,
          clientEmail: b.customer.email,
          clientPhone: b.customer.phone,
          serviceName: b.service.name,
          when: props.when,
          location: locationFor(b),
          serviceDetails: b.serviceDetails,
          notes: b.notes,
          paidLabel: props.paidLabel ? (opts.refunded ? `${props.paidLabel} (refunded)` : `${props.paidLabel} (kept)`) : null,
          balanceLabel: null,
          dashboardUrl: appUrl("/dashboard"),
          kind: "cancelled",
        }),
        replyTo: b.customer.email,
      }),
    );
  }
  await Promise.all(tasks);
}

export async function notifyReminder(bookingId: string): Promise<boolean> {
  const b = await load(bookingId);
  if (!b) return false;
  const props = clientProps(b);
  return sendEmail({
    to: b.customer.email,
    subject: `Reminder: ${b.service.name} tomorrow with ${props.businessName}`,
    react: BookingReminderEmail(props),
    replyTo: b.provider.email,
    attachments: [{ filename: "appointment.ics", content: icsFor(b), contentType: "text/calendar; charset=utf-8; method=PUBLISH" }],
  });
}
