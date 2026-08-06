import { useEffect, useMemo, useState } from 'react'
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
}

/**
 * Nine churches down, open requests across. The question this answers is the one
 * Fr Akhnoukh currently answers by scrolling WhatsApp: who has not sent it yet.
 */
export default function Committee({ onNavigate }: { onNavigate: (p: string) => void }) {
  const { profile, loading: authLoading } = useAuth()
  const [rows, setRows] = useState<GridRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!supabase || profile?.role !== 'committee') return
    let cancelled = false

    supabase
      .from('request_status_grid')
      .select('*')
      .then(({ data }) => {
        if (cancelled) return
        setRows((data as GridRow[]) ?? [])
        setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [profile?.role])

  const { churches, requests, cells, missing } = useMemo(() => {
    const churchMap = new Map<string, { id: string; name: string; sort: number }>()
    const requestMap = new Map<
      string,
      { id: string; title: string; due: string | null; sort: number }
    >()
    const cells = new Map<string, SubmissionStatus>()

    for (const r of rows) {
      churchMap.set(r.church_id, {
        id: r.church_id,
        name: r.church_name,
        sort: r.church_sort_order,
      })
      requestMap.set(r.request_id, {
        id: r.request_id,
        title: r.request_title,
        due: r.due_date,
        sort: r.sort_order,
      })
      cells.set(`${r.church_id}:${r.request_id}`, r.status)
    }

    return {
      churches: [...churchMap.values()].sort((a, b) => a.sort - b.sort),
      requests: [...requestMap.values()].sort((a, b) => a.sort - b.sort),
      cells,
      missing: rows.filter((r) => r.status !== 'submitted').length,
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
          : missing === 0
            ? 'Everything is in. Nothing outstanding.'
            : `${missing} outstanding across ${churches.length} churches.`
      }
      onNavigate={onNavigate}
    >
      {loading ? (
        <p className="text-[15px] text-slate">Loading…</p>
      ) : (
        <>
          {/* Wide grids scroll inside their own box rather than the whole page. */}
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
                    {requests.map((r) => (
                      <Cell
                        key={r.id}
                        status={cells.get(`${c.id}:${r.id}`) ?? 'missing'}
                        church={c.name}
                        request={r.title}
                      />
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2">
            <Key status="submitted" label="Received" />
            <Key status="partial" label="Started, not sent" />
            <Key status="missing" label="Nothing yet" />
          </div>
        </>
      )}
    </Shell>
  )
}

function Cell({
  status,
  church,
  request,
}: {
  status: SubmissionStatus
  church: string
  request: string
}) {
  const tone =
    status === 'submitted'
      ? 'bg-verd/20 text-[#6FBFAA]'
      : status === 'partial'
        ? 'bg-gold/15 text-gold'
        : 'bg-madder/20 text-[#E4796A]'

  const word =
    status === 'submitted' ? 'Received' : status === 'partial' ? 'Draft' : 'Not sent'

  return (
    <td className="border-l border-rule-faint px-4 py-3">
      <span className={`inline-block rounded-[2px] px-2.5 py-1 text-[12px] ${tone}`}>
        {/* The visible word carries the meaning; colour only reinforces it. */}
        <span className="sr-only">
          {church}, {request}:{' '}
        </span>
        {word}
      </span>
    </td>
  )
}

function Key({ status, label }: { status: SubmissionStatus; label: string }) {
  const tone =
    status === 'submitted'
      ? 'bg-verd/20'
      : status === 'partial'
        ? 'bg-gold/15'
        : 'bg-madder/20'

  return (
    <span className="flex items-center gap-2 text-[13px] text-slate">
      <span className={`inline-block h-3 w-3 rounded-[2px] ${tone}`} aria-hidden="true" />
      {label}
    </span>
  )
}
