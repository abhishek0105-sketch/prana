import { useNavigate } from 'react-router-dom';

const LAST_UPDATED = 'June 2026';
const CONTACT_EMAIL = 'abhishek0105@gmail.com';
const APP_URL = 'https://clink-social.vercel.app';

export default function Privacy() {
  const nav = useNavigate();
  return (
    <div style={wrap}>
      <div style={inner}>
        <button onClick={() => nav(-1)} style={backBtn}>← Back</button>
        <h1 style={h1}>Privacy Policy</h1>
        <p style={meta}>Last updated: {LAST_UPDATED}</p>

        <Section title="Who we are">
          CLINK ("we", "us", "our") is a social hangout app that lets friends video-call,
          share moments, and send each other a round — no matter where life has taken them.
          Our app is available at <a href={APP_URL} style={link}>{APP_URL}</a>.
          For any privacy questions, email us at{' '}
          <a href={`mailto:${CONTACT_EMAIL}`} style={link}>{CONTACT_EMAIL}</a>.
        </Section>

        <Section title="What we collect">
          <b style={bold}>Account information:</b> When you sign up, we collect your name,
          email address, and a hashed (encrypted) password. We never store your password
          in plain text.
          <br /><br />
          <b style={bold}>Profile data:</b> Your city and an avatar colour you choose. Nothing else.
          <br /><br />
          <b style={bold}>Hangout activity:</b> We record when hangouts start and end, and who
          participated. Video and audio streams are peer-to-peer (WebRTC) and are never
          recorded or stored on our servers.
          <br /><br />
          <b style={bold}>Messages:</b> In-hangout chat messages are stored so you can revisit
          memories. You can delete your account to remove them.
          <br /><br />
          <b style={bold}>Payment data:</b> When you send a round, the transaction goes through
          Stripe. We store the amount, sender, and receiver — but we never see or store your
          card number, bank details, or full payment information. Stripe handles that directly
          under their own privacy policy.
          <br /><br />
          <b style={bold}>Push notification tokens:</b> If you opt in to push notifications, we
          store a subscription token to send you hangout invites and reminders. You can revoke
          this at any time in your browser settings.
          <br /><br />
          <b style={bold}>Device/usage data:</b> We do not run analytics or ad-tracking software.
          We collect no third-party cookies, no fingerprinting, and no behavioural profiles.
        </Section>

        <Section title="How we use it">
          We use the data we collect only to operate CLINK:
          <ul style={ul}>
            <li>To create and manage your account</li>
            <li>To connect you with friends for hangouts</li>
            <li>To send you hangout invitations and optional reminders (push notifications)</li>
            <li>To process "send a round" payments between friends via Stripe</li>
            <li>To send password-reset emails via Resend</li>
          </ul>
          We do not sell your data. We do not use your data for advertising. We will never
          share your data with any third party except the service providers listed below.
        </Section>

        <Section title="Third-party services">
          <b style={bold}>Stripe</b> — processes payments between users. Stripe is PCI-DSS
          Level 1 certified. See{' '}
          <a href="https://stripe.com/privacy" style={link}>stripe.com/privacy</a>.
          <br /><br />
          <b style={bold}>Resend</b> — sends transactional emails (password reset only).
          See{' '}
          <a href="https://resend.com/legal/privacy-policy" style={link}>resend.com/legal/privacy-policy</a>.
          <br /><br />
          <b style={bold}>Railway</b> — hosts our backend server and database in the cloud.
          Data is stored in the United States.
          <br /><br />
          <b style={bold}>Vercel</b> — hosts our frontend. No personal data passes through Vercel.
        </Section>

        <Section title="Data retention">
          We keep your account data for as long as you have an account. If you delete your
          account, we delete your profile, messages, and hangout history within 30 days.
          Payment transaction records may be retained for up to 7 years for financial
          compliance purposes.
        </Section>

        <Section title="Your rights">
          You have the right to access, correct, or delete your personal data at any time.
          Email us at{' '}
          <a href={`mailto:${CONTACT_EMAIL}`} style={link}>{CONTACT_EMAIL}</a> and we will
          respond within 30 days. If you are in the EU or UK, you also have the right to
          data portability and to lodge a complaint with your local supervisory authority.
        </Section>

        <Section title="Children">
          CLINK is intended for users aged 18 and over. We do not knowingly collect personal
          information from anyone under 18. If you believe a minor has created an account,
          please contact us and we will delete it promptly.
        </Section>

        <Section title="Changes to this policy">
          If we make material changes to this policy, we will notify users by email or via
          an in-app notice at least 14 days before the change takes effect. Continued use of
          CLINK after that date means you accept the updated policy.
        </Section>

        <Section title="Contact">
          Questions? Email us at{' '}
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
