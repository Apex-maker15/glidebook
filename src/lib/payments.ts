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

type V2Account = Stripe.V2.Core.Account;

const ACCOUNT_INCLUDE: Stripe.V2.Core.AccountRetrieveParams.Include[] = ["configuration.merchant", "configuration.recipient", "requirements"];

/** Pull the latest account state from Stripe and mirror it on the provider row. */
export async function syncConnectAccount(providerId: string, accountId: string): Promise<ConnectStatus> {
  const account = await getStripe().v2.core.accounts.retrieve(accountId, { include: ACCOUNT_INCLUDE });
  return applyAccount(providerId, account);
}

/**
 * Accounts v2: "can take card payments" is the merchant card_payments capability,
 * "can be paid out" is the recipient stripe_balance payouts capability, and the
 * requirements list tells us what Stripe still wants from the provider.
 */
export async function applyAccount(providerId: string, account: V2Account): Promise<ConnectStatus> {
  const merchant = account.configuration?.merchant?.capabilities;
  const recipient = account.configuration?.recipient?.capabilities?.stripe_balance;
  const chargesEnabled = merchant?.card_payments?.status === "active" && recipient?.stripe_transfers?.status === "active";
  const payoutsEnabled = recipient?.payouts?.status === "active";
  const entries = account.requirements?.entries ?? [];
  const outstanding = entries.filter((e) => e.awaiting_action_from === "user");
  const detailsSubmitted = !outstanding.some((e) => e.minimum_deadline.status === "currently_due" || e.minimum_deadline.status === "past_due");

  const current = await prisma.user.findUnique({ where: { id: providerId }, select: { stripeConnectedAt: true } });
  await prisma.user.update({
    where: { id: providerId },
    data: {
      stripeAccountId: account.id,
      stripeAccountLive: Boolean(account.livemode),
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
    requirementsDue: [...new Set(outstanding.map((e) => e.description))],
  };
}

/** Create the connected account on first use, then a fresh hosted-onboarding link. */
export async function createOnboardingLink(provider: {
  id: string;
  email: string;
  businessName: string | null;
  slug: string | null;
  country: string;
  currency: string;
  stripeAccountId: string | null;
  stripeAccountLive: boolean;
}): Promise<string> {
  const stripe = getStripe();
  // An account from the other mode (test vs live) is useless here: start fresh.
  let accountId = accountUsable(provider) ? provider.stripeAccountId : null;

  if (!accountId) {
    // Express-style account: Stripe collects the provider's details on its hosted
    // pages, the provider gets the Express dashboard for payouts, and GlideBook
    // (the "application") pays Stripe's fees out of its application fee.
    const account = await stripe.v2.core.accounts.create(
      {
        display_name: provider.businessName ?? undefined,
        contact_email: provider.email,
        dashboard: "express",
        identity: { country: provider.country.toLowerCase() },
        defaults: {
          currency: provider.currency,
          responsibilities: { fees_collector: "application", losses_collector: "application" },
          ...(provider.slug ? { profile: { business_url: appUrl(`/book/${provider.slug}`) } } : {}),
        },
        configuration: {
          merchant: { capabilities: { card_payments: { requested: true } } },
          recipient: { capabilities: { stripe_balance: { stripe_transfers: { requested: true } } } },
        },
        metadata: { providerId: provider.id },
      },
      { idempotencyKey: `connect_v2_${provider.id}_${isLiveMode() ? "live" : "test"}` },
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

  const link = await stripe.v2.core.accountLinks.create({
    account: accountId,
    use_case: {
      type: "account_onboarding",
      account_onboarding: {
        configurations: ["merchant", "recipient"],
        refresh_url: appUrl("/dashboard/payments?refresh=1"),
        return_url: appUrl("/dashboard/payments?return=1"),
      },
    },
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
