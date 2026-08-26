import { useMemo, useState } from 'react'
import { useAuth } from '../auth/AuthProvider'
import { rules as publishedRules, type RuleGroup } from '../content'
import { shortDate, startOfToday, toIso } from '../lib/dates'
import Shell from '../components/portal/Shell'
import FileHandoff from '../components/portal/FileHandoff'

/**
 * The rules, editable without opening a text file. Same bargain as the season
 * dates: nothing is written to the database, and the screen ends by handing
 * back a finished `rules.json`.
 */

function blankGroup(): RuleGroup {
  return { id: '', heading: '', posted: '', defaultOpen: false, items: [''] }
}

function slugify(heading: string): string {
  return (
    heading
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 40) || 'rules'
  )
}

function uniqueSlug(base: string, taken: Set<string>): string {
  if (!taken.has(base)) return base
  for (let n = 2; ; n++) {
    const candidate = `${base}-${n}`
    if (!taken.has(candidate)) return candidate
  }
}

/** "Posted Jul 22" — the convention the whole file already follows. */
function postedToday(today: string): string {
  return `Posted ${shortDate(today)}`
}

/** "Posted Jul 1 · updated Aug 12", replacing any previous update note. */
function updatedToday(posted: string, today: string): string {
  const base = posted.split('·')[0].trim() || postedToday(today)
  // A rule posted and updated on the same day was simply posted.
  if (base === postedToday(today)) return base
  return `${base} · updated ${shortDate(today)}`
}

function liveItems(group: RuleGroup): string[] {
  return group.items.map((i) => i.trim()).filter(Boolean)
}

function problemsFor(group: RuleGroup, index: number, all: RuleGroup[]): string[] {
  const found: string[] = []
  if (!group.heading.trim()) found.push('needs a heading')
  if (liveItems(group).length === 0) found.push('has no rules in it')
  if (!group.posted.trim()) found.push('needs a "posted" note')
  if (all.some((other, i) => i !== index && other.id && other.id === group.id)) {
    found.push('shares an id with another section')
  }
  const unbalanced = liveItems(group).filter(
    (item) => (item.match(/\*\*/g) ?? []).length % 2 !== 0,
  )
  if (unbalanced.length > 0) {
    found.push('has a ** that is never closed, so the bold would run on')
  }
  return found
}

/** The file, formatted exactly as it is committed. */
function toFileText(groups: RuleGroup[]): string {
  const ordered = groups.map((g) => ({
    id: g.id,
    heading: g.heading.trim(),
    posted: g.posted.trim(),
    defaultOpen: g.defaultOpen,
    items: liveItems(g),
  }))
  return `${JSON.stringify(ordered, null, 2)}\n`
}

