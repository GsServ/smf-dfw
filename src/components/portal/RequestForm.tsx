import { useMemo, useState } from 'react'
import { supabase } from '../../lib/supabase'
import {
  validateSubmission,
  type FieldSpec,
  type Payload,
} from '../../lib/validateSubmission'
import FieldInput from './FieldInput'
import StatusPill from './StatusPill'
import type { RequestRow, SubmissionRow } from '../../routes/Portal'

interface Props {
  request: RequestRow
  submission: SubmissionRow | null
  churchId: string
  onSaved: (row: SubmissionRow) => void
}

export default function RequestForm({ request, submission, churchId, onSaved }: Props) {
  const fields = request.fields as FieldSpec[]
  const [payload, setPayload] = useState<Payload>(submission?.payload ?? {})
  const [busy, setBusy] = useState<'save' | 'submit' | null>(null)
  const [serverError, setServerError] = useState<string | null>(null)
  const [saved, setSaved] = useState<string | null>(null)
  // Only surface a field's problem once it has been touched, so the form does
  // not greet the servant with a wall of red before they have typed anything.
  const [touched, setTouched] = useState<Record<string, boolean>>({})

  const errors = useMemo(() => validateSubmission(fields, payload), [fields, payload])
  const errorCount = Object.keys(errors).length

  function setValue(key: string, value: unknown) {
    setPayload((p) => ({ ...p, [key]: value }))
    setTouched((t) => ({ ...t, [key]: true }))
    setSaved(null)
  }

  async function persist(status: 'partial' | 'submitted') {
    if (!supabase) return
    setServerError(null)
    setBusy(status === 'submitted' ? 'submit' : 'save')

    const { data, error } = await supabase
      .from('submissions')
      .upsert(
        { request_id: request.id, church_id: churchId, payload, status },
        { onConflict: 'request_id,church_id' },
      )
      .select()
      .single()

    setBusy(null)

    if (error) {
      setServerError(error.message)
      return
    }

    onSaved(data as SubmissionRow)
    setSaved(status === 'submitted' ? 'Sent to the committee.' : 'Draft saved.')
  }

  function handleSubmit() {
    if (errorCount > 0) {
      // Reveal every problem at once so nothing is hidden below the fold.
      setTouched(Object.fromEntries(fields.map((f) => [f.key, true])))
      return
    }
    persist('submitted')
  }

  return (
    <div className="rounded-[3px] border border-rule bg-ink-2/40">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-rule p-[clamp(18px,3vw,26px)]">
        <div className="min-w-0">
          <h2 className="m-0 font-display text-[22px] font-bold text-linen-2">
            {request.title}
          </h2>
          {request.description && (
            <p className="mt-1.5 max-w-prose text-[14px] text-slate">
              {request.description}
            </p>
          )}
        </div>
        <StatusPill status={submission?.status ?? 'missing'} dueDate={request.due_date} />
      </div>

      <div className="px-[clamp(18px,3vw,26px)]">
        {fields.map((field) => (
          <FieldInput
            key={field.key}
            field={field}
            value={payload[field.key]}
            error={touched[field.key] ? errors[field.key] : undefined}
            onChange={(v) => setValue(field.key, v)}
          />
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-3 border-t border-rule p-[clamp(18px,3vw,26px)]">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={busy !== null}
          className="rounded-[2px] bg-gold px-5 py-2.5 text-[13.5px] font-medium text-ink hover:bg-[#E9B857] disabled:opacity-60"
        >
          {busy === 'submit' ? 'Sending…' : 'Send to committee'}
        </button>

        <button
          type="button"
          onClick={() => persist('partial')}
          disabled={busy !== null}
          className="rounded-[2px] border border-rule px-4 py-2.5 text-[13.5px] text-linen hover:border-gold hover:text-gold disabled:opacity-60"
        >
          {busy === 'save' ? 'Saving…' : 'Save draft'}
        </button>

        <p aria-live="polite" className="m-0 text-[13px]">
          {serverError ? (
            <span className="text-madder">{serverError}</span>
          ) : errorCount > 0 && Object.keys(touched).length > 0 ? (
            <span className="text-madder">
              {errorCount} {errorCount === 1 ? 'thing needs' : 'things need'} fixing
              before this can be sent.
            </span>
          ) : saved ? (
            <span className="text-verd">{saved}</span>
          ) : (
            <span className="text-slate">
              A draft saves what you have without sending it.
            </span>
          )}
        </p>
      </div>
    </div>
  )
}
