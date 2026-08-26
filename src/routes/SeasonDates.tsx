import { useMemo, useState } from 'react'
import { useAuth } from '../auth/AuthProvider'
import { events as publishedEvents, type FestivalEvent } from '../content'
import { addDays, dayOfWeekLong, parseDate, shortDate } from '../lib/dates'
import Shell from '../components/portal/Shell'
import FileHandoff from '../components/portal/FileHandoff'

/**
 * Setting next season's dates without opening a text file.
 *
 * This deliberately does **not** write to the database. The public calendar is
 * a flat JSON file so that it keeps working when nothing else does, and moving
 * it behind a login would undo the one thing that makes this site cheap to run.
 * So the screen ends where the architecture says it should: it hands back a
 * finished `events.json` for the maintainer to commit.
 */

const DEFAULT_SHIFT_WEEKS = 52

function blankEvent(): FestivalEvent {
  return {
    id: '',
    date: '',
    endDate: null,
    title: '',
    time: '',
    venue: '',
    milestone: false,
    notes: null,
  }
}

function slugify(title: string): string {
  return (
    title
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 40) || 'event'
  )
}

/** A slug nothing else is using, so two events can never collide. */
function uniqueSlug(base: string, taken: Set<string>): string {
  if (!taken.has(base)) return base
  for (let n = 2; ; n++) {
    const candidate = `${base}-${n}`
    if (!taken.has(candidate)) return candidate
  }
}

const ISO = /^\d{4}-\d{2}-\d{2}$/

/**
 * Some times restate a date in words — "Closes 11:59 PM Jul 26". Moving the
 * season leaves that sentence pointing at last year unless it moves too, and a
 * calendar that contradicts itself in the same row is worse than no calendar.
 */
const DATE_IN_TEXT = /\b[A-Z][a-z]{2} \d{1,2}\b/

/** The day a written-out date in the time field ought to be naming. */
function dateBehind(event: FestivalEvent): string | null {
  if (event.endDate && ISO.test(event.endDate)) return event.endDate
  return ISO.test(event.date) ? event.date : null
}

function retime(event: FestivalEvent): string {
  const target = dateBehind(event)
  if (!target || !DATE_IN_TEXT.test(event.time)) return event.time
  return event.time.replace(DATE_IN_TEXT, shortDate(target))
}

function problemsFor(event: FestivalEvent, index: number, all: FestivalEvent[]): string[] {
  const found: string[] = []
  if (!event.title.trim()) found.push('needs a name')
  if (!ISO.test(event.date)) found.push('needs a date')
  if (event.endDate && !ISO.test(event.endDate)) found.push('has an unreadable end date')
  if (ISO.test(event.date) && event.endDate && ISO.test(event.endDate)) {
    if (parseDate(event.endDate) < parseDate(event.date)) {
      found.push('ends before it starts')
    }
  }
  if (all.some((other, i) => i !== index && other.id && other.id === event.id)) {
    found.push('shares an id with another event')
  }
  const written = event.time.match(DATE_IN_TEXT)
  const target = dateBehind(event)
  if (written && target && written[0] !== shortDate(target)) {
    found.push(`says "${written[0]}" in the time, but falls on ${shortDate(target)}`)
  }
  return found
}

/** The file, formatted exactly as it is committed — keys in order, dates sorted. */
function toFileText(events: FestivalEvent[]): string {
  const ordered = [...events]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((e) => ({
      id: e.id,
      date: e.date,
      endDate: e.endDate || null,
      title: e.title.trim(),
      time: e.time.trim(),
      venue: e.venue.trim(),
      milestone: e.milestone,
      notes: e.notes?.trim() || null,
    }))
  return `${JSON.stringify(ordered, null, 2)}\n`
}

