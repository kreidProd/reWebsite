# /roofers Funnel — Launch Runbook

Owner: Kendall. This is the checklist for taking the `/roofers` ad-destination page live and verifying it end to end. Follow it in order on launch day.

## 1. Architecture

1. Ad click lands on `/roofers` — a static page in the same Vite build as the main site, served by Cloudflare Pages.
2. Visitor completes the 3-step pre-qual form (`src/roofers/PreQualForm.jsx`).
3. **Qualified** lead (decision-maker + ad spend ≥ $3K): browser fires Meta Pixel `Lead`, and the form POSTs the lead payload to `/api/lead` (a Cloudflare Pages Function).
4. `/api/lead` (`functions/api/lead.js`) fires Meta Conversions API (CAPI) `Lead` server-side using the **same `event_id`** as the browser event (Meta dedupes them into one), and POSTs the full payload directly to the GHL inbound webhook — no Zapier in the path. GHL creates/updates the contact.
5. Qualified leads then see the Calendly embed inline; booking a slot fires Meta `Schedule` **browser + server, deduped the same way as `Lead`** — the site POSTs a `Schedule` payload tagged `Booked` to the same GHL webhook when a booking completes.
6. **Soft-DQ** (Nurture) leads skip the Pixel/CAPI `Lead` event entirely but still POST to `/api/lead`, which still forwards to the GHL webhook tagged `Nurture` — so every lead reaches GHL, but only qualified ones count as a Meta conversion.

## 2. Environment Variables

Set in Cloudflare Pages → your project → Settings → Environment variables. Do this for both the **Production** and **Preview** environments if you test on preview deploys.

| Var | Required? | Where it lives | Notes |
|---|---|---|---|
| `META_CAPI_TOKEN` | Required for CAPI | Server-side secret, dashboard only | **Never** commit this or prefix it `VITE_` — that would ship it in the public JS bundle. If it's ever exposed, rotate it in Meta Events Manager → Settings → Conversions API. |
| `ZAPIER_WEBHOOK_URL` | Required for lead delivery | Server-side secret, dashboard only | The GHL inbound webhook URL, stored in Cloudflare as `ZAPIER_WEBHOOK_URL`. **The name is stale — there is no Zapier in this path anymore.** It's kept as-is for compatibility with the code that reads it; do not "fix" it to something GHL-specific without also updating `functions/api/lead.js`. |
| `META_TEST_EVENT_CODE` | Optional, launch-day only | Server-side, dashboard | Routes CAPI events to Meta's Test Events tab instead of live reporting. **Remove after verification** (step 6.8) — leaving it set silently blackholes real conversions from Ads Manager reporting. See "the rotating test-code trap" below before you use this. |
| `META_DATASET_ID` | Optional | Server-side, dashboard | Defaults to the pixel ID `943826127904095` if unset. Meta dataset IDs and pixel IDs are the same value, so you only need to set this if you're pointing at a different pixel. |

These four are the only variables `functions/api/lead.js` reads. Confirmed by reading the source directly (`context.env.META_CAPI_TOKEN`, `context.env.ZAPIER_WEBHOOK_URL`, `context.env.META_TEST_EVENT_CODE`, `context.env.META_DATASET_ID`).

> **Wrong names — these appear in older vault docs and will silently fail:**
> - `META_CAPI_ACCESS_TOKEN` — the function reads `META_CAPI_TOKEN`. Set the wrong one and CAPI just never fires.
> - `ZAPIER_PREQUAL_HOOK_URL` — the function reads `ZAPIER_WEBHOOK_URL`. Set the wrong one and nothing reaches GHL.
> - `META_PIXEL_ID` — not read by this function at all. The pixel ID is a committed default (`943826127904095`) baked into the code, not an env var. Setting this does nothing.
>
> **Failure mode in all three cases: no error, no warning, nothing in the logs that flags it.** The function just silently skips CAPI and/or CRM delivery. The only way to catch it is the verification steps in section 6 — if Test Events shows nothing or GHL gets no contact, check the variable *names* in the Cloudflare dashboard character-for-character against the table above before assuming something else is broken.

`VITE_META_PIXEL_ID` and `VITE_CALENDLY_URL` are optional build-time overrides — the committed defaults are already the production pixel and Calendly link. `VITE_`-prefixed vars are inlined into the JS bundle at *build* time by Vite — changing one requires a redeploy (a new build), not just a save. The four server-side vars above (no `VITE_` prefix) are read live by the Pages Function on each request, so they take effect on the *next function invocation* after you save — no redeploy needed.

## 3. GHL Inbound Webhook — Lead & Booking Delivery (direct, no Zapier)

