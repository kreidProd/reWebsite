import { useState, lazy, Suspense } from 'react'
import { newEventId, trackLead, postLead, getAttribution } from './tracking'

// react-calendly is only ever pulled in through this lazy boundary, and
// only once a prospect has qualified — protects LCP on initial paint.
const CalendlyEmbed = lazy(() => import('./CalendlyEmbed.jsx'))

const TOTAL_STEPS = 3
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const US_STATES = [
  'Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado',
  'Connecticut', 'Delaware', 'District of Columbia', 'Florida', 'Georgia',
  'Hawaii', 'Idaho', 'Illinois', 'Indiana', 'Iowa', 'Kansas', 'Kentucky',
  'Louisiana', 'Maine', 'Maryland', 'Massachusetts', 'Michigan', 'Minnesota',
  'Mississippi', 'Missouri', 'Montana', 'Nebraska', 'Nevada', 'New Hampshire',
  'New Jersey', 'New Mexico', 'New York', 'North Carolina', 'North Dakota',
  'Ohio', 'Oklahoma', 'Oregon', 'Pennsylvania', 'Rhode Island',
  'South Carolina', 'South Dakota', 'Tennessee', 'Texas', 'Utah', 'Vermont',
  'Virginia', 'Washington', 'West Virginia', 'Wisconsin', 'Wyoming',
]

const initialFields = {
  fullName: '',
  company: '',
  email: '',
  phone: '',
  decisionMaker: '',
  // Multi-select — held as an array in component state, but flattened to a
  // comma-separated string on submit so the CRM's "States" custom field
  // keeps receiving the same shape it always has.
  states: [],
  googleAdsStatus: '',
  adSpend: '',
  drivingFactor: '',
  // Honeypot — offscreen, aria-hidden, unreachable by Tab. A filled value
  // marks the submit as likely bot traffic.
  //
  // Named `referral_code`, NOT `website`: password managers and browser
  // autofill routinely ignore autocomplete="off" and will happily fill a
  // field named "website" with a URL. That misfires the honeypot on real
  // people. No autofill heuristic targets "referral_code", while a naive
  // bot filling every input still trips it.
  //
  // A trip FLAGS, it does not block — see handleSubmitStep. Blocking made
  // a false positive invisible and unrecoverable.
  referral_code: '',
}