export default function SeasonDates({ onNavigate }: { onNavigate: (p: string) => void }) {
  const { profile, loading: authLoading } = useAuth()
  const [draft, setDraft] = useState<FestivalEvent[]>(() =>
    publishedEvents.map((e) => ({ ...e })),
  )
  const [weeks, setWeeks] = useState(String(DEFAULT_SHIFT_WEEKS))

  const problems = useMemo(
    () => draft.map((e, i) => problemsFor(e, i, draft)),
    [draft],
  )
  const problemCount = problems.filter((p) => p.length > 0).length

  const span = useMemo(() => {
    const dated = draft.filter((e) => ISO.test(e.date)).map((e) => e.date).sort()
    if (dated.length === 0) return null
    const first = dated[0]
    const last = dated[dated.length - 1]
    return `${dayOfWeekLong(first)} ${first} — ${dayOfWeekLong(last)} ${last}`
  }, [draft])

  function update(index: number, patch: Partial<FestivalEvent>) {
    setDraft((rows) => rows.map((row, i) => (i === index ? { ...row, ...patch } : row)))
  }

  function shiftSeason() {
    const n = Number(weeks)
    if (!Number.isFinite(n) || n === 0) return
    setDraft((rows) =>
      rows.map((row) => {
        const moved = {
          ...row,
          date: ISO.test(row.date) ? addDays(row.date, n * 7) : row.date,
          endDate:
            row.endDate && ISO.test(row.endDate)
              ? addDays(row.endDate, n * 7)
              : row.endDate,
        }
        return { ...moved, time: retime(moved) }
      }),
    )
  }

  function addEvent() {
    setDraft((rows) => [...rows, blankEvent()])
  }

  function removeEvent(index: number) {
    const event = draft[index]
    const name = event.title.trim() || 'this event'
    if (!window.confirm(`Remove ${name} from the calendar?`)) return
    setDraft((rows) => rows.filter((_, i) => i !== index))
  }

  function reset() {
    if (!window.confirm('Throw away your changes and go back to the published dates?')) {
      return
    }
    setDraft(publishedEvents.map((e) => ({ ...e })))
  }

  /** Fill in any ids the new rows are missing, right before handing the file over. */
  function finished(): string {
    const taken = new Set(draft.map((e) => e.id).filter(Boolean))
    return toFileText(
      draft.map((e) => {
        if (e.id) return e
        const id = uniqueSlug(slugify(e.title), taken)
        taken.add(id)
        return { ...e, id }
      }),
    )
  }

  if (!authLoading && profile?.role !== 'committee') {
    return (
      <Shell title="Committee only" onNavigate={onNavigate}>
        <p className="max-w-note text-[15px] text-slate">
          Only committee accounts can set the season dates.
        </p>
      </Shell>
    )
  }

  return (
    <Shell
      title="Set the season dates"
      subtitle="Fill in the dates for the new season, then press Download and send the file that appears to whoever maintains the site. Nothing here changes the live calendar on its own."
      onNavigate={onNavigate}
    >
      <section className="mb-8 max-w-note rounded-[3px] border border-rule bg-ink-2/40 p-[clamp(18px,3vw,26px)]">
        <h2 className="m-0 font-mono text-[11px] uppercase tracking-[0.18em] text-gold">
          Start from last season
        </h2>
        <p className="mt-2 text-[14px] text-slate">
          Move every date forward at once, then correct the few that need it.{' '}
          <b className="font-medium text-linen">52 weeks keeps every event on the same
          day of the week</b> — a Sunday tournament stays on a Sunday — which a plain
          "same date next year" would not.
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <label htmlFor="weeks" className="text-[14px] text-linen">
            Move everything forward
          </label>
          <input
            id="weeks"
            type="number"
            value={weeks}
            onChange={(e) => setWeeks(e.target.value)}
            className="w-[86px] rounded-[2px] border border-rule bg-ink-2 px-3 py-2 text-[15px] text-linen focus:border-gold focus:outline-none"
          />
          <span className="text-[14px] text-linen">weeks</span>
          <button
            type="button"
            onClick={shiftSeason}
            className="rounded-[2px] border border-rule px-4 py-2 text-[13.5px] text-linen hover:border-gold hover:text-gold"
          >
            Move them
          </button>
          <button
            type="button"
            onClick={reset}
            className="rounded-[2px] px-2 py-2 text-[13.5px] text-slate underline decoration-slate/40 underline-offset-2 hover:text-linen"
          >
            Start over
          </button>
        </div>
      </section>

      <div className="mb-5 flex flex-wrap items-baseline justify-between gap-3">
        <p className="m-0 text-[15px] text-linen">
          {draft.length} {draft.length === 1 ? 'event' : 'events'}
          {span && <span className="text-slate"> · {span}</span>}
        </p>
        {problemCount > 0 && (
          <p className="m-0 text-[13.5px] text-madder">
            {problemCount} {problemCount === 1 ? 'event needs' : 'events need'} fixing
            before this can be saved.
          </p>
        )}
      </div>

      <ul className="m-0 list-none space-y-4 p-0">
        {draft.map((event, i) => (
          <li
            key={i}
            className="rounded-[3px] border border-rule bg-ink-2/40 p-[clamp(16px,3vw,22px)]"
          >
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="What is it called?" id={`title-${i}`} className="sm:col-span-2">
                <input
                  id={`title-${i}`}
                  type="text"
                  value={event.title}
                  onChange={(e) => update(i, { title: e.target.value })}
                  placeholder="MS Boys & Girls Basketball"
                  className={inputClass}
                />
              </Field>

              <Field
                label="Date"
                id={`date-${i}`}
                hint={ISO.test(event.date) ? dayOfWeekLong(event.date) : undefined}
              >
                <input
                  id={`date-${i}`}
                  type="date"
                  value={event.date}
                  onChange={(e) => update(i, { date: e.target.value })}
                  className={inputClass}
                />
              </Field>

              <Field
                label="Last day, if it runs across several"
                id={`end-${i}`}
                hint={
                  event.endDate && ISO.test(event.endDate)
                    ? dayOfWeekLong(event.endDate)
                    : 'Leave empty for a normal one-day event'
                }
              >
                <input
                  id={`end-${i}`}
                  type="date"
                  value={event.endDate ?? ''}
                  onChange={(e) => update(i, { endDate: e.target.value || null })}
                  className={inputClass}
                />
              </Field>

              <Field label="Time" id={`time-${i}`}>
                <input
                  id={`time-${i}`}
                  type="text"
                  value={event.time}
                  onChange={(e) => update(i, { time: e.target.value })}
                  placeholder="4:00–9:00 PM"
                  className={inputClass}
                />
              </Field>

              <Field label="Where" id={`venue-${i}`}>
                <input
                  id={`venue-${i}`}
                  type="text"
                  value={event.venue}
                  onChange={(e) => update(i, { venue: e.target.value })}
                  placeholder="St. Mary"
                  className={inputClass}
                />
              </Field>
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <label className="flex items-center gap-2.5 text-[14px] text-linen">
                <input
                  type="checkbox"
                  checked={event.milestone}
                  onChange={(e) => update(i, { milestone: e.target.checked })}
                  className="h-4 w-4 accent-[#D9A441]"
                />
                A deadline, not a gathering
              </label>

              <button
                type="button"
                onClick={() => removeEvent(i)}
                className="rounded-[2px] border border-rule px-3 py-1.5 text-[13px] text-slate hover:border-madder hover:text-madder"
              >
                Remove
              </button>
            </div>

            {problems[i].length > 0 && (
              <p role="alert" className="mt-3 m-0 text-[13.5px] text-madder">
                This {problems[i].join(', and ')}.
              </p>
            )}
          </li>
        ))}
      </ul>

      <p className="mt-5">
        <button
          type="button"
          onClick={addEvent}
          className="rounded-[2px] border border-rule px-4 py-2.5 text-[13.5px] text-linen hover:border-gold hover:text-gold"
        >
          Add another event
        </button>
      </p>

      <FileHandoff
        filename="events.json"
        text={finished}
        blockedBy={
          problemCount > 0
            ? `Fix the ${problemCount === 1 ? 'event' : 'events'} marked above first.`
            : undefined
        }
      />
    </Shell>
  )
}

const inputClass =
  'mt-2 w-full rounded-[2px] border border-rule bg-ink-2 px-3 py-2.5 text-[15px] text-linen placeholder:text-slate-dim focus:border-gold focus:outline-none'

function Field({
  label,
  id,
  hint,
  className = '',
  children,
}: {
  label: string
  id: string
  hint?: string
  className?: string
  children: React.ReactNode
}) {
  return (
    <div className={className}>
      <label
        htmlFor={id}
        className="block font-mono text-[11px] uppercase tracking-[0.18em] text-gold"
      >
        {label}
      </label>
      {children}
      {hint && <p className="mt-1.5 m-0 text-[13px] text-slate">{hint}</p>}
    </div>
  )
}
