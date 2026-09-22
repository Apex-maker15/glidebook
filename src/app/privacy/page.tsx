import type { Metadata } from "next";
import { LegalPage, Section } from "@/components/legal";
import { supportEmail } from "@/lib/site";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "What GlideBook collects when you book or run a booking page, why, who sees it and how long it is kept.",
};

export default function PrivacyPage() {
  const email = supportEmail();
  return (
    <LegalPage
      title="Privacy Policy"
      intro="GlideBook is run from the United Kingdom. This page says what we collect when you book an appointment or run a booking page, why we collect it, who else sees it and how to get it removed. No advertising, no selling of data, no tracking across other sites."
    >
      <Section n={1} title="If you book an appointment">
        <p>
          We collect what the booking form asks for: your name, email address, phone number if you give one, the address or
          postcode the provider needs to come to you, and any notes you add (for example the vehicle or the pet). We also keep the
          booking itself: the service, the time, the price and whether a deposit was paid.
        </p>
        <p>
          Card details never touch GlideBook. If you pay a deposit by card, it is taken by Stripe and we see only whether it
          succeeded. If the provider uses their own payment link, that payment happens entirely between you and them.
        </p>
      </Section>

      <Section n={2} title="If you run a booking page">
        <p>
          We hold your name, business name, email, phone, a hashed copy of your password, and everything you put on your page:
          services, prices, hours, service areas, logo and photos, Instagram handle and description. If you connect Stripe we store
          your Stripe account identifier and whether it is ready to take payments; your bank details stay with Stripe.
        </p>
      </Section>

      <Section n={3} title="Why we use it">
        <p>
          To make the booking happen: showing the provider what was booked, sending the confirmation, the calendar invite, the
          reminder the day before, and the cancellation link. That is the contract you enter when you book or sign up. We also use
          it to keep the service secure and to fix faults, which is our legitimate interest. We do not use it for advertising.
        </p>
      </Section>

      <Section n={4} title="Who else sees it">
        <p>
          The provider you book with sees your booking details, because they are doing the work. Beyond that, data is handled by
          the services GlideBook runs on: Stripe for card payments, an email delivery service for the messages we send, Vercel for
          hosting and cookie-free page analytics, and a hosted Postgres database. Some of these process data outside the UK under
          the standard contractual safeguards. Nobody else receives it unless the law requires.
        </p>
      </Section>

      <Section n={5} title="Cookies and storage">
        <p>
          Signed-in providers get one session cookie so they stay logged in. Your light or dark preference is kept in your
          browser&apos;s local storage. There are no advertising or cross-site tracking cookies, and the analytics we use do not set
          any.
        </p>
      </Section>

      <Section n={6} title="How long we keep it">
        <p>
          Bookings are kept while the provider&apos;s account is open, so both sides have a record. When a provider closes their
          account, their page and its bookings are deleted within 30 days, except where a payment record has to be kept for tax or
          fraud rules. A client can ask for their details to be removed at any time and we will do so unless a booking is still
          upcoming.
        </p>
      </Section>

      <Section n={7} title="Your rights">
        <p>
          You can ask for a copy of what we hold about you, have it corrected, or have it deleted. You can also complain to the
          Information Commissioner&apos;s Office (ico.org.uk) if you think we have handled your data badly, though we would rather
          you told us first.
        </p>
      </Section>

      <Section n={8} title="Children">
        <p>GlideBook is not aimed at children under 13 and we do not knowingly collect their data.</p>
      </Section>

      <Section n={9} title="Contact">
        <p>
          {email ? (
            <>
              Write to{" "}
              <a href={`mailto:${email}`} className="text-ink underline">
                {email}
              </a>{" "}
              for anything on this page.
            </>
          ) : (
            "Reply to any email GlideBook has sent you for anything on this page."
          )}{" "}
          Changes to this policy are posted here with the date at the top.
        </p>
      </Section>
    </LegalPage>
  );
}
