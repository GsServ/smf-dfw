import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../auth/AuthProvider'
import { events, rules, site } from '../content'
import { shortDate } from '../lib/dates'
import Shell from '../components/portal/Shell'

/**
 * What has to happen at the start of a season, in the order it happens.
 *
 * The steps themselves are defined here rather than in the database so their
 * wording can be improved without a migration; the database only remembers
 * which ones are ticked, and anything the committee adds itself.
 */

interface Step {
  slug: string
  title: string
  detail: string
  route?: string
  /** Not self-service — it needs whoever maintains the site. */
  byMaintainer?: boolean
}

const STEPS: Step[] = [
  {
    slug: 'theme',
    title: 'Set the theme and the verse',
    detail:
      'The theme changes every year and it is the largest thing on the page, which makes it the most obvious thing to be left over from last season.',
    route: '/theme',
  },
  {
    slug: 'dates',
    title: 'Set the season dates',
    detail:
      'Start by moving last season forward 52 weeks — that keeps every event on the same day of the week — then correct the few that need it.',
    route: '/dates',
  },
  {
    slug: 'venues',
    title: 'Confirm who is hosting each event',
    detail:
      'Hosting rotates between the churches. The venue sits beside each event on the same screen as the dates.',
    route: '/dates',
  },
  {
    slug: 'rules',
    title: 'Go through the rules',
    detail:
      'Change what changed, and update the posted note on anything you touch. Watch for rules that say "this year" — they were decided about a season that has finished.',
    route: '/rules',
  },
  {
    slug: 'documents',
    title: "Take down last season's attachments",
    detail:
      'Any PDF or photo posted against last season stays on the calendar until somebody removes it.',
    route: '/documents',
  },
  {
    slug: 'requests',
    title: "Close last season's forms and open this year's",
    detail:
      'Not self-service yet — ask whoever maintains the site. If last season\'s forms are left open, churches show as having already sent things they have not sent.',
    byMaintainer: true,
  },
  {
    slug: 'reps',
    title: 'Update who can sign in for each church',
    detail:
      'Servants change. The maintainer adds the new representatives and removes the ones who have moved on; nobody can sign in who has not been added.',
    byMaintainer: true,
  },
  {
    slug: 'banner',
    title: 'Take the notice strip down',
    detail:
      'Last of all, once the dates are genuinely confirmed. Until then it is the only thing on the page telling people not to plan around them.',
    route: '/theme',
  },
]

interface TaskRow {
  id: string
  slug: string
  label: string | null
  sort_order: number
  done_at: string | null
}

/** Facts read straight off what is deployed, so the page cannot flatter itself. */
function siteFacts(seasonYear: number) {
  const dates = events.map((e) => e.date).sort()
  const years = [...new Set(dates.map((d) => d.slice(0, 4)))]
  return [
    { label: 'The site says', value: String(site.seasonYear), off: site.seasonYear !== seasonYear },
    {
      label: 'Notice strip',
      value: site.draftBanner.show ? `showing — "${site.draftBanner.text}"` : 'off',
      off: false,
    },
    {
      label: 'Calendar',
      value: dates.length
        ? `${events.length} events, ${shortDate(dates[0])} – ${shortDate(dates[dates.length - 1])} ${years.join(' and ')}`
        : 'empty',
      off: years.some((y) => y !== String(seasonYear)),
    },
    {
      label: 'Rules',
      value: `${rules.length} sections · ${rules.map((r) => r.posted).join(' / ')}`,
      off: false,
    },
  ]
}

