import type { FestivalEvent } from '../content'
import { copticNumeral } from '../lib/coptic'
import { dayOfWeek, shortDate } from '../lib/dates'
import { describeFile, publicUrl, type EventDocument } from '../lib/eventDocuments'

interface Props {
  event: FestivalEvent
  index: number
  past: boolean
  next: boolean
  /** Milliseconds of stagger, already capped by the calendar. */
  delay: number
  documents?: EventDocument[]
}

export default function EventRow({
  event,
  index,
  past,
  next,
  delay,
  documents = [],
}: Props) {
  return (
    <li
      className="reveal relative grid grid-cols-[34px_1fr] items-start gap-x-4 gap-y-1.5 border-b border-rule-faint py-[17px] cal:grid-cols-[40px_108px_1fr_auto] cal:gap-x-[clamp(14px,2.5vw,26px)] cal:gap-y-0"
      style={{ animationDelay: `${delay}ms` }}
    >
      <span
        aria-hidden="true"
        className={`col-start-1 row-start-1 flex h-[34px] w-[34px] items-center justify-center justify-self-start rounded-full border font-coptic text-[15px] leading-none cal:h-10 cal:w-10 cal:text-[17px] ${
          next
            ? 'border-gold bg-gold text-ink shadow-[0_0_0_5px_rgba(217,164,65,.12)]'
            : past
              ? 'border-rule-soft bg-transparent text-gold-label'
              : 'border-rule bg-ink text-gold'
        }`}
      >
        {copticNumeral(index + 1)}
      </span>

      <span className="col-start-2 row-start-1 pt-1.5 cal:pt-2">
        <span
          className={`mr-2 inline font-mono text-[10.5px] uppercase tracking-[0.18em] cal:mr-0 cal:block ${
            past ? 'text-slate-dim' : 'text-slate'
          }`}
        >
          {dayOfWeek(event.date)}
        </span>
        <span
          className={`inline font-display text-base cal:mt-0.5 cal:block cal:text-[21px] ${
            past ? 'text-slate' : 'text-linen-2'
          }`}
        >
          {shortDate(event.date, event.endDate)}
        </span>
      </span>

      <span className="col-start-2 row-start-2 min-w-0 pt-0.5 cal:col-start-3 cal:row-start-1 cal:pt-[7px]">
        <h3
          className={`m-0 mb-1 font-display text-[19px] tracking-[-0.005em] ${
            event.milestone ? 'font-normal italic' : 'font-bold'
          } ${past ? 'text-slate' : 'text-linen-2'}`}
        >
          {event.title}
        </h3>
        <p className={`m-0 text-[13.5px] ${past ? 'text-slate-dim' : 'text-slate'}`}>
          {event.time}
          <span className="px-[7px] text-gold-label">·</span>
          {event.venue}
          {event.notes && (
            <>
              <span className="px-[7px] text-gold-label">·</span>
              {event.notes}
            </>
          )}
        </p>

        {documents.length > 0 && (
          <ul className="mt-2 flex list-none flex-wrap gap-x-4 gap-y-1 p-0">
            {documents.map((doc) => (
              <li key={doc.id}>
                <a
                  href={publicUrl(doc.storage_path)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-baseline gap-1.5 text-[13px] text-gold underline decoration-gold/40 underline-offset-2 hover:decoration-gold"
                >
                  <span aria-hidden="true">↓</span>
                  {doc.title}
                  <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-gold-label">
                    {describeFile(doc)}
                  </span>
                </a>
              </li>
            ))}
          </ul>
        )}
      </span>

      <span
        className={`col-start-2 row-start-3 self-start whitespace-nowrap pt-1 font-mono text-[10px] uppercase tracking-[0.16em] cal:col-start-4 cal:row-start-1 cal:self-center cal:pt-0.5 ${
          next ? 'text-gold' : 'text-gold-label'
        }`}
      >
        {next ? 'Next' : past ? 'Done' : ''}
      </span>
    </li>
  )
}
