import { useEffect } from 'react';
import api from '../lib/api';

// Convert a URL-safe base64 VAPID public key to a Uint8Array
function urlB64ToUint8Array(b64) {
  const padding = '='.repeat((4 - (b64.length % 4)) % 4);
  const base64  = (b64 + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw     = atob(base64);
  return Uint8Array.from([...raw].map(c => c.charCodeAt(0)));
}

/**
 * Requests push permission and registers a PushSubscription with the server.
 * Safe to call on every mount — it's idempotent and silent on failure.
 */
export default function usePushNotifications() {
  useEffect(() => {
    // Browser support check
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;

    const setup = async () => {
      try {
        // Fetch VAPID public key — if empty, server has push disabled
        const { key } = await api.get('/push/vapid-public-key');
        if (!key) return;

        const reg = await navigator.serviceWorker.ready;

        // Re-use existing subscription or create a new one
        let sub = await reg.pushManager.getSubscription();
        if (!sub) {
          sub = await reg.pushManager.subscribe({
            userVisibleOnly:      true,
            applicationServerKey: urlB64ToUint8Array(key),
          });
        }

        // Send to our backend
        await api.post('/push/subscribe', { subscription: sub.toJSON() });
      } catch (err) {
        // Permission denied, or push not supported — totally fine, just skip
        if (err.name !== 'NotAllowedError') {
          console.log('[push] setup skipped:', err.message);
        }
      }
    };

    if (Notification.permission === 'granted') {
      setup();
    } else if (Notification.permission !== 'denied') {
      // Ask once — browsers remember the answer
      Notification.requestPermission().then(perm => {
        if (perm === 'granted') setup();
      });
    }
  }, []);
}
