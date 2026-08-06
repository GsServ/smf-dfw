import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../auth/AuthProvider'
import Shell from '../components/portal/Shell'
import type { SubmissionStatus } from '../components/portal/StatusPill'

interface GridRow {
  request_id: string
  request_title: string
  due_date: string | null
  sort_order: number
  church_id: string
  church_name: string
  church_sort_order: number
  status: SubmissionStatus
  submission_id: string | null
  exception_count: number
  exceptions: string[] | null
  note: string | null
  approved_at: string | null
  needs_review: boolean
}

type CellState = SubmissionStatus | 'needs_review' | 'approved'

function cellState(r: GridRow): CellState {
  if (r.status !== 'submitted') return r.status
  if (r.exception_count === 0) return 'submitted'
  return r.approved_at ? 'approved' : 'needs_review'
}

/**
 * Nine churches down, open requests across — answering the question Fr Akhnoukh
 * currently answers by scrolling WhatsApp: who has not sent it yet.
 *
 * Anything breaking a posted rule surfaces above the grid, because a flag buried
 * in a cell is a flag nobody acts on.
 */
export default function Committee({ onNavigate }: { onNavigate: (p: string) => void }) {
  const { profile, loading: authLoading } = useAuth()
  const [rows, setRows] = useState<GridRow[]>([])
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!supabase) return
    const { data } = await supabase.from('request_status_grid').select('*')
    setRows((data as GridRow[]) ?? [])
    setLoading(false)
  }, [])

  useEffect(() => {
    if (profile?.role !== 'committee') return
    load()
  }, [profile?.role, load])

  async function decide(submissionId: string, approve: boolean) {
    if (!supabase) return
    setBusyId(submissionId)
    await supabase.rpc('approve_submission', {
      p_submission_id: submissionId,
      p_approve: approve,
    })
    await load()
    setBusyId(null)
  }

  const { churches, requests, cells, outstanding, review } = useMemo(() => {
    const churchMap = new Map<string, { id: string; name: string; sort: number }>()
    const requestMap = new Map<string, { id: string; title: string; due: string | null; sort: number }>()
    const cells = new Map<string, GridRow>()

    for (const r of rows) {
      churchMap.set(r.church_id, { id: r.church_id, name: r.church_name, sort: r.church_sort_order })
      requestMap.set(r.request_id, { id: r.request_id, title: r.request_title, due: r.due_date, sort: r.sort_order })
      cells.set(`${r.church_id}:${r.request_id}`, r)
    }

    return {
      churches: [...churchMap.values()].sort((a, b) => a.sort - b.sort),
      requests: [...requestMap.values()].sort((a, b) => a.sort - b.sort),
      cells,
      outstanding: rows.filter((r) => r.status !== 'submitted').length,
      review: rows.filter((r) => r.needs_review),
    }
  }, [rows])

  if (!authLoading && profile?.role !== 'committee') {
    return (
      <Shell title="Committee only" onNavigate={onNavigate}>
        <p className="max-w-note text-[15px] text-slate">
          This page is for committee accounts. If you represent a church, your
          submissions are on the portal page.
        </p>
      </Shell>
    )
  }

  return (
    <Shell
      title="Who still owes what"
      subtitle={
        loading
          ? 'Loading…'
          : `${outstanding} outstanding across ${churches.length} churches.` +
            (review.length ? ` ${review.length} waiting on your decision.` : '')
      }
      onNavigate={onNavigate}
    >
      {loading ? (
        <p className="text-[15px] text-slate">Loading…</p>
      ) : (
        <>
          {review.length > 0 && (
            <section
              className="mb-8 rounded-[3px] border border-gold/50 bg-gold/[0.07]"
              aria-labelledby="review-heading"
            >
              <h2
                id="review-heading"
                className="m-0 border-b border-gold/30 px-5 py-3 font-mono text-[11px] uppercase tracking-[0.2em] text-gold"
              >
                Exceptions waiting on you
              </h2>

              <ul className="m-0 list-none p-0">
                {review.map((r) => (
                  <li
                    key={r.submission_id}
                    className="flex flex-wrap items-start justify-between gap-4 border-b border-gold/20 px-5 py-4 last:border-b-0"
                  >
                    <div className="min-w-[240px] flex-1">
                      <p className="m-0 font-display text-[17px] text-linen-2">
                        {r.church_name} — {r.request_title}
                      </p>
                      <ul className="mt-1.5 list-none space-y-1 p-0">
                        {(r.exceptions ?? []).map((e, i) => (
                          <li key={i} className="text-[13.5px] text-gold">
                            {e}
                          </li>
                        ))}
                      </ul>
                      {r.note && (
                        <p className="mt-2 max-w-prose border-l-2 border-gold/40 pl-3 text-[13.5px] italic text-linen">
                          “{r.note}”
                        </p>
                      )}
                    </div>

                    <button
                      type="button"
                      disabled={busyId === r.submission_id}
                      onClick={() => decide(r.submission_id!, true)}
                      className="shrink-0 rounded-[2px] bg-gold px-4 py-2 text-[13px] font-medium text-ink hover:bg-[#E9B857] disabled:opacity-60"
                    >
                      {busyId === r.submission_id ? 'Saving…' : 'Approve'}
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <div className="overflow-x-auto rounded-[3px] border border-rule">
            <table className="w-full border-collapse text-left">
              <caption className="sr-only">
                Submission status for each church against each open request
              </caption>
              <thead>
                <tr>
                  <th
                    scope="col"
                    className="sticky left-0 z-10 bg-ink px-4 py-3 font-mono text-[10.5px] uppercase tracking-[0.14em] text-slate"
                  >
                    Church
                  </th>
                  {requests.map((r) => (
                    <th
                      key={r.id}
                      scope="col"
                      className="min-w-[150px] border-l border-rule-faint px-4 py-3 align-bottom font-display text-[15px] font-normal text-linen-2"
                    >
                      {r.title}
                      {r.due && (
                        <span className="mt-1 block font-mono text-[10px] uppercase tracking-[0.14em] text-gold-label">
                          Due {r.due}
                        </span>
                      )}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {churches.map((c) => (
                  <tr key={c.id} className="border-t border-rule-faint">
                    <th
                      scope="row"
                      className="sticky left-0 z-10 whitespace-nowrap bg-ink px-4 py-3 text-[14px] font-normal text-linen"
                    >
                      {c.name}
                    </th>
                    {requests.map((r) => {
                      const row = cells.get(`${c.id}:${r.id}`)
                      return (
                        <Cell
                          key={r.id}
                          state={row ? cellState(row) : 'missing'}
                          church={c.name}
                          request={r.title}
                        />
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2">
            <Key state="submitted" label="Received" />
            <Key state="approved" label="Approved exception" />
            <Key state="needs_review" label="Needs your decision" />
            <Key state="partial" label="Started, not sent" />
            <Key state="missing" label="Nothing yet" />
          </div>
        </>
      )}
    </Shell>
  )
}

const TONES: Record<CellState, string> = {
  submitted: 'bg-verd/20 text-[#6FBFAA]',
  approved: 'bg-verd/20 text-[#6FBFAA]',
  needs_review: 'bg-gold/20 text-gold',
  partial: 'bg-gold/15 text-gold',
  missing: 'bg-madder/20 text-[#E4796A]',
}

const WORDS: Record<CellState, string> = {
  submitted: 'Received',
  approved: 'Approved',
  needs_review: 'Needs you',
  partial: 'Draft',
  missing: 'Not sent',
}

function Cell({
  state,
  church,
  request,
}: {
  state: CellState
  church: string
  request: string
}) {
  return (
    <td className="border-l border-rule-faint px-4 py-3">
      <span className={`inline-block rounded-[2px] px-2.5 py-1 text-[12px] ${TONES[state]}`}>
        {/* The visible word carries the meaning; colour only reinforces it. */}
        <span className="sr-only">
          {church}, {request}:{' '}
        </span>
        {WORDS[state]}
      </span>
    </td>
  )
}

function Key({ state, label }: { state: CellState; label: string }) {
  return (
    <span className="flex items-center gap-2 text-[13px] text-slate">
      <span
        className={`inline-block h-3 w-3 rounded-[2px] ${TONES[state].split(' ')[0]}`}
        aria-hidden="true"
      />
      {label}
    </span>
  )
}
