const cron       = require('node-cron');
const db         = require('./db');
const { sendPush } = require('./pushService');

// Runs every Friday at 18:00 server time.
// Sends a push to users who haven't started or been in a hangout in the last 7 days.
function startWeeklyReminder() {
  cron.schedule('0 18 * * 5', async () => {
    console.log('[reminder] Running weekly hangout nudge…');
    try {
      const users    = await db.find('users',    () => true);
      const hangouts = await db.find('hangouts', () => true);
      const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;

      let sent = 0;
      for (const user of users) {
        const recentHangout = hangouts.find(h =>
          h.created_at > sevenDaysAgo &&
          (h.initiator_id === user.id || h.partner_id === user.id ||
           (h.guest_ids || []).includes(user.id))
        );
        if (!recentHangout) {
          await sendPush(user.id, {
            title: "It's been a while 🥂",
            body:  'Your crew misses you — start a hangout tonight!',
            icon:  '/icon-192.png',
            tag:   'weekly-nudge',
            url:   '/home',
          });
          sent++;
        }
      }
      console.log(`[reminder] Weekly nudge sent to ${sent} users`);
    } catch (err) {
      console.error('[reminder] Weekly nudge error:', err.message);
    }
  });

  console.log('[reminder] Weekly hangout nudge scheduled (Fridays 18:00)');
}

module.exports = { startWeeklyReminder };
