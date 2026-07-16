# /roofers Funnel — Launch Runbook

Owner: Kendall. This is the checklist for taking the `/roofers` ad-destination page live and verifying it end to end. Follow it in order on launch day.

## 1. Architecture

1. Ad click lands on `/roofers` — a static page in the same Vite build as the main site, served by Cloudflare Pages.
2. Visitor completes the 3-step pre-qual form (`src/roofers/PreQualForm.jsx`).
3. **Qualified** lead (decision-maker + ad spend ≥ $3K): browser fires Meta Pixel `Lead`, and the form POSTs the lead payload to `/api/lead` (a Cloudflare Pages Function).
4. `/api/lead` (`functions/api/lead.js`) fires Meta Conversions API (CAPI) `Lead` server-side using the **same `event_id`** as the browser event (Meta dedupes them into one), and forwards the full payload to the Zapier webhook, which creates a ClickUp task.
5. Qualified leads then see the Calendly embed inline; booking a slot fires Meta `Schedule` (browser-only) and a separate Zapier Zap syncs the booking into ClickUp.
6. **Soft-DQ** (Nurture) leads skip the Pixel/CAPI `Lead` event entirely but still POST to `/api/lead`, which still forwards to Zapier tagged `Nurture` — so every lead reaches ClickUp, but only qualified ones count as a Meta conversion.

## 2. Environment Variables

Set in Cloudflare Pages → your project → Settings → Environment variables. Do this for both the **Production** and **Preview** environments if you test on preview deploys.

| Var | Required? | Where it lives | Notes |
|---|---|---|---|
| `META_CAPI_TOKEN` | Required for CAPI | Server-side secret, dashboard only | **Never** commit this or prefix it `VITE_` — that would ship it in the public JS bundle. If it's ever exposed, rotate it in Meta Events Manager → Settings → Conversions API. |
| `ZAPIER_WEBHOOK_URL` | Required for lead delivery | Server-side secret, dashboard only | The Zapier "Catch Hook" URL for Zap #1 (below). |
| `META_TEST_EVENT_CODE` | Optional, launch-day only | Server-side, dashboard | Routes CAPI events to Meta's Test Events tab instead of live reporting. **Remove after verification** (step 6.8) — leaving it set silently blackholes real conversions from Ads Manager reporting. |
| `META_DATASET_ID` | Optional | Server-side, dashboard | Defaults to the pixel ID `943826127904095` if unset. Meta dataset IDs and pixel IDs are the same value, so you only need to set this if you're pointing at a different pixel. |
| `VITE_META_PIXEL_ID` / `VITE_CALENDLY_URL` | Optional overrides | Build-time | The committed defaults are already the production pixel and Calendly link. Only set these if you need to point at a different pixel or Calendly event without touching code. |

**Critical timing note:** `VITE_`-prefixed vars are inlined into the JS bundle at *build* time by Vite — changing one requires a redeploy (a new build), not just a save. Server-side vars (no `VITE_` prefix) are read live by the Pages Function on each request, so they take effect on the *next function invocation* after you save — no redeploy needed.

## 3. Zapier Zap #1 — Lead Intake (Catch Hook → ClickUp Create Task)

Trigger: Catch Hook, URL = your `ZAPIER_WEBHOOK_URL`. `functions/api/lead.js` POSTs this exact JSON body for every submit, qualified or not:

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

Notes on the payload:
- `tags` is `["Qualified"]`, `["Qualified","Tier2"]`, or `["Nurture"]` — never empty.
- `website` is the spam honeypot field. It's always an empty string on submits that reach Zapier (a bot that fills it gets silently routed to the nurture UI and never fires this POST) — safe to ignore in your mapping.
- `attribution` keys are **omitted, not blank**, when not captured (e.g. no `fbclid` on a direct visit) — don't assume every key is present.

Suggested ClickUp mapping:
- **Task name:** `{{fullName}} — {{company}}`
- **Description:** assemble from `drivingFactor` (what's driving them to look now), the qualifiers (`decisionMaker`, `states`, `googleAdsStatus`, `adSpend`), and the attribution block.
- **Tags:** map `tags[]` directly to ClickUp tags.
- **Custom fields to create:** Email, Phone, Ad Spend, Decision Maker, States, Google Ads History, UTM Campaign, UTM Source, fbclid, event_id (useful for cross-referencing a lead against Meta Events Manager).
- **List:** a dedicated "Roofer Leads" list with statuses `New → Contacted → Booked → Won/Lost`.

Internal-only flag: **Tier2** means the lead marked $7K+ monthly ad spend. It's a prioritization signal for you — never surface it to the lead or put it in outbound copy.

## 4. Zapier Zap #2 — Booking Sync (Calendly "Invitee Created" → ClickUp)

Trigger: Calendly "Invitee Created" (native Calendly trigger — Calendly has no direct ClickUp integration, which is why this runs through Zapier instead of a webhook from the site).

Action: find the ClickUp task by the invitee's email (created by Zap #1); if no match is found, create one. Then:
- Move the task's status to **Booked**.
- Attach the scheduled event time (and ideally the Calendly event URL) to the task, e.g. as a comment or a custom field.

This Zap is independent of the site — booking status only ever flows Calendly → Zapier → ClickUp, never through `/api/lead`.

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
4. Submit the form as a qualified test lead (decision-maker = Yes, ad spend ≥ $3K). In Meta Events Manager → Test Events, expect **one `Lead` event with two sources — browser and server — shown as deduplicated**. That's the pass condition; two separate undeduplicated events means the `event_id` isn't lining up.
5. Check ClickUp: confirm a task was created, tagged `Qualified`, with the attribution custom fields populated.
6. Book a real Calendly test slot from the qualified flow. Confirm the `Schedule` event appears in Events Manager and the ClickUp task flips to **Booked**. Cancel the test booking afterward so it doesn't sit on a real calendar slot.
7. Submit a soft-DQ test (ad spend = "Under $3K"). Confirm: no Calendly booking is shown to the "lead," the ClickUp task is tagged `Nurture`, and **no `Lead` event appears in Events Manager** for this submit.
8. Remove `META_TEST_EVENT_CODE` from the Cloudflare Pages environment variables. Leaving it set routes all future real conversions to Test Events instead of live reporting.
9. In Ads Manager: optimize the campaign on the `Lead` event at cold start (more volume, faster learning). Revisit switching the optimization target to `Schedule` once you're at roughly 15–20 bookings/week — that's a stronger signal once there's enough volume to support it.

## 7. Known Limitations & Future Work

- **Booking status source of truth:** booking state (Booked/not) reaches ClickUp only via Calendly → Zapier (Zap #2), never directly from the site. If that Zap breaks, ClickUp statuses silently stop updating even though bookings still happen.
- **Lighthouse:** not formally measured as of this writing. Worth a pass before spend ramps.
- **Motion polish:** the "framer-feel" interaction polish was deliberately deferred for this launch — functional over animated.
- **Privacy policy:** `public/privacy.html` is a draft. The owner (Kendall) needs to actually read and sign off on it before it's representing the business live.
- **Guarantee copy:** on-page claims — "20 qualified appointments in 90 days," "5 roofers per cohort," "free month" — must match the actual contract terms before any ad spend goes live against this page. If the contract changes, this copy has to change with it.
