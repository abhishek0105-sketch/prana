import { useNavigate } from 'react-router-dom';

const LAST_UPDATED = 'June 2026';
const CONTACT_EMAIL = 'abhishek0105@gmail.com';

export default function Terms() {
  const nav = useNavigate();
  return (
    <div style={wrap}>
      <div style={inner}>
        <button onClick={() => nav(-1)} style={backBtn}>← Back</button>
        <h1 style={h1}>Terms of Service</h1>
        <p style={meta}>Last updated: {LAST_UPDATED}</p>

        <Section title="Agreement">
          By creating a CLINK account or using our app, you agree to these Terms of Service.
          If you do not agree, do not use CLINK. We may update these terms from time to time —
          we'll notify you by email if we make material changes.
        </Section>

        <Section title="Eligibility">
          You must be at least <b style={bold}>18 years old</b> to use CLINK. By signing up,
          you confirm you meet this age requirement. CLINK contains references to alcohol
          (toasting, "send a round") and is not intended for minors.
        </Section>

        <Section title="Your account">
          You are responsible for keeping your account credentials secure. Do not share your
          password. You are responsible for all activity that occurs under your account. If
          you believe your account has been compromised, contact us immediately at{' '}
          <a href={`mailto:${CONTACT_EMAIL}`} style={link}>{CONTACT_EMAIL}</a>.
        </Section>

        <Section title="Acceptable use">
          You agree not to use CLINK to:
          <ul style={ul}>
            <li>Harass, threaten, or harm other users</li>
            <li>Share illegal content during video calls or in messages</li>
            <li>Impersonate another person</li>
            <li>Attempt to access other users' accounts or our servers without authorisation</li>
            <li>Use the app for any commercial purpose without our written consent</li>
            <li>Scrape, reverse-engineer, or reproduce any part of the app</li>
          </ul>
          We reserve the right to suspend or terminate accounts that violate these rules,
          at our sole discretion, with or without notice.
        </Section>

        <Section title="Video calls and content">
          Video and audio during hangouts are transmitted directly between participants
          (peer-to-peer) and are not recorded or stored by CLINK. You are responsible for
          what you share during a call. In-hangout chat messages are stored and visible to
          all participants in that hangout.
        </Section>

        <Section title="Payments — send a round">
          CLINK allows users to send peer-to-peer payments ("send a round") to friends
          during hangouts via Stripe. These payments are voluntary, non-refundable gifts
          between users — not purchases of digital goods or services.
          <br /><br />
          By making a payment you agree to Stripe's{' '}
          <a href="https://stripe.com/legal" style={link}>Terms of Service</a>. CLINK is
          not a bank or money transmitter. We do not hold, transmit, or escrow funds — all
          transactions are processed directly by Stripe.
          <br /><br />
          Payments are final. If you believe a transaction was made in error or fraudulently,
          contact us at{' '}
          <a href={`mailto:${CONTACT_EMAIL}`} style={link}>{CONTACT_EMAIL}</a> and we will
          do our best to assist, but we cannot guarantee a refund.
        </Section>

        <Section title="Intellectual property">
          The CLINK name, logo, and app design are our property. You may not use them without
          our written permission. Content you create (messages, profile info) remains yours —
          you grant us a limited licence to display it within the app to provide the service.
        </Section>

        <Section title="Disclaimers">
          CLINK is provided "as is" without warranty of any kind. We do not guarantee that
          the app will be available at all times, error-free, or secure. Video calls depend
          on your internet connection and device — we are not responsible for call quality
          or dropped connections.
        </Section>

        <Section title="Limitation of liability">
          To the maximum extent permitted by law, CLINK and its founders will not be liable
          for any indirect, incidental, or consequential damages arising from your use of
          the app, including but not limited to lost data, failed payments, or interruption
          of service. Our total liability to you for any claim will not exceed the amount
          you paid us in the 12 months preceding the claim (or $10, whichever is greater).
        </Section>

        <Section title="Governing law">
          These terms are governed by the laws of India. Any disputes arising from these
          terms or your use of CLINK will be subject to the exclusive jurisdiction of the
          courts of India.
        </Section>

        <Section title="Contact">
          Questions about these terms? Email us at{' '}
          <a href={`mailto:${CONTACT_EMAIL}`} style={link}>{CONTACT_EMAIL}</a>.
          We aim to respond within 2 business days.
        </Section>

        <div style={{ height: 48 }} />
      </div>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div style={{ marginBottom: 28 }}>
      <h2 style={h2}>{title}</h2>
      <p style={body}>{children}</p>
    </div>
  );
}

const wrap = {
  width: '100%', minHeight: '100dvh', background: '#020C18',
  display: 'flex', justifyContent: 'center',
  padding: '0 0 40px', boxSizing: 'border-box',
};
const inner = {
  width: '100%', maxWidth: 600, padding: '24px 24px 0',
  boxSizing: 'border-box',
};
const h1 = {
  fontFamily: '"Outfit","Inter",sans-serif', fontWeight: 900,
  fontSize: 'clamp(1.6rem,6vw,2rem)', color: '#fff', margin: '0 0 4px',
};
const h2 = {
  fontFamily: '"Outfit","Inter",sans-serif', fontWeight: 700,
  fontSize: '1rem', color: '#00B4FF', margin: '0 0 8px',
};
const meta = {
  color: 'rgba(255,255,255,0.3)', fontSize: '0.8rem',
  margin: '0 0 32px', fontFamily: '"Inter",sans-serif',
};
const body = {
  color: 'rgba(255,255,255,0.65)', fontSize: '0.9rem',
  lineHeight: 1.75, margin: 0, fontFamily: '"Inter",sans-serif',
};
const bold = { color: 'rgba(255,255,255,0.85)', fontWeight: 600 };
const ul = { margin: '8px 0 0 20px', padding: 0 };
const link = { color: '#00B4FF', textDecoration: 'none' };
const backBtn = {
  background: 'none', border: 'none', color: 'rgba(255,255,255,0.35)',
  fontSize: '0.85rem', cursor: 'pointer', padding: '0 0 16px',
  fontFamily: '"Inter",sans-serif',
};