The site POSTs directly to a GHL inbound webhook (`https://services.leadconnectorhq.com/hooks/.../webhook-trigger/...`) — **there is no Zapier in this path.** `functions/api/lead.js` sends this exact JSON body for every submit (pre-qual leads, qualified or not, and completed bookings alike):

```json
{
  "fullName": "…",
  "company": "…",
  "email": "…",
  "phone": "…",
  "decisionMaker": "Yes | I share the decision | No",
  "states": "…",
  "googleAdsStatus": "Running now | Ran before, stopped | Never have",
  "adSpend": "Under $3K | $3K–$5K | $5K–$7K | $7K+",
  "drivingFactor": "…",
  "website": "",
  "event_id": "uuid",
  "tags": ["Qualified"],
  "qualified": true,
  "page": "roofers",
  "attribution": {
    "utm_source": "…",
    "utm_medium": "…",
    "utm_campaign": "…",
    "utm_content": "…",
    "utm_term": "…",
    "fbclid": "…",
    "fbp": "…",
    "fbc": "…",
    "landing_page": "…",
    "referrer": "…"
  }
}
```

> **Now includes `event_name`** (not shown above — added alongside the fields above): either `"Lead"` (pre-qual submit) or `"Schedule"` (completed booking). GHL workflows should branch on this to tell a new pre-qual submission apart from a completed booking, rather than relying on `tags` alone.

Notes on the payload:
- `tags` is `["Qualified"]`, `["Qualified","Tier2"]`, `["Nurture"]`, or `["Booked"]` for a completed booking — never empty.
- `website` is the spam honeypot field. It's always an empty string on submits that reach the webhook (a bot that fills it gets silently routed to the nurture UI and never fires this POST) — safe to ignore in your mapping.
- `attribution` keys are **omitted, not blank**, when not captured (e.g. no `fbclid` on a direct visit) — don't assume every key is present.

Suggested GHL mapping:
- **Contact fields:** `fullName` → name, `email` → email, `phone` → phone.
- **Contact tags:** map `tags[]` directly to GHL contact tags — `Qualified`, `Tier2`, `Nurture`, `Booked`.
- **Custom fields to create:** Ad Spend, Decision Maker, States, Google Ads History (`googleAdsStatus`), UTM Campaign, UTM Source, fbclid, event_id (useful for cross-referencing a lead against Meta Events Manager).
- **Pipeline:** a dedicated opportunity/pipeline with stages `New → Contacted → Booked → Won/Lost`.

Internal-only flag: **Tier2** means the lead marked $7K+ monthly ad spend. It's a prioritization signal for you — never surface it to the lead or put it in outbound copy.

## 4. Booking Sync — Calendly → GHL

With server-side `Schedule` now implemented (see §1), the site itself POSTs a `Schedule` payload tagged `Booked` to the same GHL webhook when a booking completes — so a separate Calendly → GHL integration may be redundant purely for status purposes. That said, Calendly's native GHL integration (Calendly "Invitee Created" → GHL) is still more reliable for catching bookings made **outside** the funnel (e.g. someone booking directly off a shared Calendly link rather than through `/roofers`), since those never touch `/api/lead` at all.

Two options, pick one (or run both — they're not mutually exclusive since both key off the invitee's email):
- **Site-only:** rely on the `Schedule` POST from `/api/lead`. Simpler, one less integration to maintain, but only catches bookings that go through the funnel.
- **Calendly-native integration too:** configure Calendly's "Invitee Created" trigger to update GHL directly. Catches every booking regardless of source, at the cost of a second integration to keep working.

Owner's call — this hasn't been decided yet.

## 5. Calendly Configuration Checklist

