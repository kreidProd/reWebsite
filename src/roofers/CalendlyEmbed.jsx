// Single seam for the booking provider. This is the ONLY file in the
// project that imports 'react-calendly'. Consumers must load this
// component via React.lazy() so the react-calendly package (and its
// dependency chain) ships as its own chunk, fetched only once a
// prospect has qualified — never during the initial page paint.
import { InlineWidget, useCalendlyEventListener } from 'react-calendly'
import { newEventId, trackSchedule, getAttribution } from './tracking'

const DEFAULT_CALENDLY_URL = 'https://calendly.com/hello-rebootmedia/diagnostic'

// Maps our snake_case attribution keys to the camelCase shape react-calendly's
// InlineWidget expects for its `utm` prop.
const UTM_KEY_MAP = {
  utm_source: 'utmSource',
  utm_medium: 'utmMedium',
  utm_campaign: 'utmCampaign',
  utm_content: 'utmContent',
  utm_term: 'utmTerm',
}

function buildCalendlyUtm(attribution) {
  const utm = {}
  for (const [snakeKey, camelKey] of Object.entries(UTM_KEY_MAP)) {
    const value = attribution[snakeKey]
    if (value) utm[camelKey] = value
  }
  return utm
}

export default function CalendlyEmbed({ name, email, phone, onScheduled }) {
  useCalendlyEventListener({
    onEventScheduled: () => {
      trackSchedule(newEventId())
      onScheduled?.()
    },
  })

  const calendlyUrl = import.meta.env.VITE_CALENDLY_URL || DEFAULT_CALENDLY_URL
  const utm = buildCalendlyUtm(getAttribution())

  return (
    <div className="overflow-hidden rounded-2xl border border-roof-border-subtle bg-roof-surface">
      <InlineWidget
        url={calendlyUrl}
        styles={{ height: '700px', minWidth: '280px' }}
        prefill={{
          name,
          email,
          customAnswers: { a1: phone },
        }}
        utm={utm}
      />
    </div>
  )
}
