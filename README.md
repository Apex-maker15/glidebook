# GlideBook

Micro-SaaS booking for independent beauty pros (nail techs, lash artists, barbers) and mobile services (detailers, groomers). Clients pick a service and a slot, pay a deposit or the full price with Stripe, and the appointment lands on the provider's dashboard in real time.

**Stack:** Next.js 16 (App Router, React 19) · Tailwind CSS · Framer Motion · Lucide · Prisma 6 (engine-less, `pg` driver adapter) · PostgreSQL · NextAuth.js v5 · Stripe (Payment Element + webhooks) · Zustand · Server-Sent Events with Postgres `LISTEN/NOTIFY`.

Everything in this stack is open source or has a free tier. Stripe only takes a per-transaction fee when real money moves; test mode is free.

---

## Run it locally for $0 (no Postgres install needed)

```bash
npm install
cp .env.example .env          # defaults already point at the local PGlite database
npm run db:local              # terminal 1 - WASM Postgres on 127.0.0.1:5433
npm run db:setup              # terminal 2 - apply migration + seed two demo providers
npm run dev                   # http://localhost:3000
```

Demo logins (password `password123`):

| Provider | Email | Booking page |
| --- | --- | --- |
| Polished by Apex (nails, GBP, 30% deposit) | `demo@polishedbyapex.com` | `/book/polished-by-apex` |
| Shine Mobile Detailing (car) | `demo@shinemobile.com` | `/book/shine-mobile` |
| Paws on Wheels Grooming (pet) | `demo@pawsonwheels.com` | `/book/paws-on-wheels` |

Open the dashboard in one tab and the booking page in another - a new booking slides onto the board without a refresh.

### Stripe (still free)

1. Create a Stripe account, copy the **test** keys from <https://dashboard.stripe.com/test/apikeys> into `.env`.
2. Forward webhooks locally (Stripe CLI is free):
   ```bash
   stripe listen --forward-to localhost:3000/api/webhooks/stripe
   ```
   Paste the printed `whsec_...` into `STRIPE_WEBHOOK_SECRET`.
3. Pay with test card `4242 4242 4242 4242`, any future expiry, any CVC. The webhook flips the booking to **PAID** and the dashboard glows.

Without keys the app still runs end-to-end; the payment step shows a setup notice and the hold is kept.

---

## Deploy for $0

| Piece | Free option | Notes |
| --- | --- | --- |
| App | **Vercel Hobby** | `npm run build` runs `prisma generate` first. Set every variable from `.env.example`. |
| Database | **Supabase** free project | Use the *direct* connection string (session mode, port 5432). `LISTEN/NOTIFY` then works across serverless instances. |
| | or **Neon** free project | Also fine. Realtime auto-detects that NOTIFY is unavailable and the dashboard still updates via SSE + 15 s polling. |
| Payments | **Stripe** | No monthly fee. Add a webhook endpoint for `https://<your-app>/api/webhooks/stripe` with events `payment_intent.succeeded`, `payment_intent.canceled`, `charge.refunded`. |

Steps:

```bash
# once, against the production database
DATABASE_URL="postgresql://..." npx prisma migrate deploy
DATABASE_URL="postgresql://..." npx prisma db seed     # optional demo data
```

Then import the repo into Vercel, paste the env vars, deploy. Set `NEXT_PUBLIC_APP_URL` to the Vercel URL.

---

## How it works

### Data model (`prisma/schema.prisma`)

- `User` - `PROVIDER` or `CUSTOMER`. Providers carry their business profile: `slug`, `category` (nails/beauty, hair, detailing, grooming, other), `timezone`, `currency`, `locationMode` (clients come to a studio vs. provider travels), `studioAddress`, `depositPercent` (100 = full prepay), `slotIntervalMinutes`, `bufferMinutes`, `minNoticeMinutes`, `bookingHorizonDays`. Customers are created as guests on their first booking.
- `Service` - name, duration, price in cents.
- `Booking` - `PENDING → PAID | CONFIRMED | CANCELLED`, UTC instants, price snapshot (`amountCents`) plus what was actually charged (`depositCents`), `paymentIntentId`.
- `Availability` - one row per weekday with `{ windows: [{start,end}], breaks: [{start,end}] }` in the provider's local time.
- `StripeEvent` - processed webhook ids for idempotency.

### Provider pages, branding, reviews

