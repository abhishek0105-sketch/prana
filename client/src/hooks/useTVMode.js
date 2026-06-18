import { useMemo, useEffect } from 'react';

// ── TV browser detection ──────────────────────────────────────
export function detectTV() {
  try {
    const ua     = navigator.userAgent || '';
    const params = new URLSearchParams(window.location.search);
    return (
      params.has('tv') ||
      // Samsung Tizen
      /Tizen|SmartTV|SMART-TV|SamsungBrowser.*TV/i.test(ua) ||
      // LG webOS
      /webOS|Web0S|LG NetCast|NetCast/i.test(ua) ||
      // HbbTV (used by many European smart TVs)
      /HbbTV/i.test(ua) ||
      // Google TV / Android TV / Chromecast
      /CrKey|GoogleTV|Android.*TV|TV Safari/i.test(ua) ||
      // Amazon Fire TV
      /AmazonWebAppPlatform|Silk.*TV/i.test(ua) ||
      // Philips, VIDAA (Hisense), other brands
      /PhilipsTV|VIDAA|BRAVIA|Viera|NetRange|Opera TV Store/i.test(ua)
    );
  } catch {
    return false;
  }
}

// ── Spatial navigation — D-pad arrow keys ────────────────────
const FOCUSABLE_SEL = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ');

function getCenter(el) {
  const r = el.getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
}

function isVisible(el) {
  const r = el.getBoundingClientRect();
  return r.width > 0 && r.height > 0;
}

function findNearest(current, direction) {
  const all = [...document.querySelectorAll(FOCUSABLE_SEL)].filter(
    el => el !== current && isVisible(el)
  );
  const cur = getCenter(current);
  let best = null, bestScore = Infinity;

  for (const el of all) {
    const c = getCenter(el);

    // Must lie in the requested direction (with a small tolerance)
    const ok =
      direction === 'up'    ? c.y < cur.y - 8 :
      direction === 'down'  ? c.y > cur.y + 8 :
      direction === 'left'  ? c.x < cur.x - 8 :
                              c.x > cur.x + 8;
    if (!ok) continue;

    // Score: primary-axis distance + cross-axis penalty (prefer straight movement)
    const dx = Math.abs(c.x - cur.x);
    const dy = Math.abs(c.y - cur.y);
    const score =
      (direction === 'up' || direction === 'down')
        ? dy + dx * 2
        : dx + dy * 2;

    if (score < bestScore) { bestScore = score; best = el; }
  }
  return best;
}

export function useSpatialNav(enabled = true) {
  useEffect(() => {
    if (!enabled) return;

    const handler = (e) => {
      // Arrow key mapping — handle both "Arrow*" and plain "*" (older TV browsers)
      const DIRS = {
        ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right',
        Up: 'up',      Down: 'down',      Left: 'left',      Right: 'right',
      };
      const dir = DIRS[e.key];

      if (dir) {
        const active = document.activeElement;
        // Don't intercept inside text inputs / textareas
        if (active?.tagName === 'INPUT' || active?.tagName === 'TEXTAREA') return;
        e.preventDefault();

        if (!active || !isVisible(active)) {
          document.querySelector(FOCUSABLE_SEL)?.focus();
          return;
        }
        findNearest(active, dir)?.focus();
        return;
      }

      // Enter / OK on remote — fire click when focused element is not naturally clickable
      if (e.key === 'Enter' || e.key === 'Return') {
        const el = document.activeElement;
        if (el && el.tagName !== 'BUTTON' && el.tagName !== 'A') el.click();
        return;
      }

      // Back button (various TV key codes)
      if (e.key === 'Escape' || e.key === 'XF86Back' || e.key === 'GoBack' || e.key === 'BrowserBack') {
        window.history.length > 1 ? window.history.back() : window.close();
        return;
      }

      // Media keys — delegate to the marked play/pause button on screen
      if (e.key === 'MediaPlayPause' || e.key === 'MediaPlay' || e.key === 'MediaPause') {
        document.querySelector('[data-tv-playpause]')?.click();
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [enabled]);
}

// ── Primary hook — use in any component to enter TV mode ──────
// force=true: always activate TV mode (e.g. on the /tv page itself)
export default function useTVMode(force = false) {
  const isTV = useMemo(() => force || detectTV(), [force]);

  useEffect(() => {
    if (isTV) {
      document.documentElement.classList.add('tv-mode');
      // Disable hover-based scroll behaviour on TV
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.documentElement.classList.remove('tv-mode');
      document.body.style.overflow = '';
    };
  }, [isTV]);

  useSpatialNav(isTV);
  return isTV;
}
