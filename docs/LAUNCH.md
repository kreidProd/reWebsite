# /roofers Funnel — Launch Runbook

Owner: Kendall. This is the checklist for taking the `/roofers` ad-destination page live and verifying it end to end. Follow it in order on launch day.

## 1. Architecture

1. Ad click lands on `/roofers` — a static page in the same Vite build as the main site, served by Cloudflare Pages.
2. Visitor completes the 3-step pre-qual form (`src/roofers/PreQualForm.jsx`).
3. **Qualified** lead (decision-maker — see §3.1): browser fires Meta Pixel `Lead`, and the form POSTs the lead payload to `/api/lead` (a Cloudflare Pages Function).
4. `/api/lead` (`functions/api/lead.js`) fires Meta Conversions API (CAPI) `Lead` server-side using the **same `event_id`** as the browser event (Meta dedupes them into one), and POSTs the full payload directly to the GHL inbound webhook — no Zapier in the path. GHL creates/updates the contact.
5. Qualified leads then see the Calendly embed inline; booking a slot fires Meta `Schedule` **browser + server, deduped the same way as `Lead`**. The `Schedule` payload is **not** forwarded to GHL — booking delivery is owned by Workflow #2 (Calendly → GHL). See §4.
6. **Soft-DQ** (Nurture) leads — non-decision-makers only — skip the Pixel/CAPI `Lead` event entirely but still POST to `/api/lead`, which still forwards to the GHL webhook tagged `Nurture` — so every lead reaches GHL, but only qualified ones count as a Meta conversion.

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
  "city": "Tyler",
  "googleAdsStatus": "Running now | Ran before, stopped | Never have",
  "adSpend": "Under $3K | $3K–$5K | $5K–$7K | $7K+",
  "drivingFactor": "…",
  "referral_code": "",
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
- `tags` is `["Qualified"]`, `["Qualified","Tier2"]`, `["Qualified","LowBudget"]`, `["Nurture"]`, or `["Booked"]` for a completed booking — never empty.
- `city` is a free-text string (`"Tyler"`) — the single city the roofer operates out of. It replaced the earlier `states` multi-select, so map it to GHL's **native City contact field**, not to the old `States` custom field.
- `referral_code` is the spam honeypot field, and `spam` is the boolean saying whether it was tripped. See §3.2 — a trip **flags** a submit, it no longer blocks it. Both are safe to ignore in your field mapping; the `SpamSuspect` tag is the part you act on.
- `attribution` keys are **omitted, not blank**, when not captured (e.g. no `fbclid` on a direct visit) — don't assume every key is present.

Suggested GHL mapping:
- **Contact fields:** `fullName` → name, `email` → email, `phone` → phone.
- **Contact tags:** map `tags[]` directly to GHL contact tags — `Qualified`, `Tier2`, `LowBudget`, `Nurture`, `Booked`.
- **Custom fields to create:** Ad Spend, Decision Maker, Google Ads History (`googleAdsStatus`), UTM Campaign, UTM Source, fbclid, event_id (useful for cross-referencing a lead against Meta Events Manager). `city` maps to GHL's native City field — no custom field needed.
- **Pipeline:** a dedicated opportunity/pipeline with stages `New → Contacted → Booked → Won/Lost`.

Internal-only flags: **Tier2** means the lead marked $7K+ monthly ad spend; **LowBudget** means they marked Under $3K. Both are prioritization signals for you — never surface either to the lead or put them in outbound copy.

### 3.1 Qualification rules

**Authority is the only gate.** A lead is `Qualified` — fires Meta `Lead`, sees the Calendly embed, can book — if and only if they answer anything other than **"No"** to "Are you the owner / decision-maker?" (`Yes` and `I share the decision` both pass).

**Budget does not disqualify.** A roofer who picks "Under $3K" still books a call. They're tagged `LowBudget` so you know what you're walking into before you dial, but the funnel doesn't stop them. Only a non-decision-maker gets routed to the `Nurture` branch.

Two consequences worth knowing:

1. **The Meta `Lead` event now covers a broader audience.** Because sub-$3K leads fire `Lead`, the campaign optimizes toward finding more of them too. If cost-per-booked-call drifts up or the mix skews small, that's the mechanism — the fix is Ads Manager targeting or switching the optimization event to `Schedule`, not re-adding a budget gate to the form.
2. **`Nurture` volume will drop sharply**, since only non-decision-makers land there now. A near-empty Nurture segment is expected, not a broken form.