`/book/<slug>` is the provider's own page, not a GlideBook form: cover and logo (uploaded from **Your page** in the dashboard, resized in the browser and stored inline as data URLs so no image host is needed), tagline, bio, Instagram, up to six work photos, a brand colour that re-tints the whole page (`src/lib/color.ts` derives light/dark "strong" shades), hours from availability, service areas, policies, and an embedded map for studio providers. Clients rate a booking from their manage link once the appointment has passed (`POST /api/bookings/:id/review`, one per booking); the average and latest reviews sit above the booking form.

### Theme

Light and dark are CSS-variable themes switched by `data-theme` on `<html>` (`src/components/theme/`). The choice is saved in `localStorage`, defaults to the OS preference, and is applied by a `beforeInteractive` script so there is no flash. Tailwind's `white`/`black` are aliased to theme tints so existing `bg-white/[0.06]`-style classes work in both themes.

### Service areas (mobile providers)

`User.serviceAreas` is free text shown on the booking page ("We come to you across Phoenix, Scottsdale..."). `User.serviceAreaCodes` is an optional comma-separated list of ZIP/postcode prefixes; when set, the booking form asks for the client's code and both the client (inline) and `POST /api/bookings` (`OUT_OF_AREA`) reject anything outside it. Matching is prefix-based and ignores case and spaces (`src/lib/service-area.ts`).

### Slot engine (`src/lib/slots.ts`)

Pure function. For a calendar day it walks each working window at `slotIntervalMinutes`, keeps a start `t` only if `t + duration` fits the window, does not intersect a break, respects the buffer around every existing booking, and is inside the notice/horizon range. All wall-clock maths goes through `date-fns-tz`, so DST is handled.

`POST /api/bookings` re-runs the same engine **inside a transaction holding `pg_advisory_xact_lock(hashtext(providerId))`**, so two customers can never take the same slot. Unpaid `PENDING` holds expire after `BOOKING_HOLD_MINUTES`; their PaymentIntents are cancelled lazily on the next read, no cron needed.

### Payments

GlideBook is free for providers: `PLATFORM_FEE_PERCENT` defaults to 0 and the done-for-you setup has no fee (`SETUP_FEE_CENTS = 0`). Both can be switched on later without code changes. Deposits reach the provider one of three ways, chosen automatically per provider:

- **card** - the provider has connected a Stripe account: the booking page takes the deposit on the spot (below).
- **link** - the provider pasted their own payment link (PayPal.me, Monzo.me, Revolut, Stripe link) in Settings: the booking is confirmed immediately, the client is sent to the link (on the success screen, in the email and on the manage page), and the provider taps **Deposit received** on the booking, which marks it `PAID`. Refunds are between them.
- **none** - nothing online; bookings confirm instantly and the provider collects on the day.

Optional revenue streams, both automatic once enabled:

1. **Per-booking fee.** Providers connect their own Stripe account from `/dashboard/payments` (Stripe Express hosted onboarding, ~2 minutes on a phone). Deposits are created as *destination charges* on the platform account with `transfer_data.destination` = the provider and `application_fee_amount` = `PLATFORM_FEE_PERCENT` of the deposit (floor `PLATFORM_FEE_MIN_CENTS`). Stripe pays the provider out; the fee stays on the platform balance. Refunds reverse the transfer and the fee. Until a provider's account has `charges_enabled`, their page runs in **pay-on-the-day mode**: bookings confirm instantly with no card step, so the product is usable from minute one and the dashboard nudges them to connect.
2. **Done-for-you setup.** A flat fee charged directly on the platform account (see below).

Enable Connect once in the Stripe dashboard (Connect → Get started → platform). Test mode needs no activation.

#### Checkout flow

- `POST /api/checkout` creates (or reuses) a PaymentIntent for the booking's snapshotted amount with an idempotency key, and returns the `clientSecret`.
- The last wizard step embeds `<PaymentElement>` and confirms with `redirect: "if_required"`. Redirect-based methods land on `/book/return`.
- `POST /api/webhooks/stripe` verifies the signature on the raw body, records the event id, then marks the booking `PAID` (or `CANCELLED` on cancel/refund) and publishes a realtime event.
- Cancelling a paid booking from the dashboard issues a full refund.

### Owner panel (`/admin`)

The owner's email (`DEFAULT_ADMIN_EMAILS` in `src/lib/admin.ts`, extendable with `ADMIN_EMAILS`) sees an **Owner** link: platform revenue and deposits per currency, every provider with their Stripe state and activity, the latest bookings across the platform, and a per-provider workbench (`/admin/providers/:id`) with that provider's bookings and the same services / hours / settings editors, acting on their behalf via `?providerId=`.

