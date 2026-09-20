import type Stripe from "stripe";
import { prisma } from "@/lib/prisma";
import { appUrl } from "@/lib/email";
import { getStripe, isLiveMode, isStripeConfigured } from "@/lib/stripe";

export { COUNTRIES, COUNTRY_CODES, PLATFORM_FEE_MIN_CENTS, PLATFORM_FEE_PERCENT, countryForCurrency, platformFeeFor, type CountryCode } from "@/lib/platform";

/**
 * How GlideBook earns per booking: every deposit is a destination charge on the
 * platform account that is transferred to the provider's Express account, minus
 * an application fee. The provider never pays a subscription; nothing is taken
 * when they are not booked.
 */
export interface ConnectFlags {
  stripeAccountId: string | null;
  stripeAccountLive: boolean;
  stripeChargesEnabled: boolean;
}

/** A connected account only counts when it was created in the mode the server is running in. */
export function accountUsable(p: Pick<ConnectFlags, "stripeAccountId" | "stripeAccountLive">): boolean {
  return Boolean(p.stripeAccountId) && p.stripeAccountLive === isLiveMode();
}

/** True when the booking page should collect a deposit for this provider. */
export function canTakeDeposits(p: ConnectFlags): boolean {
  return isStripeConfigured() && accountUsable(p) && p.stripeChargesEnabled;
}

export interface ConnectStatus {
  configured: boolean;
  connected: boolean;
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  detailsSubmitted: boolean;
  /** Something Stripe still needs from the provider (identity, bank account...). */
  requirementsDue: string[];
}

/** Pull the latest account state from Stripe and mirror it on the provider row. */
export async function syncConnectAccount(providerId: string, accountId: string): Promise<ConnectStatus> {
  const account = await getStripe().accounts.retrieve(accountId);
  return applyAccount(providerId, account);
}

export async function applyAccount(providerId: string, account: Stripe.Account): Promise<ConnectStatus> {
  const chargesEnabled = Boolean(account.charges_enabled);
  const payoutsEnabled = Boolean(account.payouts_enabled);
  const detailsSubmitted = Boolean(account.details_submitted);
  const current = await prisma.user.findUnique({ where: { id: providerId }, select: { stripeConnectedAt: true } });
  await prisma.user.update({
    where: { id: providerId },
    data: {
      stripeAccountId: account.id,
      stripeAccountLive: isLiveMode(),
      stripeChargesEnabled: chargesEnabled,
      stripePayoutsEnabled: payoutsEnabled,
      stripeDetailsSubmitted: detailsSubmitted,
      stripeConnectedAt: chargesEnabled && !current?.stripeConnectedAt ? new Date() : undefined,
    },
  });
  return {
    configured: true,
    connected: true,
    chargesEnabled,
    payoutsEnabled,
    detailsSubmitted,
    requirementsDue: [...(account.requirements?.currently_due ?? []), ...(account.requirements?.eventually_due ?? [])].filter(
      (v, i, a) => a.indexOf(v) === i,
    ),
  };
}

/** Create the Express account on first use, then a fresh hosted-onboarding link. */
export async function createOnboardingLink(provider: {
  id: string;
  email: string;
  businessName: string | null;
  slug: string | null;
  country: string;
  stripeAccountId: string | null;
  stripeAccountLive: boolean;
}): Promise<string> {
  const stripe = getStripe();
  // An account from the other mode (test vs live) is useless here: start fresh.
  let accountId = accountUsable(provider) ? provider.stripeAccountId : null;

  if (!accountId) {
    const account = await stripe.accounts.create(
      {
        type: "express",
        country: provider.country,
        email: provider.email,
        capabilities: { card_payments: { requested: true }, transfers: { requested: true } },
        business_profile: {
          name: provider.businessName ?? undefined,
          url: provider.slug ? appUrl(`/book/${provider.slug}`) : undefined,
          product_description: "Appointment deposits collected through a GlideBook booking page",
        },
        metadata: { providerId: provider.id },
      },
      { idempotencyKey: `connect_${provider.id}_${isLiveMode() ? "live" : "test"}` },
    );
    accountId = account.id;
    await prisma.user.update({
      where: { id: provider.id },
      data: {
        stripeAccountId: accountId,
        stripeAccountLive: isLiveMode(),
        stripeChargesEnabled: false,
        stripePayoutsEnabled: false,
        stripeDetailsSubmitted: false,
      },
    });
  }

  const link = await stripe.accountLinks.create({
    account: accountId,
    type: "account_onboarding",
    refresh_url: appUrl("/dashboard/payments?refresh=1"),
    return_url: appUrl("/dashboard/payments?return=1"),
  });
  return link.url;
}

/**
 * Undo a booking's payment: refund a succeeded PaymentIntent (reversing the
 * transfer and our fee for connected accounts) or cancel one still in flight.
 */
export async function refundBookingPayment(booking: { id: string; paymentIntentId: string | null }): Promise<{ refunded: boolean }> {
  if (!booking.paymentIntentId || !isStripeConfigured()) return { refunded: false };
  const stripe = getStripe();
  const pi = await stripe.paymentIntents.retrieve(booking.paymentIntentId);

  if (pi.status === "succeeded") {
    const destination = Boolean(pi.transfer_data?.destination);
    await stripe.refunds.create(
      {
        payment_intent: pi.id,
        reason: "requested_by_customer",
        ...(destination ? { reverse_transfer: true, refund_application_fee: true } : {}),
      },
      { idempotencyKey: `refund_${booking.id}` },
    );
    return { refunded: true };
  }
  if (pi.status !== "canceled") {
    await stripe.paymentIntents.cancel(pi.id);
  }
  return { refunded: false };
}
