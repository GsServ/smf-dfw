import { useMemo, useState } from 'react'
import { useAuth } from '../auth/AuthProvider'
import { site as publishedSite, type SiteConfig } from '../content'
import { emphasis } from '../lib/inlineFormat'
import Shell from '../components/portal/Shell'
import FileHandoff from '../components/portal/FileHandoff'

/**
 * The theme, the verse, the season year, and the banner across the top —
 * everything on the masthead that belongs to one season rather than to the
 * festival. Hands back `site.json`, like the other committee editors.
 */

/** Key order as the file is committed, so an untouched export is a zero-line diff. */
function toFileText(site: SiteConfig): string {
  return `${JSON.stringify(
    {
      seasonYear: site.seasonYear,
      draftBanner: { show: site.draftBanner.show, text: site.draftBanner.text.trim() },
      eyebrow: site.eyebrow.trim(),
      themeLines: site.themeLines.map((l) => l.trim()).filter(Boolean),
      verse: site.verse.trim(),
      calendarHeading: site.calendarHeading,
      rulesHeading: site.rulesHeading,
      rulesNote: site.rulesNote,
      footerLines: site.footerLines,
    },
    null,
    2,
  )}\n`
}

export default function SeasonTheme({ onNavigate }: { onNavigate: (p: string) => void }) {
  const { profile, loading: authLoading } = useAuth()
  const [draft, setDraft] = useState<SiteConfig>(() => ({
    ...publishedSite,
    draftBanner: { ...publishedSite.draftBanner },
    themeLines: [...publishedSite.themeLines],
  }))

  const problems = useMemo(() => {
    const found: string[] = []
    if (!/^\d{4}$/.test(String(draft.seasonYear))) found.push('The season year looks wrong.')
    if (draft.themeLines.every((l) => !l.trim())) found.push('The theme needs at least one line.')
    if (!draft.eyebrow.trim()) found.push('The line above the title cannot be empty.')
    if (draft.draftBanner.show && !draft.draftBanner.text.trim()) {
      found.push('The banner is switched on but has nothing to say.')
    }
    return found
  }, [draft])

  function set(patch: Partial<SiteConfig>) {
    setDraft((d) => ({ ...d, ...patch }))
  }

  function setLine(i: number, value: string) {
    setDraft((d) => ({ ...d, themeLines: d.themeLines.map((l, j) => (j === i ? value : l)) }))
  }

  if (!authLoading && profile?.role !== 'committee') {
    return (
      <Shell title="Committee only" onNavigate={onNavigate}>
        <p className="max-w-note text-[15px] text-slate">
          Only committee accounts can change the theme.
        </p>
      </Shell>
    )
  }

  return (
    <Shell
      title="Theme and banner"
      subtitle="The season year, the theme across the top of the page, and the notice strip. Press Download when you are done and send the file to whoever maintains the site."
      onNavigate={onNavigate}
    >
      <div className="max-w-note space-y-8">
        <section>
          <h2 className="m-0 font-mono text-[11px] uppercase tracking-[0.18em] text-gold">
            This season
          </h2>
          <label htmlFor="year" className="mt-3 block text-[14px] text-linen">
            Season year
          </label>
          <input
            id="year"
            type="number"
            value={draft.seasonYear}
            onChange={(e) => set({ seasonYear: Number(e.target.value) })}
            className={`${inputClass} w-[130px]`}
          />

          <label htmlFor="eyebrow" className="mt-5 block text-[14px] text-linen">
            The small line above the title
          </label>
          <input
            id="eyebrow"
            type="text"
            value={draft.eyebrow}
            onChange={(e) => set({ eyebrow: e.target.value })}
            className={inputClass}
          />
        </section>

        <section>
          <h2 className="m-0 font-mono text-[11px] uppercase tracking-[0.18em] text-gold">
            The theme
          </h2>
          <p className="mt-2 text-[14px] text-slate">
            One box per line of the big title. Put{' '}
            <code className="text-gold">*asterisks*</code> around the words that should
            be gold and italic.
          </p>

          {draft.themeLines.map((line, i) => (
            <input
              key={i}
              type="text"
              value={line}
              onChange={(e) => setLine(i, e.target.value)}
              aria-label={`Theme line ${i + 1}`}
              placeholder={i === 0 ? 'We Are More' : 'Than *Conquerors*'}
              className={inputClass}
            />
          ))}

          <div className="mt-3 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => set({ themeLines: [...draft.themeLines, ''] })}
              className="rounded-[2px] border border-rule px-3 py-1.5 text-[13px] text-linen hover:border-gold hover:text-gold"
            >
              Add a line
            </button>
            {draft.themeLines.length > 1 && (
              <button
                type="button"
                onClick={() => set({ themeLines: draft.themeLines.slice(0, -1) })}
                className="rounded-[2px] border border-rule px-3 py-1.5 text-[13px] text-slate hover:border-madder hover:text-madder"
              >
                Remove the last line
              </button>
            )}
          </div>

          <label htmlFor="verse" className="mt-5 block text-[14px] text-linen">
            The verse it comes from
          </label>
          <input
            id="verse"
            type="text"
            value={draft.verse}
            onChange={(e) => set({ verse: e.target.value })}
            placeholder="Romans 8:37"
            className={inputClass}
          />

          <div className="mt-6 rounded-[3px] border border-rule bg-ink-2/40 px-5 py-6 text-center">
            <p className="m-0 font-mono text-[10px] uppercase tracking-[0.24em] text-slate">
              How it will look
            </p>
            <p className="mt-4 font-display text-[clamp(26px,5vw,40px)] font-normal leading-[1.05] text-linen-2">
              {draft.themeLines.map((line, i) => (
                <span key={i} className="block">
                  {emphasis(line, 'italic text-gold')}
                </span>
              ))}
            </p>
            {draft.verse.trim() && (
              <p className="mt-3 font-mono text-[11px] uppercase tracking-[0.2em] text-slate">
                {draft.verse}
              </p>
            )}
          </div>
        </section>

        <section>
          <h2 className="m-0 font-mono text-[11px] uppercase tracking-[0.18em] text-gold">
            The notice strip
          </h2>
          <p className="mt-2 text-[14px] text-slate">
            The red band across the very top. Use it while a season is still being put
            together, and switch it off once the dates are confirmed — an announcement
            with a "not confirmed" strip on it is worse than no announcement.
          </p>

          <label className="mt-4 flex items-center gap-2.5 text-[14px] text-linen">
            <input
              type="checkbox"
              checked={draft.draftBanner.show}
              onChange={(e) =>
                set({ draftBanner: { ...draft.draftBanner, show: e.target.checked } })
              }
              className="h-4 w-4 accent-[#D9A441]"
            />
            Show the strip
          </label>

          <input
            type="text"
            value={draft.draftBanner.text}
            onChange={(e) =>
              set({ draftBanner: { ...draft.draftBanner, text: e.target.value } })
            }
            aria-label="What the strip says"
            disabled={!draft.draftBanner.show}
            placeholder="2027 dates not yet confirmed"
            className={`${inputClass} disabled:opacity-50`}
          />

          {draft.draftBanner.show && draft.draftBanner.text.trim() && (
            <div className="mt-4 bg-madder px-3 py-[7px] text-center font-mono text-[11px] uppercase tracking-[0.14em] text-white">
              {draft.draftBanner.text}
            </div>
          )}
        </section>
      </div>

      <FileHandoff
        filename="site.json"
        text={() => toFileText(draft)}
        blockedBy={problems[0]}
      />
    </Shell>
  )
}

const inputClass =
  'mt-2 w-full rounded-[2px] border border-rule bg-ink-2 px-3 py-2.5 text-[15px] text-linen placeholder:text-slate-dim focus:border-gold focus:outline-none'