### Done-for-you setup (`/dashboard/setup`, `/admin/setup`)

Providers can build their page themselves for free, or pay a one-off fee (GBP 5, `SETUP_FEE_CENTS` in `src/lib/admin.ts`) and paste their price list. The fee is a Stripe PaymentIntent with `metadata.kind = "setup"`; the webhook marks the `SetupRequest` paid. Emails listed in `ADMIN_EMAILS` see an **Admin** link with the queue: pick a request, edit that provider's services, hours and settings in place (the dashboard APIs accept `?providerId=` for admins), then mark it done.

### Email, reminders and client self-service

- `src/lib/email.ts` sends over any SMTP provider (`SMTP_URL`, `EMAIL_FROM`); templates in `src/emails/` are React Email components. Without SMTP configured, sends are logged and skipped.
- On payment (or provider confirmation) the client gets a confirmation with an `.ics` invite and the provider gets a new-booking alert. Cancellations notify both sides.
- `/api/cron/reminders` runs daily via `vercel.json` (set `CRON_SECRET`) and emails clients whose appointment is 12-40 hours away.
- Every email links to `/b/<bookingId>?t=<manageToken>`, where the client can add the appointment to Google Calendar or cancel; cancelling outside `cancelNoticeHours` refunds the deposit automatically.
- `/book/<slug>/opengraph-image` renders a branded preview card for links shared on Instagram, WhatsApp and iMessage.

### Realtime (`src/lib/realtime.ts`, `/api/events`)

The dashboard opens an `EventSource`. Server side, `publish()` emits to an in-process bus and, when the database provably delivers notifications (a probe is sent after `LISTEN`), through Postgres `NOTIFY` so every server instance sees every event. If the stream cannot be established the client falls back to 15 s polling, and it reconciles every 60 s and on tab focus regardless.

### UI / motion

- Wizard steps use `AnimatePresence mode="popLayout"` with direction-aware slide + blur variants; the container animates `layout` so height changes never jump.
- Selected service, calendar day, time slot, step pill, nav item and filter chip all use `layoutId` so the active state morphs between elements.
- Every interactive element uses spring physics (`src/components/motion.ts`), low stiffness / high damping.
- Skeletons cross-fade into content via `AnimatePresence mode="wait"`; the Stripe iframe has a reserved min-height to avoid CLS.
- Optimistic UI: the wizard jumps to the payment step while the hold is created (rolling back on failure); dashboard status changes apply instantly and revert with a toast if the server disagrees.
- Visual rules: Instrument Sans for text and Fraunces for headings (`h1`/`h2`); icons come only from `src/components/icons.ts` (Phosphor, duotone, hook-free SSR build so one import works in server and client components); no drop shadows, gradients, hover lifts or pill badges; corners are 3 to 8px (`borderRadius` scale in `tailwind.config.ts`); status colours are the theme-aware `ok`/`warn`/`bad`/`info` tokens rather than Tailwind's palette.
- The homepage embeds a real booking page (the oldest detailer with a cover photo) as its demo. `/terms` and `/privacy` are linked from every footer; `SUPPORT_EMAIL` sets the contact address shown there.

---

## Scripts

| Script | What it does |
| --- | --- |
| `npm run dev` | Next.js dev server (Turbopack) |
| `npm run dev:webpack` | Dev server with webpack - use on Windows-on-ARM / machines that block native binaries |
| `npm run build` / `start` | Production build / serve |
| `npm run db:local` | Zero-install local Postgres (PGlite) on port 5433 |
| `npm run db:setup` | `prisma migrate deploy` + seed |
| `npm run db:migrate:dev` | Create a new migration after editing the schema |
| `npm run db:studio` | Prisma Studio |
| `npm run typecheck` / `lint` | `tsc --noEmit` / ESLint |

## Notes

- Tailwind is pinned to v3.4 on purpose: it is pure JavaScript, so it builds on every CPU/OS (including Windows on ARM and locked-down machines that block native binaries) and on any CI.
- Prisma runs without its Rust query engine (`engineType = "client"` + `@prisma/adapter-pg`), which keeps serverless bundles small and avoids platform-specific binaries.
- `src/proxy.ts` (Next 16's middleware) protects `/dashboard` and bounces signed-in providers away from `/login`.
