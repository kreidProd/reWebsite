import { useState, lazy, Suspense } from 'react'
import { newEventId, trackLead, postLead } from './tracking'

// react-calendly is only ever pulled in through this lazy boundary, and
// only once a prospect has qualified — protects LCP on initial paint.
const CalendlyEmbed = lazy(() => import('./CalendlyEmbed.jsx'))

const TOTAL_STEPS = 3
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const initialFields = {
  fullName: '',
  company: '',
  email: '',
  phone: '',
  decisionMaker: '',
  states: '',
  googleAdsStatus: '',
  adSpend: '',
  drivingFactor: '',
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
        We might not be the right fit yet — here's how to get ready.
      </p>
      <ul className="mt-4 list-inside list-disc space-y-2 text-[17px] text-roof-ink">
        <li>Loop in the decision-maker so the next conversation moves fast.</li>
        <li>Get clear on what you can commit toward ad spend each month.</li>
        <li>Reach back out when the budget and authority line up — we'd love to talk.</li>
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
    if (!fields.states.trim()) e.states = 'Enter the state(s) you operate in.'
    if (!fields.googleAdsStatus) e.googleAdsStatus = 'Select an option.'
    if (!fields.adSpend) e.adSpend = 'Select an option.'
    if (!fields.drivingFactor.trim()) e.drivingFactor = "Tell us what's driving you to look now."
    return e
  }

  function handleSubmitStep(e) {
    e.preventDefault()

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
    const isDecisionMaker = fields.decisionMaker !== 'No'
    const canFund = fields.adSpend !== 'Under $3K'
    const isQualified = isDecisionMaker && canFund
    const tier2Flag = fields.adSpend === '$7K+'

    const tags = isQualified ? (tier2Flag ? ['Qualified', 'Tier2'] : ['Qualified']) : ['Nurture']
    const eventId = newEventId()

    if (isQualified) {
      trackLead(eventId)
    }

    postLead({
      ...fields,
      event_id: eventId,
      tags,
      qualified: isQualified,
      page: 'roofers',
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
              <TextField
                id="pq-states"
                label="What state(s) do you operate in?"
                value={fields.states}
                onChange={(v) => update('states', v)}
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
