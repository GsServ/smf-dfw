import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../auth/AuthProvider'
import Shell from '../components/portal/Shell'
import RequestForm from '../components/portal/RequestForm'
import type { FieldSpec, Payload } from '../lib/validateSubmission'

export interface RequestRow {
  id: string
  slug: string
  title: string
  description: string | null
  due_date: string | null
  fields: FieldSpec[]
  sort_order: number
}

export interface SubmissionRow {
  id: string
  request_id: string
  church_id: string
  payload: Payload
  status: 'partial' | 'submitted'
  submitted_at: string | null
  /** Posted rules this submission breaks. Empty is the normal case. */
  exceptions: string[]
  note: string | null
  approved_at: string | null
}

/** What one church owes, and the forms to settle it. */
export default function Portal({ onNavigate }: { onNavigate: (p: string) => void }) {
  const { profile, notInvited } = useAuth()
  const [requests, setRequests] = useState<RequestRow[]>([])
  const [submissions, setSubmissions] = useState<Record<string, SubmissionRow>>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!supabase || !profile?.church_id) return
    let cancelled = false

    async function load() {
      const [reqRes, subRes] = await Promise.all([
        supabase!.from('requests').select('*').eq('is_open', true).order('sort_order'),
        supabase!.from('submissions').select('*'),
      ])
      if (cancelled) return

      setRequests((reqRes.data as RequestRow[]) ?? [])
      setSubmissions(
        Object.fromEntries(
          ((subRes.data as SubmissionRow[]) ?? []).map((s) => [s.request_id, s]),
        ),
      )
      setLoading(false)
    }

    load()
    return () => {
      cancelled = true
    }
  }, [profile?.church_id])

  if (notInvited) {
    return (
      <Shell title="Not on the list yet" onNavigate={onNavigate}>
        <p className="max-w-note text-[15px] text-slate">
          You are signed in, but this address has not been added as a church
          representative. Ask Fr Akhnoukh to add it, then sign in again.
        </p>
      </Shell>
    )
  }

  if (profile?.role === 'committee') {
    return (
      <Shell
        title="Committee account"
        subtitle="Committee accounts review submissions rather than send them."
        onNavigate={onNavigate}
      >
        <button
          type="button"
          onClick={() => onNavigate('/committee')}
          className="rounded-[2px] bg-gold px-5 py-2.5 text-[13.5px] font-medium text-ink hover:bg-[#E9B857]"
        >
          Open the dashboard
        </button>
      </Shell>
    )
  }

  const outstanding = requests.filter(
    (r) => submissions[r.id]?.status !== 'submitted',
  ).length

  return (
    <Shell
      title={profile?.church?.name ?? 'Your church'}
      subtitle={
        loading
          ? 'Loading…'
          : outstanding === 0
            ? 'Everything asked for has been sent. Thank you.'
            : `${outstanding} ${outstanding === 1 ? 'thing' : 'things'} still to send.`
      }
      onNavigate={onNavigate}
    >
      {loading ? (
        <p className="text-[15px] text-slate">Loading…</p>
      ) : requests.length === 0 ? (
        <p className="text-[15px] text-slate">Nothing is being asked for right now.</p>
      ) : (
        <div className="space-y-6">
          {requests.map((request) => (
            <RequestForm
              key={request.id}
              request={request}
              submission={submissions[request.id] ?? null}
              churchId={profile!.church_id!}
              onSaved={(row) =>
                setSubmissions((s) => ({ ...s, [row.request_id]: row }))
              }
            />
          ))}
        </div>
      )}
    </Shell>
  )
}
