/**
 * The single place the site loads its content from.
 *
 * Phase 1 reads flat JSON files that sit next to this one. When Phase 2 moves
 * content into Supabase, only this file changes — every component keeps
 * importing from here and none of them need to know where the data came from.
 */
import eventsJson from './events.json'
import rulesJson from './rules.json'
import churchesJson from './churches.json'
import siteJson from './site.json'

export interface FestivalEvent {
  id: string
  /** ISO date, YYYY-MM-DD. Read as a local date, never UTC. */
  date: string
  /** ISO date. Non-null renders a range and keeps the event current until it passes. */
  endDate: string | null
  title: string
  time: string
  venue: string
  /** Deadlines rather than gatherings. Renders italic. */
  milestone: boolean
  notes: string | null
}

export interface RuleGroup {
  id: string
  heading: string
  /** Free text, e.g. "Posted Jul 1 · updated Jul 8". */
  posted: string
  defaultOpen: boolean
  /** Supports **bold** only. */
  items: string[]
}

export interface SiteConfig {
  seasonYear: number
  draftBanner: { show: boolean; text: string }
  eyebrow: string
  /** One string per line. *asterisks* mark the emphasised words. */
  themeLines: string[]
  verse: string
  calendarHeading: string
  rulesHeading: string
  rulesNote: string
  footerLines: string[]
}

/** Events, always in date order regardless of how they were typed into the JSON. */
export const events: FestivalEvent[] = [...(eventsJson as FestivalEvent[])].sort(
  (a, b) => a.date.localeCompare(b.date),
)

export const rules: RuleGroup[] = rulesJson as RuleGroup[]
export const churches: string[] = churchesJson as string[]
export const site: SiteConfig = siteJson as SiteConfig
