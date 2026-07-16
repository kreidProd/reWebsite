// Cloudflare Pages Function — POST /api/lead
//
// Same-origin endpoint the /roofers pre-qual form posts to instead of
// hitting a client-visible webhook URL directly. On each submit it:
//
//   1. Fires the Meta Conversions API (CAPI) "Lead" event server-side —
//      only for qualified leads — using the SAME event_id the browser
//      pixel used, so Meta dedupes the browser + server events into one.
//   2. Forwards the full lead payload to Zapier (both Qualified and
//      Nurture leads), server-side, so the webhook URL never ships in
//      the public JS bundle.
//
// All secrets (META_CAPI_TOKEN, META_DATASET_ID, META_TEST_EVENT_CODE,
// ZAPIER_WEBHOOK_URL) are read from context.env — set them in the
// Cloudflare Pages dashboard (Settings → Environment variables), never
// commit them. The dataset ID default below ('943826127904095') is the
// public Meta pixel ID, not a secret — Meta dataset IDs equal pixel IDs.

const DEFAULT_DATASET_ID = '943826127904095'
const CAPI_VERSION = 'v21.0'

/**
 * Trim + lowercase an email address per Meta's CAPI hashing spec.
 */
export function normalizeEmail(email) {
  return String(email ?? '').trim().toLowerCase()
}

/**
 * Strip a phone number down to digits only and, for a bare 10-digit US
 * number, prepend the '1' country code (E.164 without the leading '+',
 * per Meta's CAPI spec).
 */
export function normalizePhone(phone) {
  const digits = String(phone ?? '').replace(/\D/g, '')
  if (digits.length === 10) return `1${digits}`
  return digits
}

/**
 * SHA-256 hash a string and return lowercase hex, using WebCrypto
 * (available in the Cloudflare Workers/Pages Functions runtime).
 */
export async function sha256hex(input) {
  const bytes = new TextEncoder().encode(String(input ?? ''))
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

/**
 * Build and send the Meta Conversions API "Lead" event for a qualified
 * lead. Never throws — logs and resolves on failure so it can safely
 * run inside Promise.allSettled without surfacing an unhandled path.
 */
async function sendCapiEvent(payload, context) {
  const { env, request } = context
  const token = env.META_CAPI_TOKEN
  if (!token) {
    console.error('[lead] META_CAPI_TOKEN unset — skipping CAPI event')
    return
  }

  const datasetId = env.META_DATASET_ID || DEFAULT_DATASET_ID
  const attribution = payload.attribution || {}

  const userData = {
    em: [await sha256hex(normalizeEmail(payload.email))],
    ph: [await sha256hex(normalizePhone(payload.phone))],
    client_ip_address: request.headers.get('CF-Connecting-IP'),
    client_user_agent: request.headers.get('User-Agent'),
  }
  if (attribution.fbp) userData.fbp = attribution.fbp
  if (attribution.fbc) userData.fbc = attribution.fbc

  const body = {
    data: [
      {
        event_name: 'Lead',
        event_time: Math.floor(Date.now() / 1000),
        event_id: payload.event_id,
        action_source: 'website',
        event_source_url: `https://rebootmedia.us${attribution.landing_page || '/roofers'}`,
        user_data: userData,
        custom_data: { content_name: 'roofer_prequal' },
      },
    ],
    access_token: token,
    ...(env.META_TEST_EVENT_CODE ? { test_event_code: env.META_TEST_EVENT_CODE } : {}),
  }

  try {
    const res = await fetch(`https://graph.facebook.com/${CAPI_VERSION}/${datasetId}/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    if (!res.ok) {
      const responseText = await res.text().catch(() => '<unreadable response body>')
      console.error('[lead] CAPI event rejected', res.status, responseText)
    }
  } catch (err) {
    console.error('[lead] CAPI request failed', err)
  }
}

/**
 * Forward the raw lead payload to Zapier, unchanged. Skips silently if
 * ZAPIER_WEBHOOK_URL isn't configured. Never throws.
 */
async function forwardToZapier(payload, context) {
  const webhookUrl = context.env.ZAPIER_WEBHOOK_URL
  if (!webhookUrl) return

  try {
    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    if (!res.ok) {
      const responseText = await res.text().catch(() => '<unreadable response body>')
      console.error('[lead] Zapier forward rejected', res.status, responseText)
    }
  } catch (err) {
    console.error('[lead] Zapier forward failed', err)
  }
}

export async function onRequestPost(context) {
  let payload
  try {
    payload = await context.request.json()
  } catch (err) {
    return new Response(JSON.stringify({ ok: false, error: 'invalid JSON body' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  if (!payload || typeof payload.event_id !== 'string' || !payload.event_id) {
    return new Response(JSON.stringify({ ok: false, error: 'event_id is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const tasks = []
  if (payload.qualified === true) {
    tasks.push(sendCapiEvent(payload, context))
  }
  tasks.push(forwardToZapier(payload, context))

  context.waitUntil(Promise.allSettled(tasks))

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
}