export default function SeasonStart({ onNavigate }: { onNavigate: (p: string) => void }) {
  const { profile, loading: authLoading } = useAuth()
  const [year, setYear] = useState(site.seasonYear)
  const [tasks, setTasks] = useState<TaskRow[]>([])
  const [loading, setLoading] = useState(true)
  const [newLabel, setNewLabel] = useState('')
  const [busy, setBusy] = useState(false)

  const load = useCallback(async (seasonYear: number) => {
    if (!supabase) return
    const { data } = await supabase
      .from('season_tasks')
      .select('id, slug, label, sort_order, done_at')
      .eq('season_year', seasonYear)
    setTasks((data as TaskRow[]) ?? [])
    setLoading(false)
  }, [])

  useEffect(() => {
    if (profile?.role !== 'committee') return
    setLoading(true)
    load(year)
  }, [profile?.role, year, load])

  const bySlug = useMemo(
    () => new Map(tasks.map((t) => [t.slug, t])),
    [tasks],
  )
  const custom = useMemo(
    () => tasks.filter((t) => t.label).sort((a, b) => a.sort_order - b.sort_order),
    [tasks],
  )
  const all = [...STEPS.map((s) => s.slug), ...custom.map((c) => c.slug)]
  const doneCount = all.filter((slug) => bySlug.get(slug)?.done_at).length

  async function toggle(slug: string, label: string | null) {
    if (!supabase) return
    const done = Boolean(bySlug.get(slug)?.done_at)
    setBusy(true)
    await supabase.from('season_tasks').upsert(
      {
        season_year: year,
        slug,
        label,
        done_at: done ? null : new Date().toISOString(),
        done_by: done ? null : profile?.user_id,
      },
      { onConflict: 'season_year,slug' },
    )
    await load(year)
    setBusy(false)
  }

  async function addCustom() {
    if (!supabase || !newLabel.trim()) return
    setBusy(true)
    await supabase.from('season_tasks').insert({
      season_year: year,
      slug: `own-${Date.now()}`,
      label: newLabel.trim(),
      sort_order: custom.length,
    })
    setNewLabel('')
    await load(year)
    setBusy(false)
  }

  async function removeCustom(task: TaskRow) {
    if (!supabase) return
    if (!window.confirm(`Remove "${task.label}" from the list?`)) return
    setBusy(true)
    await supabase.from('season_tasks').delete().eq('id', task.id)
    await load(year)
    setBusy(false)
  }

  if (!authLoading && profile?.role !== 'committee') {
    return (
      <Shell title="Committee only" onNavigate={onNavigate}>
        <p className="max-w-note text-[15px] text-slate">
          This is the committee's start-of-season list.
        </p>
      </Shell>
    )
  }

  const facts = siteFacts(year)

  return (
    <Shell
      title="Starting a new season"
      subtitle="Everything that has to change when a season turns over, in the order it usually happens. Tick things off as you go — the list is kept, so you can leave it and come back."
      onNavigate={onNavigate}
    >
      <div className="mb-8 flex flex-wrap items-center gap-4">
        <label htmlFor="season" className="font-mono text-[11px] uppercase tracking-[0.18em] text-gold">
          Season
        </label>
        <input
          id="season"
          type="number"
          value={year}
          onChange={(e) => setYear(Number(e.target.value))}
          className="w-[110px] rounded-[2px] border border-rule bg-ink-2 px-3 py-2 text-[15px] text-linen focus:border-gold focus:outline-none"
        />
        {!loading && (
          <p className="m-0 text-[15px] text-linen">
            {doneCount} of {all.length} done
          </p>
        )}
      </div>

      <section className="mb-8 rounded-[3px] border border-rule bg-ink-2/40 p-[clamp(16px,3vw,22px)]">
        <h2 className="m-0 font-mono text-[11px] uppercase tracking-[0.18em] text-gold">
          What the live site says right now
        </h2>
        <dl className="m-0 mt-3 grid grid-cols-1 gap-x-8 gap-y-2 sm:grid-cols-[auto_1fr]">
          {facts.map((f) => (
            <div key={f.label} className="contents">
              <dt className="text-[13.5px] text-slate">{f.label}</dt>
              <dd
                className={`m-0 text-[14px] ${f.off ? 'text-gold' : 'text-linen'}`}
              >
                {f.value}
                {f.off && <span className="text-slate"> · not this season</span>}
              </dd>
            </div>
          ))}
        </dl>
      </section>

      {loading ? (
        <p className="text-[15px] text-slate">Loading…</p>
      ) : (
        <>
          <ol className="m-0 list-none space-y-3 p-0">
            {STEPS.map((step, i) => (
              <Row
                key={step.slug}
                number={i + 1}
                title={step.title}
                detail={step.detail}
                done={Boolean(bySlug.get(step.slug)?.done_at)}
                busy={busy}
                onToggle={() => toggle(step.slug, null)}
                action={
                  step.route ? (
                    <button
                      type="button"
                      onClick={() => onNavigate(step.route!)}
                      className="shrink-0 rounded-[2px] border border-rule px-3 py-1.5 text-[13px] text-linen hover:border-gold hover:text-gold"
                    >
                      Open →
                    </button>
                  ) : step.byMaintainer ? (
                    <span className="shrink-0 font-mono text-[10.5px] uppercase tracking-[0.14em] text-slate">
                      Maintainer
                    </span>
                  ) : null
                }
              />
            ))}

            {custom.map((task, i) => (
              <Row
                key={task.id}
                number={STEPS.length + i + 1}
                title={task.label ?? ''}
                done={Boolean(task.done_at)}
                busy={busy}
                onToggle={() => toggle(task.slug, task.label)}
                action={
                  <button
                    type="button"
                    onClick={() => removeCustom(task)}
                    className="shrink-0 rounded-[2px] border border-rule px-3 py-1.5 text-[13px] text-slate hover:border-madder hover:text-madder"
                  >
                    Remove
                  </button>
                }
              />
            ))}
          </ol>

          <div className="mt-6 flex max-w-note flex-wrap items-end gap-3">
            <div className="min-w-[220px] flex-1">
              <label
                htmlFor="own"
                className="block font-mono text-[11px] uppercase tracking-[0.18em] text-gold"
              >
                Anything else you want to remember
              </label>
              <input
                id="own"
                type="text"
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addCustom()}
                placeholder="Ask St. Marina about the hall"
                className="mt-2 w-full rounded-[2px] border border-rule bg-ink-2 px-3 py-2.5 text-[15px] text-linen placeholder:text-slate-dim focus:border-gold focus:outline-none"
              />
            </div>
            <button
              type="button"
              onClick={addCustom}
              disabled={busy || !newLabel.trim()}
              className="rounded-[2px] border border-rule px-4 py-2.5 text-[13.5px] text-linen hover:border-gold hover:text-gold disabled:opacity-50"
            >
              Add to the list
            </button>
          </div>
        </>
      )}
    </Shell>
  )
}

function Row({
  number,
  title,
  detail,
  done,
  busy,
  onToggle,
  action,
}: {
  number: number
  title: string
  detail?: string
  done: boolean
  busy: boolean
  onToggle: () => void
  action?: React.ReactNode
}) {
  return (
    <li
      className={`rounded-[3px] border p-[clamp(14px,2.5vw,20px)] ${
        done ? 'border-verd/30 bg-verd/[0.05]' : 'border-rule bg-ink-2/40'
      }`}
    >
      <div className="flex flex-wrap items-start gap-4">
        <label className="flex min-w-[240px] flex-1 cursor-pointer items-start gap-3">
          <input
            type="checkbox"
            checked={done}
            disabled={busy}
            onChange={onToggle}
            className="mt-1 h-4 w-4 shrink-0 accent-[#4E9E86]"
          />
          <span>
            <span
              className={`block font-display text-[18px] ${
                done ? 'text-slate line-through decoration-slate/50' : 'text-linen-2'
              }`}
            >
              <span className="font-mono text-[12px] text-gold-label">{number}. </span>
              {title}
            </span>
            {detail && <span className="mt-1 block text-[13.5px] text-slate">{detail}</span>}
          </span>
        </label>
        {action}
      </div>
    </li>
  )
}