function TextField({ id, label, type = 'text', value, onChange, error, hint, autoComplete }) {
  const errorId = `${id}-error`
  return (
    <div className="mb-6">
      <label htmlFor={id} className="mb-2 block text-[17px] font-medium text-roof-ink">
        {label}
      </label>
      {hint && <p className="mb-2 text-sm text-roof-ink">{hint}</p>}
      <input
        id={id}
        name={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete={autoComplete}
        aria-invalid={error ? 'true' : 'false'}
        aria-describedby={error ? errorId : undefined}
        className={`min-h-[48px] w-full rounded-lg border bg-roof-surface px-4 py-3 text-[17px] text-roof-ink outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 ${
          error ? 'border-danger' : 'border-roof-border-subtle'
        }`}
      />
      {error && (
        <p id={errorId} className="mt-2 text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  )
}

function TextAreaField({ id, label, value, onChange, error, hint }) {
  const errorId = `${id}-error`
  return (
    <div className="mb-6">
      <label htmlFor={id} className="mb-2 block text-[17px] font-medium text-roof-ink">
        {label}
      </label>
      {hint && <p className="mb-2 text-sm text-roof-ink">{hint}</p>}
      <textarea
        id={id}
        name={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={4}
        aria-invalid={error ? 'true' : 'false'}
        aria-describedby={error ? errorId : undefined}
        className={`w-full min-h-[120px] rounded-lg border bg-roof-surface px-4 py-3 text-[17px] text-roof-ink outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 ${
          error ? 'border-danger' : 'border-roof-border-subtle'
        }`}
      />
      {error && (
        <p id={errorId} className="mt-2 text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  )
}

function RadioGroup({ legend, name, options, value, onChange, error, hint }) {
  const errorId = `${name}-error`
  return (
    <fieldset className="mb-6" aria-describedby={error ? errorId : undefined}>
      <legend className="mb-2 block text-[17px] font-medium text-roof-ink">{legend}</legend>
      {hint && <p className="mb-2 text-sm text-roof-ink">{hint}</p>}
      <div className="flex flex-col gap-3">
        {options.map((opt) => {
          const optId = `${name}-${opt.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}`
          const checked = value === opt
          return (
            <label
              key={opt}
              htmlFor={optId}
              className={`flex min-h-[48px] cursor-pointer items-center gap-3 rounded-lg border bg-roof-surface px-4 py-3 text-[17px] text-roof-ink transition-colors ${
                checked ? 'border-accent ring-1 ring-accent' : 'border-roof-border-subtle'
              }`}
            >
              <input
                type="radio"
                id={optId}
                name={name}
                value={opt}
                checked={checked}
                onChange={() => onChange(opt)}
                aria-invalid={error ? 'true' : 'false'}
                className="h-5 w-5 shrink-0 accent-accent focus-visible:ring-2 focus-visible:ring-accent"
              />
              {opt}
            </label>
          )
        })}
      </div>
      {error && (
        <p id={errorId} className="mt-2 text-sm text-danger">
          {error}
        </p>
      )}
    </fieldset>
  )
}

function StateMultiSelect({ legend, hint, selected, onToggle, error }) {
  const [filter, setFilter] = useState('')
  const errorId = 'pq-states-error'
  const query = filter.trim().toLowerCase()
  const visible = query ? US_STATES.filter((s) => s.toLowerCase().includes(query)) : US_STATES

  return (
    <fieldset className="mb-6" aria-describedby={error ? errorId : undefined}>
      <legend className="mb-2 block text-[17px] font-medium text-roof-ink">{legend}</legend>
      {hint && <p className="mb-2 text-sm text-roof-ink">{hint}</p>}

      <label htmlFor="pq-states-filter" className="sr-only">
        Filter the list of states
      </label>
      <input
        id="pq-states-filter"
        type="text"
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        // This input lives inside the step-2 <form>. Without this, Enter
        // would submit the whole step instead of doing nothing.
        onKeyDown={(e) => {
          if (e.key === 'Enter') e.preventDefault()
        }}
        placeholder="Type to filter…"
        autoComplete="off"
        className="mb-3 min-h-[48px] w-full rounded-lg border border-roof-border-subtle bg-roof-surface px-4 py-3 text-[17px] text-roof-ink outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
      />

      <div
        className={`max-h-[260px] overflow-y-auto rounded-lg border bg-roof-surface p-2 ${
          error ? 'border-danger' : 'border-roof-border-subtle'
        }`}
      >
        {visible.length === 0 ? (
          <p className="px-2 py-3 text-sm text-roof-muted">No states match that.</p>
        ) : (
          <div className="grid grid-cols-2 gap-1">
            {visible.map((state) => {
              const optId = `pq-state-${state.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}`
              const checked = selected.includes(state)
              return (
                <label
                  key={state}
                  htmlFor={optId}
                  className={`flex min-h-[44px] cursor-pointer items-center gap-3 rounded-md px-3 py-2 text-[15px] text-roof-ink transition-colors ${
                    checked ? 'bg-accent-bg' : 'hover:bg-roof-paper'
                  }`}
                >
                  <input
                    type="checkbox"
                    id={optId}
                    name="pq-states"
                    value={state}
                    checked={checked}
                    onChange={() => onToggle(state)}
                    aria-invalid={error ? 'true' : 'false'}
                    className="h-5 w-5 shrink-0 accent-accent focus-visible:ring-2 focus-visible:ring-accent"
                  />
                  {state}
                </label>
              )
            })}
          </div>
        )}
      </div>

      {/* Filtering hides unmatched checkboxes but never clears them, so this
          summary is the only place an already-selected state stays visible. */}
      <p className="mt-2 text-sm text-roof-muted" aria-live="polite">
        {selected.length === 0 ? 'No states selected yet.' : `Selected: ${selected.join(', ')}`}
      </p>

      {error && (
        <p id={errorId} className="mt-2 text-sm text-danger">
          {error}
        </p>
      )}
    </fieldset>
  )
}

function ProgressIndicator({ step, finalLabel }) {
  const labels = ['Your info', 'A few questions', finalLabel]
  return (
    <ol className="mb-8 flex items-center" aria-label="Form progress">
      {labels.map((label, i) => {
        const n = i + 1
        const isCurrent = n === step
        const isDone = n < step
        return (
          <li
            key={label}
            className="flex flex-1 items-center gap-2 last:flex-none"
            aria-current={isCurrent ? 'step' : undefined}
          >
            <span
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${
                isDone || isCurrent ? 'bg-accent text-white' : 'bg-roof-border-subtle text-roof-muted'
              }`}
            >
              {n}
            </span>
            <span
              className={`hidden text-sm sm:inline ${
                isCurrent ? 'font-medium text-roof-ink' : 'text-roof-muted'
              }`}
            >
              {label}
            </span>
            {n < TOTAL_STEPS && <span className="mx-2 h-px flex-1 bg-roof-border-subtle" aria-hidden="true" />}
          </li>
        )
      })}
    </ol>
  )
}

function NurtureMessage() {
  return (
    <div role="status" className="rounded-2xl border border-roof-border-subtle bg-roof-surface p-8">
      <p className="text-[17px] font-medium text-roof-ink">
        Thanks — we'd want the decision-maker in the room for this one.
      </p>
      <ul className="mt-4 list-inside list-disc space-y-2 text-[17px] text-roof-ink">
        <li>Loop in the owner, or whoever signs off on marketing spend.</li>
        <li>Come back together and we'll walk you both through it.</li>
      </ul>
    </div>
  )
}

function ConfirmationMessage() {
  return (
    <div role="status" className="rounded-2xl border border-roof-border-subtle bg-roof-surface p-8 text-center">
      <p className="text-[17px] font-medium text-roof-ink">
        You're booked. Watch for a confirmation — and we'll call to confirm the day before.
      </p>
    </div>
  )
}

function CalendlyFallback() {
  return (
    <div className="flex min-h-[200px] items-center justify-center rounded-2xl border border-roof-border-subtle bg-roof-surface p-8 text-[17px] text-roof-muted">
      Loading your scheduler…
    </div>
  )
}

export default function PreQualForm() {
  const [step, setStep] = useState(1)
  const [fields, setFields] = useState(initialFields)
  const [errors, setErrors] = useState({})
  const [submitted, setSubmitted] = useState(false)
  const [qualified, setQualified] = useState(false)
  const [booked, setBooked] = useState(false)
  const [liveMessage, setLiveMessage] = useState('')

  function update(name, value) {
    setFields((f) => ({ ...f, [name]: value }))
  }

  function toggleState(state) {
    setFields((f) => ({
      ...f,
      states: f.states.includes(state)
        ? f.states.filter((s) => s !== state)
        : [...f.states, state],
    }))
  }

  function validateStep1() {
    const e = {}
    if (!fields.fullName.trim()) e.fullName = 'Enter your first and last name.'
    if (!fields.company.trim()) e.company = 'Enter your company name.'
    if (!fields.email.trim()) e.email = 'Enter your email.'
    else if (!EMAIL_RE.test(fields.email)) e.email = 'Enter a valid email address.'
    if (!fields.phone.trim()) e.phone = 'Enter your mobile phone number.'
    return e
  }

  function validateStep2() {
    const e = {}
    if (!fields.decisionMaker) e.decisionMaker = 'Select an option.'
    if (fields.states.length === 0) e.states = 'Select at least one state.'
    if (!fields.googleAdsStatus) e.googleAdsStatus = 'Select an option.'
    if (!fields.adSpend) e.adSpend = 'Select an option.'
    if (!fields.drivingFactor.trim()) e.drivingFactor = "Tell us what's driving you to look now."
    return e
  }

  function handleSubmitStep(e) {
    e.preventDefault()

    // Guard against a double-click firing two final submits (two Lead
    // events / two webhook POSTs).
    if (submitted) return

    const stepErrors = step === 1 ? validateStep1() : validateStep2()
    if (Object.keys(stepErrors).length > 0) {
      setErrors(stepErrors)
      setLiveMessage('There are errors in the form. Please review and correct the highlighted fields.')
      return
    }
    setErrors({})

    if (step === 1) {
      setStep(2)
      setLiveMessage('Step 2 of 3: A few questions.')
      return
    }

    // Step 2 submit: run qualify logic, fire tracking, POST lead.
    //
    // Authority is the only gate. Budget does NOT disqualify — a roofer who
    // picks "Under $3K" still books a call; the LowBudget tag is what tells
    // sales what they're walking into. Only someone who can't say yes at all
    // gets routed to nurture.
    const isQualified = fields.decisionMaker !== 'No'

    // Honeypot tripped. This FLAGS the submit, it does not block it.
    //
    // The old behaviour was to silently route the person to the nurture
    // screen and fire nothing at all — no POST, no pixel, no log. That
    // makes a false positive completely invisible: a real roofer gets told
    // they aren't eligible and you have no record they ever tried. Given
    // this form ran with the honeypot named `website` (see initialFields),
    // false positives were likely, not hypothetical.
    //
    // So: they proceed exactly as they otherwise would, but we tag the
    // submit `SpamSuspect` and set `spam: true` so it's visible in the CRM,
    // and we withhold the Meta conversion event. A wrongly-flagged customer
    // keeps their booking; a real bot costs one CRM row and never pollutes
    // the ad signal.
    const trippedHoneypot = fields.referral_code.trim().length > 0

    let tags
    if (!isQualified) tags = ['Nurture']
    else if (fields.adSpend === '$7K+') tags = ['Qualified', 'Tier2']
    else if (fields.adSpend === 'Under $3K') tags = ['Qualified', 'LowBudget']
    else tags = ['Qualified']
    if (trippedHoneypot) tags = [...tags, 'SpamSuspect']

    const eventId = newEventId()

    // Flagged submits never fire the pixel — Meta's Lead signal stays clean.
    // The server applies the same rule to CAPI via the `spam` flag.
    if (isQualified && !trippedHoneypot) {
      trackLead(eventId)
    }

    postLead({
      ...fields,
      // Flatten the multi-select back to the string shape the CRM field expects.
      states: fields.states.join(', '),
      event_id: eventId,
      tags,
      qualified: isQualified,
      spam: trippedHoneypot,
      page: 'roofers',
      attribution: getAttribution(),
    })

    setQualified(isQualified)
    setSubmitted(true)
    setStep(3)
    setLiveMessage(
      isQualified
        ? "Step 3 of 3: You're qualified — book your appointment."
        : "We might not be the right fit yet — here's how to get ready."
    )
  }

  function goBack() {
    if (step > 1) {
      setStep(step - 1)
      setErrors({})
      setLiveMessage(`Step ${step - 1} of 3.`)
    }
  }

  const finalLabel = submitted && !qualified ? 'Next steps' : 'Book'

  return (
    <div id="prequal-form" className="mx-auto w-full max-w-xl">
      <ProgressIndicator step={step} finalLabel={finalLabel} />
      <div aria-live="polite" className="sr-only">
        {liveMessage}
      </div>

      {step < 3 && (
        <form onSubmit={handleSubmitStep} noValidate>
          {step === 1 && (
            <div>
              <TextField
                id="pq-fullName"
                label="First and last name"
                value={fields.fullName}
                onChange={(v) => update('fullName', v)}
                error={errors.fullName}
                autoComplete="name"
              />
              <TextField
                id="pq-company"
                label="Company name"
                value={fields.company}
                onChange={(v) => update('company', v)}
                error={errors.company}
                autoComplete="organization"
              />
              <TextField
                id="pq-email"
                type="email"
                label="Email"
                value={fields.email}
                onChange={(v) => update('email', v)}
                error={errors.email}
                autoComplete="email"
              />
              <TextField
                id="pq-phone"
                type="tel"
                label="Mobile phone"
                value={fields.phone}
                onChange={(v) => update('phone', v)}
                error={errors.phone}
                autoComplete="tel"
              />
              {/* Honeypot — offscreen and unreachable by keyboard/screen reader.
                  Real users never see it; a filled value flags (never blocks)
                  the submit. See initialFields for why it isn't named
                  "website" — that name attracts password-manager autofill. */}
              <div
                style={{ position: 'absolute', left: '-9999px', width: '1px', height: '1px', overflow: 'hidden' }}
                aria-hidden="true"
              >
                <input
                  type="text"
                  name="referral_code"
                  autoComplete="off"
                  tabIndex={-1}
                  aria-hidden="true"
                  value={fields.referral_code}
                  onChange={(e) => update('referral_code', e.target.value)}
                />
              </div>
              <button
                type="submit"
                className="min-h-[48px] w-full rounded-lg bg-accent px-6 py-3 text-[17px] font-semibold text-white transition-colors hover:bg-accent-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
              >
                Continue →
              </button>
            </div>
          )}

          {step === 2 && (
            <div>
              <RadioGroup
                legend="Are you the owner / decision-maker?"
                name="pq-decisionMaker"
                options={['Yes', 'I share the decision', 'No']}
                value={fields.decisionMaker}
                onChange={(v) => update('decisionMaker', v)}
                error={errors.decisionMaker}
              />
              <StateMultiSelect
                legend="What state(s) do you operate in?"
                hint="Select every state you work in."
                selected={fields.states}
                onToggle={toggleState}
                error={errors.states}
              />
              <RadioGroup
                legend="Are you running Google Ads now?"
                name="pq-googleAdsStatus"
                options={['Running now', 'Ran before, stopped', 'Never have']}
                value={fields.googleAdsStatus}
                onChange={(v) => update('googleAdsStatus', v)}
                error={errors.googleAdsStatus}
              />
              <RadioGroup
                legend="What can you put toward ad spend each month?"
                hint="your money, direct to Google"
                name="pq-adSpend"
                options={['Under $3K', '$3K–$5K', '$5K–$7K', '$7K+']}
                value={fields.adSpend}
                onChange={(v) => update('adSpend', v)}
                error={errors.adSpend}
              />
              <TextAreaField
                id="pq-drivingFactor"
                label="What's driving you to look now?"
                value={fields.drivingFactor}
                onChange={(v) => update('drivingFactor', v)}
                error={errors.drivingFactor}
              />
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={goBack}
                  className="min-h-[48px] flex-1 rounded-lg border border-roof-border-strong px-6 py-3 text-[17px] font-semibold text-roof-ink transition-colors hover:bg-roof-paper focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
                >
                  Back
                </button>
                <button
                  type="submit"
                  className="min-h-[48px] flex-1 rounded-lg bg-accent px-6 py-3 text-[17px] font-semibold text-white transition-colors hover:bg-accent-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
                >
                  Submit →
                </button>
              </div>
            </div>
          )}
        </form>
      )}

      {step === 3 && submitted && (
        <div>
          {qualified ? (
            booked ? (
              <ConfirmationMessage />
            ) : (
              <div>
                <h3 className="mb-4 text-[17px] font-semibold text-roof-ink">
                  You're in — pick a time that works.
                </h3>
                <Suspense fallback={<CalendlyFallback />}>
                  <CalendlyEmbed
                    name={fields.fullName}
                    email={fields.email}
                    phone={fields.phone}
                    company={fields.company}
                    onScheduled={() => setBooked(true)}
                  />
                </Suspense>
              </div>
            )
          ) : (
            <NurtureMessage />
          )}
        </div>
      )}
    </div>
  )
}
