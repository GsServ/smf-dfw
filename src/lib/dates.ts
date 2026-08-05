import type { FestivalEvent } from '../content'

const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const DOW_LONG = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
]
const MON = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
]

/**
 * Build a Date at local midnight from a YYYY-MM-DD string.
 * `new Date("2026-08-08")` would parse as UTC and land on the previous day for
 * anyone west of Greenwich — which is everybody reading this site.
 */
export function parseDate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d)
}

/** Today at local midnight, so comparisons are day-level and not time-of-day. */
export function startOfToday(now: Date = new Date()): Date {
  return new Date(now.getFullYear(), now.getMonth(), now.getDate())
}

/** An event is past once its end date (or its date) is before today. */
export function isPast(event: FestivalEvent, today: Date): boolean {
  return parseDate(event.endDate ?? event.date) < today
}

/** Index of the first event that has not finished yet, or -1 if the season is over. */
export function findNextIndex(events: FestivalEvent[], today: Date): number {
  return events.findIndex((event) => !isPast(event, today))
}

export function daysUntil(iso: string, today: Date): number {
  return Math.round((parseDate(iso).getTime() - today.getTime()) / 86_400_000)
}

export function dayOfWeek(iso: string): string {
  return DOW[parseDate(iso).getDay()]
}

export function dayOfWeekLong(iso: string): string {
  return DOW_LONG[parseDate(iso).getDay()]
}

/** "Aug 8", or "Jul 18–26" when an end date is present. */
export function shortDate(iso: string, endIso?: string | null): string {
  const start = parseDate(iso)
  const base = `${MON[start.getMonth()]} ${start.getDate()}`
  if (!endIso) return base

  const end = parseDate(endIso)
  return end.getMonth() === start.getMonth()
    ? `${base}–${end.getDate()}`
    : `${base}–${MON[end.getMonth()]} ${end.getDate()}`
}

/** "Saturday, Aug 8" — used by the next-event panel. */
export function longDate(iso: string): string {
  const d = parseDate(iso)
  return `${dayOfWeekLong(iso)}, ${MON[d.getMonth()]} ${d.getDate()}`
}
