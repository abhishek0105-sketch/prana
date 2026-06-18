const webpush = require('web-push');
const db = require('./db');

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

const sendPush = async (userId, payload) => {
  if (!ready) return;
  const subs = await db.find('push_subscriptions', s => s.user_id === userId);
  if (!subs.length) return;

  await Promise.allSettled(
    subs.map(s =>
      webpush.sendNotification(s.subscription, JSON.stringify(payload))
        .catch(err => {
          if (err.statusCode === 410 || err.statusCode === 404) {
            // Fire-and-forget — expired subscription cleanup
            db.remove('push_subscriptions', sub => sub.id === s.id);
          }
        })
    )
  );
};

module.exports = { sendPush };