export default function SeasonRules({ onNavigate }: { onNavigate: (p: string) => void }) {
  const { profile, loading: authLoading } = useAuth()
  const [draft, setDraft] = useState<RuleGroup[]>(() =>
    publishedRules.map((g) => ({ ...g, items: [...g.items] })),
  )
  const today = useMemo(() => toIso(startOfToday()), [])

  const problems = useMemo(() => draft.map((g, i) => problemsFor(g, i, draft)), [draft])
  const problemCount = problems.filter((p) => p.length > 0).length
  const openCount = draft.filter((g) => g.defaultOpen).length

  function update(index: number, patch: Partial<RuleGroup>) {
    setDraft((rows) => rows.map((row, i) => (i === index ? { ...row, ...patch } : row)))
  }

  function moveGroup(index: number, by: number) {
    const to = index + by
    if (to < 0 || to >= draft.length) return
    setDraft((rows) => {
      const next = [...rows]
      ;[next[index], next[to]] = [next[to], next[index]]
      return next
    })
  }

  function setItem(gi: number, ii: number, value: string) {
    setDraft((rows) =>
      rows.map((row, i) =>
        i === gi ? { ...row, items: row.items.map((v, j) => (j === ii ? value : v)) } : row,
      ),
    )
  }

  function addItem(gi: number) {
    setDraft((rows) =>
      rows.map((row, i) => (i === gi ? { ...row, items: [...row.items, ''] } : row)),
    )
  }

  function removeItem(gi: number, ii: number) {
    setDraft((rows) =>
      rows.map((row, i) =>
        i === gi ? { ...row, items: row.items.filter((_, j) => j !== ii) } : row,
      ),
    )
  }

  function moveItem(gi: number, ii: number, by: number) {
    const to = ii + by
    setDraft((rows) =>
      rows.map((row, i) => {
        if (i !== gi || to < 0 || to >= row.items.length) return row
        const items = [...row.items]
        ;[items[ii], items[to]] = [items[to], items[ii]]
        return { ...row, items }
      }),
    )
  }

  function removeGroup(index: number) {
    const name = draft[index].heading.trim() || 'this section'
    if (!window.confirm(`Remove the ${name} section and every rule in it?`)) return
    setDraft((rows) => rows.filter((_, i) => i !== index))
  }

  function reset() {
    if (!window.confirm('Throw away your changes and go back to the published rules?')) {
      return
    }
    setDraft(publishedRules.map((g) => ({ ...g, items: [...g.items] })))
  }

  function finished(): string {
    const taken = new Set(draft.map((g) => g.id).filter(Boolean))
    return toFileText(
      draft.map((g) => {
        if (g.id) return g
        const id = uniqueSlug(slugify(g.heading), taken)
        taken.add(id)
        return { ...g, id }
      }),
    )
  }

  if (!authLoading && profile?.role !== 'committee') {
    return (
      <Shell title="Committee only" onNavigate={onNavigate}>
        <p className="max-w-note text-[15px] text-slate">
          Only committee accounts can edit the rules.
        </p>
      </Shell>
    )
  }

  return (
    <Shell
      title="Edit the rules"
      subtitle="Every rule on the public calendar. Change the wording, add a section, or mark a rule as updated — then press Download and send the file to whoever maintains the site."
      onNavigate={onNavigate}
    >
      <section className="mb-8 max-w-note rounded-[3px] border border-rule bg-ink-2/40 p-[clamp(18px,3vw,26px)]">
        <h2 className="m-0 font-mono text-[11px] uppercase tracking-[0.18em] text-gold">
          Two things worth knowing
        </h2>
        <p className="mt-2 text-[14px] text-slate">
          <b className="font-medium text-linen">Keep the posted note honest.</b> It is
          how a servant tells whether they are reading the current version. The two
          buttons on each section write it in the usual wording for you.
        </p>
        <p className="mt-2 text-[14px] text-slate">
          <b className="font-medium text-linen">Wrap words in ** to make them bold</b> —{' '}
          <code className="text-gold">a team is **7 minimum**</code>. That is the only
          formatting there is, which is what keeps the rules readable.
        </p>
        <p className="mt-4">
          <button
            type="button"
            onClick={reset}
            className="text-[13.5px] text-slate underline decoration-slate/40 underline-offset-2 hover:text-linen"
          >
            Start over from the published rules
          </button>
        </p>
      </section>

      <div className="mb-5 flex flex-wrap items-baseline justify-between gap-3">
        <p className="m-0 text-[15px] text-linen">
          {draft.length} {draft.length === 1 ? 'section' : 'sections'}
          <span className="text-slate">
            {' '}
            · {draft.reduce((n, g) => n + liveItems(g).length, 0)} rules
          </span>
        </p>
        {problemCount > 0 && (
          <p className="m-0 text-[13.5px] text-madder">
            {problemCount} {problemCount === 1 ? 'section needs' : 'sections need'}{' '}
            fixing before this can be saved.
          </p>
        )}
      </div>

      {openCount > 1 && (
        <p className="mb-5 rounded-[3px] border border-gold/40 bg-gold/[0.07] px-4 py-3 text-[13.5px] text-linen">
          {openCount} sections are set to open automatically. If everything is open,
          nothing stands out — usually only the first one should be.
        </p>
      )}

      <ul className="m-0 list-none space-y-5 p-0">
        {draft.map((group, gi) => (
          <li
            key={gi}
            className="rounded-[3px] border border-rule bg-ink-2/40 p-[clamp(16px,3vw,22px)]"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-[240px] flex-1">
                <label
                  htmlFor={`heading-${gi}`}
                  className="block font-mono text-[11px] uppercase tracking-[0.18em] text-gold"
                >
                  Section heading
                </label>
                <input
                  id={`heading-${gi}`}
                  type="text"
                  value={group.heading}
                  onChange={(e) => update(gi, { heading: e.target.value })}
                  placeholder="Jeopardy teams"
                  className={inputClass}
                />
              </div>
              <div className="flex shrink-0 gap-1.5 pt-6">
                <Nudge label="Move section up" onClick={() => moveGroup(gi, -1)} disabled={gi === 0}>
                  ↑
                </Nudge>
                <Nudge
                  label="Move section down"
                  onClick={() => moveGroup(gi, 1)}
                  disabled={gi === draft.length - 1}
                >
                  ↓
                </Nudge>
              </div>
            </div>

            <div className="mt-4">
              <label
                htmlFor={`posted-${gi}`}
                className="block font-mono text-[11px] uppercase tracking-[0.18em] text-gold"
              >
                When was this posted?
              </label>
              <input
                id={`posted-${gi}`}
                type="text"
                value={group.posted}
                onChange={(e) => update(gi, { posted: e.target.value })}
                placeholder="Posted Jul 1 · updated Jul 8"
                className={inputClass}
              />
              <div className="mt-2 flex flex-wrap gap-2">
                <Chip onClick={() => update(gi, { posted: postedToday(today) })}>
                  Posted today
                </Chip>
                <Chip onClick={() => update(gi, { posted: updatedToday(group.posted, today) })}>
                  Updated today
                </Chip>
              </div>
            </div>

            <p className="mt-5 font-mono text-[11px] uppercase tracking-[0.18em] text-gold">
              The rules in this section
            </p>
            <ul className="m-0 mt-2 list-none space-y-2 p-0">
              {group.items.map((item, ii) => (
                <li key={ii} className="flex items-start gap-2">
                  <textarea
                    rows={2}
                    value={item}
                    onChange={(e) => setItem(gi, ii, e.target.value)}
                    aria-label={`Rule ${ii + 1} in ${group.heading || 'this section'}`}
                    placeholder="A team is **7 youth minimum, 10 maximum**."
                    className="w-full rounded-[2px] border border-rule bg-ink-2 px-3 py-2.5 text-[15px] leading-snug text-linen placeholder:text-slate-dim focus:border-gold focus:outline-none"
                  />
                  <div className="flex shrink-0 flex-col gap-1">
                    <Nudge label="Move rule up" onClick={() => moveItem(gi, ii, -1)} disabled={ii === 0}>
                      ↑
                    </Nudge>
                    <Nudge
                      label="Move rule down"
                      onClick={() => moveItem(gi, ii, 1)}
                      disabled={ii === group.items.length - 1}
                    >
                      ↓
                    </Nudge>
                    <Nudge label="Remove this rule" onClick={() => removeItem(gi, ii)}>
                      ×
                    </Nudge>
                  </div>
                </li>
              ))}
            </ul>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-4">
                <button
                  type="button"
                  onClick={() => addItem(gi)}
                  className="rounded-[2px] border border-rule px-3 py-1.5 text-[13px] text-linen hover:border-gold hover:text-gold"
                >
                  Add a rule
                </button>
                <label className="flex items-center gap-2.5 text-[13.5px] text-linen">
                  <input
                    type="checkbox"
                    checked={group.defaultOpen}
                    onChange={(e) => update(gi, { defaultOpen: e.target.checked })}
                    className="h-4 w-4 accent-[#D9A441]"
                  />
                  Open this section automatically
                </label>
              </div>
              <button
                type="button"
                onClick={() => removeGroup(gi)}
                className="rounded-[2px] border border-rule px-3 py-1.5 text-[13px] text-slate hover:border-madder hover:text-madder"
              >
                Remove section
              </button>
            </div>

            {problems[gi].length > 0 && (
              <p role="alert" className="m-0 mt-3 text-[13.5px] text-madder">
                This section {problems[gi].join(', and ')}.
              </p>
            )}
          </li>
        ))}
      </ul>

      <p className="mt-5">
        <button
          type="button"
          onClick={() => setDraft((rows) => [...rows, blankGroup()])}
          className="rounded-[2px] border border-rule px-4 py-2.5 text-[13.5px] text-linen hover:border-gold hover:text-gold"
        >
          Add another section
        </button>
      </p>

      <FileHandoff
        filename="rules.json"
        text={finished}
        blockedBy={
          problemCount > 0
            ? `Fix the ${problemCount === 1 ? 'section' : 'sections'} marked above first.`
            : undefined
        }
      />
    </Shell>
  )
}

const inputClass =
  'mt-2 w-full rounded-[2px] border border-rule bg-ink-2 px-3 py-2.5 text-[15px] text-linen placeholder:text-slate-dim focus:border-gold focus:outline-none'

function Nudge({
  label,
  onClick,
  disabled,
  children,
}: {
  label: string
  onClick: () => void
  disabled?: boolean
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled}
      className="h-7 w-7 rounded-[2px] border border-rule text-[13px] text-slate hover:border-gold hover:text-gold disabled:opacity-30 disabled:hover:border-rule disabled:hover:text-slate"
    >
      {children}
    </button>
  )
}

function Chip({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-[2px] border border-rule px-2.5 py-1 font-mono text-[10.5px] uppercase tracking-[0.14em] text-slate hover:border-gold hover:text-gold"
    >
      {children}
    </button>
  )
}
