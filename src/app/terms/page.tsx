import type { Metadata } from "next";
import { LegalPage, Section } from "@/components/legal";
import { supportEmail } from "@/lib/site";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "The terms for using GlideBook booking pages, as a business or as a client booking an appointment.",
};

export default function TermsPage() {
  const email = supportEmail();
  return (
    <LegalPage
      title="Terms of Service"
      intro="GlideBook gives service businesses a booking page. These terms cover both the businesses that use it (providers) and the people who book through it (clients). They are written to be read, not skimmed, so they are short."
    >
      <Section n={1} title="What GlideBook is">
        <p>
          GlideBook is a booking page. A provider lists their services, prices, hours and the areas they cover; a client picks a
          service and a time and, where the provider asks for one, pays a deposit. GlideBook runs the page, sends the emails and
          keeps the calendar. It does not carry out the service.
        </p>
        <p>
          The appointment itself is an agreement between the provider and the client. GlideBook is not a party to it and does not
          guarantee that a provider will turn up, that a client will, or that the work will be to anyone&apos;s satisfaction.
        </p>
      </Section>

      <Section n={2} title="Provider accounts">
        <p>
          To create a page you need to be at least 18 and entitled to run the business you list. You are responsible for what is on
          your page: prices, descriptions, hours, service areas and photos must be accurate and yours to use. Keep your password to
          yourself; anything done from your account is treated as done by you.
        </p>
      </Section>

      <Section n={3} title="Bookings, deposits and refunds">
        <p>
          A provider chooses whether to ask for a deposit and how much (a percentage of the price, or full payment). Deposits are
          paid either by card through the provider&apos;s own Stripe account, or through a payment link the provider supplies (for
          example PayPal or a bank app). GlideBook never holds the money and never takes a share of it.
        </p>
        <p>
          Each booking shows the provider&apos;s cancellation window (24 hours unless the provider sets otherwise). A client who
          cancels outside that window gets any card deposit refunded automatically. Inside the window, the deposit is kept by the
          provider. Deposits paid through a payment link are refunded by the provider directly.
        </p>
        <p>
          Card payments are processed by Stripe under Stripe&apos;s own terms. Any dispute about the work, the price or a refund is
          between the provider and the client; GlideBook will help with records where it can, but does not adjudicate.
        </p>
      </Section>

      <Section n={4} title="Fees">
        <p>
          GlideBook is currently free: no subscription, no commission and no setup charge. If that changes, providers will be told by
          email at least 30 days in advance, and nothing already booked will be charged retrospectively. Stripe&apos;s card processing
          fee is Stripe&apos;s, not ours, and applies only if you take card deposits.
        </p>
      </Section>

      <Section n={5} title="What you must not do">
        <p>
          Do not list services that are illegal where you operate, misdescribe what you offer, use GlideBook to send unsolicited
          messages, attempt to access other accounts, or copy the service by automated means. Clients must not make bookings they
          do not intend to keep.
        </p>
      </Section>

      <Section n={6} title="Your content">
        <p>
          Logos, photos and text you upload stay yours. You give GlideBook permission to show them on your booking page, in the
          emails it sends about your bookings, and in previews of the page (for example the image that appears when your link is
          shared). If you want your page listed as an example on the GlideBook homepage, we will ask first.
        </p>
      </Section>

      <Section n={7} title="Availability and changes">
        <p>
          GlideBook is provided as it is. We work to keep it running and to keep bookings accurate, but we do not promise it will be
          available at all times or free of faults. Features may be changed, added or removed; material changes that affect how
          you use the service are announced by email to providers.
        </p>
      </Section>

      <Section n={8} title="Closing an account">
        <p>
          A provider can close their account at any time by contacting us; the page comes down and personal data is handled as
          described in the Privacy Policy. We may suspend or close an account that breaks these terms, and will say why.
        </p>
      </Section>

      <Section n={9} title="Liability">
        <p>
          To the extent the law allows, GlideBook is not liable for lost bookings, no-shows, disputes between providers and clients,
          or losses that follow from the service being unavailable. Nothing in these terms limits liability that cannot be limited
          under the law of England and Wales, including for death, personal injury or fraud.
        </p>
      </Section>

      <Section n={10} title="Law and contact">
        <p>
          These terms are governed by the law of England and Wales. Updates are posted on this page with the date at the top.
          {email ? (
            <>
              {" "}
              Questions go to{" "}
              <a href={`mailto:${email}`} className="text-ink underline">
                {email}
              </a>
              .
            </>
          ) : (
            " Questions can be sent by replying to any email GlideBook has sent you."
          )}
        </p>
      </Section>
    </LegalPage>
  );
}
