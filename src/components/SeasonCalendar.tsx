import type { FestivalEvent } from '../content'
import type { EventDocument } from '../lib/eventDocuments'
import { site } from '../content'
import { isPast } from '../lib/dates'
import EventRow from './EventRow'
import SectionHead from './SectionHead'

interface Props {
  events: FestivalEvent[]
  nextIndex: number
  today: Date
  documents?: Record<string, EventDocument[]>
}

export default function SeasonCalendar({ events, nextIndex, today, documents = {} }: Props) {
  return (
    <section className="wrap py-[clamp(40px,6vw,68px)]" aria-labelledby="calendar-heading">
      <SectionHead
        id="calendar-heading"
        title={site.calendarHeading}
        note={`${events.length} ${events.length === 1 ? 'event' : 'events'}`}
      />

      <ul className="calendar-rule m-0 list-none p-0">
        {events.map((event, i) => (
          <EventRow
            key={event.id}
            event={event}
            index={i}
            past={isPast(event, today)}
            next={i === nextIndex}
            delay={Math.min(i * 45, 450)}
            documents={documents[event.id]}
          />
        ))}
      </ul>
    </section>
  )
}
