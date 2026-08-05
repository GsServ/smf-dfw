import type { FestivalEvent } from '../content'
import { daysUntil, longDate } from '../lib/dates'

interface Props {
  event: FestivalEvent | null
  today: Date
}

/**
 * The panel at the top of the page. When the season is over there is no next
 * event, and the panel says so rather than sitting there with empty dashes.
 */
export default function NextEvent({ event, today }: Props) {
  return (
    <section className="wrap py-[clamp(40px,6vw,68px)]" aria-labelledby="next-heading">
      <div className="overflow-hidden rounded-[3px] border border-rule bg-gradient-to-br from-ink-2 to-ink-2/35">
        {event ? (
          <Upcoming event={event} today={today} />
        ) : (
          <Finished />
        )}
      </div>
    </section>
  )
}

function Upcoming({ event, today }: { event: FestivalEvent; today: Date }) {
  const days = daysUntil(event.date, today)
  // An event with an end date that started already — the exam window, mid-run.
  const underway = days < 0

  return (
    <div className="grid grid-cols-1 items-center gap-[18px] p-[clamp(24px,4vw,38px)] cal:grid-cols-[1fr_auto] cal:gap-[22px]">
      <div>
        <h2
          id="next-heading"
          className="m-0 mb-3 font-mono text-[11px] font-normal uppercase tracking-[0.24em] text-gold"
        >
          {underway ? 'Happening now' : 'Next event'}
        </h2>
        <p className="m-0 mb-3 font-display text-[clamp(28px,5vw,44px)] font-bold leading-[1.08] text-linen-2">
          {event.title}
        </p>
        <p className="m-0 text-[15px] text-linen">
          <b className="font-medium">{longDate(event.date)}</b>
          <Dot />
          {event.time}
          <Dot />
          {event.venue}
        </p>
      </div>

      <Countdown days={days} underway={underway} />
    </div>
  )
}

function Countdown({ days, underway }: { days: number; underway: boolean }) {
  let value: string
  let unit: string

  if (underway) {
    value = 'Open'
    unit = 'now'
  } else if (days <= 0) {
    value = 'Today'
    unit = ''
  } else {
    value = String(days)
    unit = days === 1 ? 'day away' : 'days away'
  }

  const isWord = underway || days <= 0

  return (
    <p className="m-0 flex min-w-[132px] items-baseline gap-3 text-left cal:block cal:text-center">
      <span
        className={`block font-display leading-none text-gold ${
          isWord ? 'text-[clamp(30px,6vw,44px)]' : 'text-[clamp(44px,9vw,66px)]'
        }`}
      >
        {value}
      </span>
      {unit && (
        <span className="block font-mono text-[11px] uppercase tracking-[0.2em] text-slate cal:mt-2">
          {unit}
        </span>
      )}
    </p>
  )
}

function Finished() {
  return (
    <div className="p-[clamp(24px,4vw,38px)]">
      <h2
        id="next-heading"
        className="m-0 mb-3 font-mono text-[11px] font-normal uppercase tracking-[0.24em] text-gold"
      >
        Season complete
      </h2>
      <p className="m-0 font-display text-[clamp(28px,5vw,44px)] font-bold leading-[1.08] text-linen-2">
        Every event has finished
      </p>
      <p className="m-0 mt-3 text-[15px] text-linen">
        The full calendar is below. Next season's dates will be posted here.
      </p>
    </div>
  )
}

function Dot() {
  return <span className="px-2 text-gold-label">·</span>
}
