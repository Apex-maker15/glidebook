import { Body, Button, Container, Head, Heading, Hr, Html, Link, Preview, Section, Text } from "@react-email/components";

/* Shared, brand-neutral layout. Inline styles are required for email clients. */

const styles = {
  body: { backgroundColor: "#f4f5f9", fontFamily: "Inter, -apple-system, Segoe UI, Helvetica, Arial, sans-serif", margin: 0, padding: "24px 0" },
  container: { backgroundColor: "#ffffff", borderRadius: 16, margin: "0 auto", maxWidth: 520, padding: "32px 28px" },
  eyebrow: { color: "#8b7cff", fontSize: 12, fontWeight: 700, letterSpacing: "0.14em", margin: 0, textTransform: "uppercase" as const },
  h1: { color: "#0f1118", fontSize: 22, fontWeight: 700, lineHeight: "30px", margin: "8px 0 12px" },
  p: { color: "#3b3f4a", fontSize: 15, lineHeight: "24px", margin: "0 0 14px" },
  muted: { color: "#7a8090", fontSize: 13, lineHeight: "20px", margin: "0 0 8px" },
  card: { backgroundColor: "#f7f7fb", border: "1px solid #e8e9f0", borderRadius: 12, padding: "16px 18px", margin: "18px 0" },
  row: { color: "#0f1118", fontSize: 14, lineHeight: "22px", margin: 0 },
  label: { color: "#7a8090", display: "inline-block", minWidth: 96 },
  button: { backgroundColor: "#8b7cff", borderRadius: 12, color: "#0f1118", display: "inline-block", fontSize: 14, fontWeight: 700, padding: "12px 20px", textDecoration: "none" },
  hr: { borderColor: "#e8e9f0", margin: "24px 0" },
  footer: { color: "#9aa0ae", fontSize: 12, lineHeight: "18px", margin: 0 },
};

export interface BookingEmailProps {
  clientName: string;
  businessName: string;
  serviceName: string;
  /** Pre-formatted in the provider's timezone, e.g. "Thursday 18 September, 10:00 - 11:30". */
  when: string;
  timezone: string;
  location: string | null;
  totalLabel: string;
  /** Amount paid online, or null when the provider collects everything on the day. */
  paidLabel: string | null;
  /** e.g. "£31.50" or null when fully paid. */
  balanceLabel: string | null;
  manageUrl: string;
  cancelNoticeHours: number;
  providerPhone?: string | null;
  /** Provider's own payment link when the deposit is collected outside GlideBook. */
  depositLink?: string | null;
}

function Details({ p }: { p: BookingEmailProps }) {
  return (
    <Section style={styles.card}>
      <Text style={styles.row}>
        <span style={styles.label}>Service</span> {p.serviceName}
      </Text>
      <Text style={styles.row}>
        <span style={styles.label}>When</span> {p.when} ({p.timezone.replace(/_/g, " ")})
      </Text>
      {p.location && (
        <Text style={styles.row}>
          <span style={styles.label}>Where</span> {p.location}
        </Text>
      )}
      {p.paidLabel ? (
        <Text style={styles.row}>
          <span style={styles.label}>{p.depositLink ? "Deposit" : "Paid"}</span> {p.paidLabel}
          {p.depositLink ? " via payment link" : ""}
          {p.balanceLabel ? ` · ${p.balanceLabel} due on the day` : ""}
        </Text>
      ) : (
        <Text style={styles.row}>
          <span style={styles.label}>To pay</span> {p.totalLabel} on the day
        </Text>
      )}
    </Section>
  );
}

function Footer() {
  return (
    <>
      <Hr style={styles.hr} />
      <Text style={styles.footer}>Sent by GlideBook on behalf of the business above. Reply to this email to reach them directly.</Text>
    </>
  );
}

export function BookingConfirmedEmail(p: BookingEmailProps) {
  const first = p.clientName.split(" ")[0];
  return (
    <Html>
      <Head />
      <Preview>{`You're booked: ${p.serviceName} with ${p.businessName}, ${p.when}`}</Preview>
      <Body style={styles.body}>
        <Container style={styles.container}>
          <Text style={styles.eyebrow}>{p.businessName}</Text>
          <Heading style={styles.h1}>You&apos;re booked, {first}.</Heading>
          <Text style={styles.p}>
            {p.depositLink
              ? `Your slot is held. Please pay the ${p.paidLabel} deposit through ${p.businessName}'s payment link to lock it in. A calendar invite is attached so it lands in your diary.`
              : "Your appointment is confirmed. A calendar invite is attached so it lands in your diary."}
          </Text>
          <Details p={p} />
          {p.depositLink && (
            <Button href={p.depositLink} style={styles.button}>
              Pay {p.paidLabel} deposit
            </Button>
          )}
          <Button href={p.manageUrl} style={p.depositLink ? { ...styles.button, marginTop: 10 } : styles.button}>
            View or manage booking
          </Button>
          <Text style={{ ...styles.muted, marginTop: 18 }}>
            {p.depositLink
              ? `Need to cancel? Do it more than ${p.cancelNoticeHours} hours before and ${p.businessName} will refund your deposit.`
              : `Need to cancel? Do it more than ${p.cancelNoticeHours} hours before and your payment is refunded automatically.`}
          </Text>
          <Footer />
        </Container>
      </Body>
    </Html>
  );
}