Changing any of this means editing the qualify block in `src/roofers/PreQualForm.jsx` (`handleSubmitStep`) — it's the single source of truth for who qualifies.

### 3.2 The spam honeypot flags, it does not block

The form carries a hidden `referral_code` field that real users never see. If it comes back filled, the submit is probably a bot.

**A trip flags the submit and lets it through.** The lead is tagged `SpamSuspect`, `spam: true` rides along in the payload, and the Meta conversion event is withheld — browser pixel and CAPI both. Everything else proceeds normally: they reach the CRM, and if they qualified they can still book.

**Why it doesn't block.** It used to. A trip routed the person to the nurture screen and fired *nothing* — no webhook POST, no pixel, no log line anywhere. That makes a false positive invisible and unrecoverable: a real roofer is told they aren't eligible, and there is no record they ever tried. You cannot tell "no bots this week" apart from "silently turning away customers," which is the worst property a filter can have.

That wasn't hypothetical. The field used to be named `website`, and password managers and browser autofill routinely ignore `autocomplete="off"` on a field with that name — filling it with a URL and misfiring the honeypot on a genuine visitor. It's now named `referral_code`, which no autofill heuristic targets, while a naive bot filling every input still trips it.

**What to do with `SpamSuspect` in GHL:** don't auto-delete. Route it to a review list. If real people keep landing there, the honeypot is still misfiring and the name needs to change again — and you'll be able to *see* that now, which is the entire point.

The trade accepted here: a bot could in principle reach the Calendly embed. It would still have to complete Calendly's own booking flow, and a junk booking is visible and cancellable. A silently rejected qualified roofer is neither.

## 4. Booking Sync — Calendly → GHL

**Decided: bookings reach GHL only via Calendly's native integration (Workflow #2 — Calendly "Invitee Created" → GHL).** `/api/lead` deliberately does **not** forward `Schedule` payloads to the webhook.

> **Why — this caused real data loss.** A `Schedule` payload carries only booking data (name, email, phone). Forwarding it re-triggered Workflow #1's *Create contact* with a body missing `decisionMaker`, `adSpend`, `city`, `googleAdsStatus`, and `drivingFactor` — **wiping those fields on a contact that already had them**. It hit only leads who booked (the best ones), and silently. `forwardToZapier` in `functions/api/lead.js` now returns early unless the resolved event name is `Lead`.

Meta still receives the booking: the CAPI `Schedule` event fires independently of CRM forwarding, deduped against the browser pixel. Only the redundant CRM write was removed.

Calendly-native is also the more complete path regardless — it catches bookings made **outside** the funnel (someone using a shared Calendly link directly), which never touch `/api/lead` at all.

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
4. Submit the form as a qualified test lead (decision-maker = Yes; any ad spend, any city). In Meta Events Manager → Test Events, expect **one `Lead` event with two sources — browser and server — shown as deduplicated**. That's the pass condition; two separate undeduplicated events means the `event_id` isn't lining up. (See "deduplication looks like one row" below before you conclude the server side is broken.)
5. Check GHL: confirm a contact was created, tagged `Qualified`, with the custom fields populated.
6. Book a real Calendly test slot from the qualified flow. Confirm the `Schedule` event appears in Events Manager (browser + server, deduplicated), that Workflow #2 updates the GHL contact, and — critically — that the contact's **qualifier fields are still populated** after the booking. Cancel the test booking afterward so it doesn't sit on a real calendar slot.
7. Submit a soft-DQ test — **decision-maker = "No"** (ad spend no longer disqualifies; see §3.1). Confirm: no Calendly booking is shown to the "lead," the GHL contact is tagged `Nurture`, and **no `Lead` event appears in Events Manager** for this submit.
   - Then submit a second test with decision-maker = Yes and ad spend = "Under $3K". This one **must** reach Calendly and **must** fire `Lead`, tagged `Qualified` + `LowBudget`. If it lands in nurture instead, the budget gate wasn't fully removed.
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
- **Guarantee copy:** on-page claims — "20 qualified appointments in 90 days," "10 roofers per cohort," "free month" — must match the actual contract terms before any ad spend goes live against this page. If the contract changes, this copy has to change with it.
