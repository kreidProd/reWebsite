// Single seam for the booking provider. This is the ONLY file in the
// project that imports 'react-calendly'. Consumers must load this
// component via React.lazy() so the react-calendly package (and its
// dependency chain) ships as its own chunk, fetched only once a
// prospect has qualified — never during the initial page paint.
import { InlineWidget, useCalendlyEventListener } from 'react-calendly'
import { newEventId, trackSchedule, postSchedule, getAttribution } from './tracking'

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

export default function CalendlyEmbed({ name, email, phone, company, onScheduled }) {
  useCalendlyEventListener({
    onEventScheduled: () => {
      // Generate the event id ONCE and reuse it for both the browser pixel
      // and the server-side CAPI post so Meta dedupes them into one event.
      const eventId = newEventId()
      trackSchedule(eventId)
      postSchedule({
        event_id: eventId,
        event_name: 'Schedule',
        fullName: name,
        email,
        phone,
        page: 'roofers',
        tags: ['Booked'],
        qualified: true,
        attribution: getAttribution(),
      })
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
          // customAnswers.a1 maps to Calendly's FIRST custom question on the
          // hello-rebootmedia/diagnostic event, which is "Company Name" (question
          // 2 is "Any questions?" — there is no phone question). This mapping is
          // positional, not named, so it silently breaks if anyone reorders,
          // deletes, or adds questions in the Calendly dashboard. If prefill
          // starts landing in the wrong field, check the event's question order
          // in Calendly before touching this code.
          customAnswers: { a1: company },
        }}
        utm={utm}
      />
    </div>
  )
}
