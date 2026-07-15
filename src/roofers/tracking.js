// Tracking utilities for the /roofers ad-destination landing page.
//
// - initPixel() loads the Meta Pixel and fires PageView.
// - trackLead() / trackSchedule() fire Meta standard events with a
//   client-generated event_id so a future server-side CAPI integration
//   can dedupe against these browser-side events.
// - postLead() forwards the raw lead payload to a Zapier webhook.
//
// All three network-touching functions no-op gracefully when their
// required env var is unset (dev, or before the vars are configured in
// the Cloudflare Pages dashboard) — none of them may throw or block render.

let pixelInitialized = false

/**
 * Load the Meta Pixel base code and fire an initial PageView.
 * Safe to call multiple times — only initializes once.
 * No-ops silently if VITE_META_PIXEL_ID is not set.
 */
export function initPixel() {
  if (pixelInitialized) return
  if (typeof window === 'undefined') return

  const pixelId = import.meta.env.VITE_META_PIXEL_ID
  if (!pixelId) return

  try {
    /* eslint-disable */
    ;(function (f, b, e, v, n, t, s) {
      if (f.fbq) return
      n = f.fbq = function () {
        n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments)
      }
      if (!f._fbq) f._fbq = n
      n.push = n
      n.loaded = true
      n.version = '2.0'
      n.queue = []
      t = b.createElement(e)
      t.async = true
      t.src = v
      s = b.getElementsByTagName(e)[0]
      s.parentNode.insertBefore(t, s)
    })(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js')
    /* eslint-enable */

    window.fbq('init', pixelId)
    window.fbq('track', 'PageView')
    pixelInitialized = true
  } catch (err) {
    // Never let tracking setup break the page.
    console.error('[tracking] initPixel failed', err)
  }
}

/**
 * Generate a fresh event id. Call this ONCE per submit and reuse the
 * same value for both trackLead/trackSchedule and postLead so CAPI
 * dedupe (added later) lines up with the browser-side pixel event.
 */
export function newEventId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  // Fallback for environments without crypto.randomUUID.
  return `evt_${Date.now()}_${Math.random().toString(36).slice(2)}`
}

/**
 * Fire the Meta "Lead" standard event for a qualified pre-qual pass.
 */
export function trackLead(eventId) {
  if (typeof window === 'undefined' || typeof window.fbq !== 'function') return
  try {
    window.fbq('track', 'Lead', { content_name: 'roofer_prequal' }, { eventID: eventId })
  } catch (err) {
    console.error('[tracking] trackLead failed', err)
  }
}

/**
 * Fire the Meta "Schedule" standard event when a Calendly booking completes.
 */
export function trackSchedule(eventId) {
  if (typeof window === 'undefined' || typeof window.fbq !== 'function') return
  try {
    window.fbq('track', 'Schedule', {}, { eventID: eventId })
  } catch (err) {
    console.error('[tracking] trackSchedule failed', err)
  }
}

/**
 * Fire-and-forget POST of the lead payload to the Zapier webhook.
 * No-ops if VITE_ZAPIER_WEBHOOK_URL is unset. Never throws, never
 * blocks the UI — a webhook failure must not break the booking flow.
 */
export function postLead(payload) {
  const webhookUrl = import.meta.env.VITE_ZAPIER_WEBHOOK_URL
  if (!webhookUrl) return

  try {
    fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }).catch((err) => {
      console.error('[tracking] postLead network error', err)
    })
  } catch (err) {
    console.error('[tracking] postLead failed', err)
  }
}