export function BookingReminderEmail(p: BookingEmailProps) {
  const first = p.clientName.split(" ")[0];
  return (
    <Html>
      <Head />
      <Preview>{`Reminder: ${p.serviceName} tomorrow with ${p.businessName}`}</Preview>
      <Body style={styles.body}>
        <Container style={styles.container}>
          <Text style={styles.eyebrow}>{p.businessName}</Text>
          <Heading style={styles.h1}>See you tomorrow, {first}.</Heading>
          <Text style={styles.p}>A quick reminder of your appointment.</Text>
          <Details p={p} />
          <Button href={p.manageUrl} style={styles.button}>
            View booking
          </Button>
          {p.providerPhone && <Text style={{ ...styles.muted, marginTop: 18 }}>Running late? Message {p.businessName} on {p.providerPhone}.</Text>}
          <Footer />
        </Container>
      </Body>
    </Html>
  );
}

export function BookingCancelledEmail(p: BookingEmailProps & { refunded: boolean; byProvider: boolean }) {
  const first = p.clientName.split(" ")[0];
  return (
    <Html>
      <Head />
      <Preview>{`Cancelled: ${p.serviceName} with ${p.businessName}`}</Preview>
      <Body style={styles.body}>
        <Container style={styles.container}>
          <Text style={styles.eyebrow}>{p.businessName}</Text>
          <Heading style={styles.h1}>Your booking was cancelled{p.byProvider ? ` by ${p.businessName}` : ""}, {first}.</Heading>
          <Text style={styles.p}>
            {p.refunded
              ? `Your ${p.paidLabel} payment is being refunded to the original card. It usually shows within 5-10 working days.`
              : p.paidLabel
                ? `As the cancellation was within ${p.cancelNoticeHours} hours of the appointment, the ${p.paidLabel} deposit is not refunded.`
                : "Nothing was paid online, so there is nothing to refund."}
          </Text>
          <Details p={p} />
          <Footer />
        </Container>
      </Body>
    </Html>
  );
}

export interface ProviderAlertProps {
  providerName: string;
  clientName: string;
  clientEmail: string;
  clientPhone: string | null;
  serviceName: string;
  when: string;
  location: string | null;
  serviceDetails: string | null;
  notes: string | null;
  paidLabel: string | null;
  balanceLabel: string | null;
  dashboardUrl: string;
  kind: "new" | "cancelled";
}

export function ProviderAlertEmail(p: ProviderAlertProps) {
  const first = p.providerName.split(" ")[0];
  const isNew = p.kind === "new";
  return (
    <Html>
      <Head />
      <Preview>{isNew ? `New booking: ${p.clientName}, ${p.when}` : `Cancelled: ${p.clientName}, ${p.when}`}</Preview>
      <Body style={styles.body}>
        <Container style={styles.container}>
          <Text style={styles.eyebrow}>GlideBook</Text>
          <Heading style={styles.h1}>{isNew ? `New booking, ${first}.` : `A client cancelled, ${first}.`}</Heading>
          <Section style={styles.card}>
            <Text style={styles.row}>
              <span style={styles.label}>Client</span> {p.clientName}
            </Text>
            <Text style={styles.row}>
              <span style={styles.label}>Contact</span>{" "}
              <Link href={`mailto:${p.clientEmail}`}>{p.clientEmail}</Link>
              {p.clientPhone ? ` · ${p.clientPhone}` : ""}
            </Text>
            <Text style={styles.row}>
              <span style={styles.label}>Service</span> {p.serviceName}
            </Text>
            <Text style={styles.row}>
              <span style={styles.label}>When</span> {p.when}
            </Text>
            {p.location && (
              <Text style={styles.row}>
                <span style={styles.label}>Where</span> {p.location}
              </Text>
            )}
            {p.serviceDetails && (
              <Text style={styles.row}>
                <span style={styles.label}>Details</span> {p.serviceDetails}
              </Text>
            )}
            {p.notes && (
              <Text style={styles.row}>
                <span style={styles.label}>Notes</span> {p.notes}
              </Text>
            )}
            <Text style={styles.row}>
              <span style={styles.label}>{p.paidLabel ? "Paid" : "To collect"}</span> {p.paidLabel ?? p.balanceLabel}
              {p.paidLabel && p.balanceLabel ? ` · ${p.balanceLabel} to collect on the day` : p.paidLabel ? "" : " on the day"}
            </Text>
          </Section>
          <Button href={p.dashboardUrl} style={styles.button}>
            Open dashboard
          </Button>
          <Footer />
        </Container>
      </Body>
    </Html>
  );
}