- Event type: `hello-rebootmedia/diagnostic` (the URL baked into `src/roofers/CalendlyEmbed.jsx` as the default — confirm it matches what's live in your Calendly account, or set `VITE_CALENDLY_URL` to override).
- Workflows to have configured in Calendly:
  - [ ] Booking confirmation email
  - [ ] 24-hour reminder
  - [ ] 1-hour reminder
  - [ ] No-show follow-up
- **Flag before launch:** the form's confirmation copy says *"we'll call to confirm the day before."* Someone has to actually make that call, every time, or the copy needs to change before this goes live — right now nothing in the system automates or reminds anyone to do it.

## 6. Launch-Day Verification (in order)

1. Merge PR #1 (`minimal-rewrite`), then PR #2 (`roofers-landing`). Cloudflare Pages auto-deploys on merge to the production branch.
2. Confirm both `https://rebootmedia.us/roofers` and `https://rebootmedia.us/privacy` resolve **extension-less** (no `.html` in the URL, no redirect loop).
3. Set the environment variables from section 2 in the Cloudflare dashboard, **including `META_TEST_EVENT_CODE`**, then trigger a redeploy so the `VITE_` vars (if changed) pick up.
4. Submit the form as a qualified test lead (decision-maker = Yes, ad spend ≥ $3K). In Meta Events Manager → Test Events, expect **one `Lead` event with two sources — browser and server — shown as deduplicated**. That's the pass condition; two separate undeduplicated events means the `event_id` isn't lining up. (See "deduplication looks like one row" below before you conclude the server side is broken.)
5. Check GHL: confirm a contact was created, tagged `Qualified`, with the custom fields populated.
6. Book a real Calendly test slot from the qualified flow. Confirm the `Schedule` event appears in Events Manager (browser + server, deduplicated) and the GHL contact picks up the `Booked` tag. Cancel the test booking afterward so it doesn't sit on a real calendar slot.
7. Submit a soft-DQ test (ad spend = "Under $3K"). Confirm: no Calendly booking is shown to the "lead," the GHL contact is tagged `Nurture`, and **no `Lead` event appears in Events Manager** for this submit.
8. Remove `META_TEST_EVENT_CODE` from the Cloudflare Pages environment variables. Leaving it set routes all future real conversions to Test Events instead of live reporting.
9. In Ads Manager: optimize the campaign on the `Lead` event at cold start (more volume, faster learning). Revisit switching the optimization target to `Schedule` once you're at roughly 15–20 bookings/week — that's a stronger signal once there's enough volume to support it.

### The rotating test-code trap

Meta rotates the `test_event_code` shown on the Test Events tab. If the code set in Cloudflare (`META_TEST_EVENT_CODE`) doesn't match the code the tab is currently displaying, server events still arrive at Meta — they just go to the bucket for the other code, invisible in the tab you're watching. Browser events show regardless (they don't carry a stale test code the same way), so you get a misleading "browser event showed up, server event never fired" picture when in fact the server event fired fine and landed somewhere else.

**Always copy the code fresh from the Test Events tab immediately before testing.** And remember: the code must be removed after verification (step 6.8), or real conversions get routed to the test bucket instead of live optimization data.

### Deduplication looks like ONE row

When browser and server both send the same `event_id`, Meta collapses them into a **single** Test Events row — labeled by whichever transport arrived first, usually Browser. Seeing one row is dedupe **working**, not the server event missing. Do not read "only one row" as a failure.

To confirm the server half actually fired:
- Check the Cloudflare Pages Functions real-time log for the corresponding `POST /api/lead`, or
- Events Manager → Overview → the event → **"Events received from"**, which breaks out Browser vs Server counts separately.

### Verified as of 2026-08-01

| Item | Evidence |
|---|---|
| Extension-less `/roofers` and `/privacy` routing | Confirmed in the real Cloudflare workerd runtime AND on production |
| Meta domain verified | DNS TXT record confirmed |
| Qualified submit → browser `Lead` + server CAPI `Lead` | Same `event_id`, deduplicated in Test Events |
| Disqualified submit → nurture screen | Zero `Lead` events on either transport, confirmed |
| Event Match Quality on `Lead` | 9.3/10 |
| `META_TEST_EVENT_CODE` cleared | Production events confirmed flowing — Server events visible in Events Manager → Overview |
| Lighthouse (mobile) | Performance 90, Accessibility 100 (targets were 85/95) |

**Still unverified:**
- GHL contact creation end-to-end (contact actually lands in GHL with correct fields/tags from a real submit)
- `Schedule` reporting Browser + Server counts in Events Manager → Overview after a real booking

## 7. Known Limitations & Future Work

- **Calendly prefill is positional, not named:** `customAnswers.a1` in `src/roofers/CalendlyEmbed.jsx` maps to whatever is currently the event's **first** custom question — right now that's "Company Name" on `hello-rebootmedia/diagnostic`. Reordering or adding questions in the Calendly dashboard silently breaks the prefill (this already happened once: phone ended up landing in the Company Name field). Anyone changing Calendly questions on this event must check `src/roofers/CalendlyEmbed.jsx` afterward.
- **Motion polish:** the "framer-feel" interaction polish was deliberately deferred for this launch — functional over animated.
- **Privacy policy:** `public/privacy.html` is a draft. The owner (Kendall) needs to actually read and sign off on it before it's representing the business live.
- **Guarantee copy:** on-page claims — "20 qualified appointments in 90 days," "5 roofers per cohort," "free month" — must match the actual contract terms before any ad spend goes live against this page. If the contract changes, this copy has to change with it.
