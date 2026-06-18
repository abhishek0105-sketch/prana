const webpush = require('web-push');
const db = require('./db');

// Initialise VAPID — safe to call even before the env vars are set
// (push is silently skipped if keys are missing)
let ready = false;
if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    process.env.VAPID_CONTACT || 'mailto:hello@clink.app',
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
  ready = true;
  console.log('[push] VAPID configured ✅');
} else {
  console.log('[push] VAPID keys not set — push notifications disabled');
}

/**
 * Send a push notification to a user (all their subscribed devices).
 * payload: { title, body, icon?, tag?, url? }
 */
const sendPush = async (userId, payload) => {
  if (!ready) return;
  const subs = db.find('push_subscriptions', s => s.user_id === userId);
  if (!subs.length) return;

  await Promise.allSettled(
    subs.map(s =>
      webpush.sendNotification(s.subscription, JSON.stringify(payload))
        .catch(err => {
          // 410 Gone = subscription expired / revoked — prune it
          if (err.statusCode === 410 || err.statusCode === 404) {
            db.remove('push_subscriptions', sub => sub.id === s.id);
          }
        })
    )
  );
};

module.exports = { sendPush };
