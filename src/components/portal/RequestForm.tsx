import { useMemo, useState } from 'react'
import { supabase } from '../../lib/supabase'
import {
  checkSubmission,
  countBySeverity,
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
  const [note, setNote] = useState(submission?.note ?? '')
  const [busy, setBusy] = useState<'save' | 'submit' | null>(null)
  const [serverError, setServerError] = useState<string | null>(null)
  const [saved, setSaved] = useState<string | null>(null)
  // Only surface a field's problem once it has been touched, so the form does
  // not greet the servant with a wall of red before they have typed anything.
  const [touched, setTouched] = useState<Record<string, boolean>>({})

  const problems = useMemo(() => checkSubmission(fields, payload), [fields, payload])
  const { errors, warnings } = countBySeverity(problems)

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
        {
          request_id: request.id,
          church_id: churchId,
          payload,
          status,
          note: note.trim() || null,
        },
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
    setSaved(
      status === 'submitted'
        ? warnings > 0
          ? 'Sent. Abouna will be asked to approve the exception.'
          : 'Sent to the committee.'
        : 'Draft saved.',
    )
  }

  function handleSubmit() {
    // Warnings never block. Only genuinely unusable answers do.
    if (errors > 0) {
      setTouched(Object.fromEntries(fields.map((f) => [f.key, true])))
      return
    }
    persist('submitted')
  }

  const sentWithExceptions = (submission?.exceptions?.length ?? 0) > 0

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
        <StatusPill
          status={submission?.status ?? 'missing'}
          dueDate={request.due_date}
          exceptionCount={submission?.exceptions?.length ?? 0}
          approvedAt={submission?.approved_at ?? null}
        />
      </div>

      {sentWithExceptions && (
        <div className="border-b border-rule bg-gold/10 px-[clamp(18px,3vw,26px)] py-4">
          <p className="m-0 font-mono text-[11px] uppercase tracking-[0.18em] text-gold">
            {submission?.approved_at ? 'Approved by Abouna' : 'Waiting on Abouna'}
          </p>
          <ul className="mt-2 list-none space-y-1 p-0">
            {submission!.exceptions.map((e, i) => (
              <li key={i} className="text-[13.5px] text-linen">
                {e}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="px-[clamp(18px,3vw,26px)]">
        {fields.map((field) => (
          <FieldInput
            key={field.key}
            field={field}
            value={payload[field.key]}
            problem={touched[field.key] ? problems[field.key] : undefined}
            onChange={(v) => setValue(field.key, v)}
          />
        ))}

        {/* Asked for only when a rule is being broken — it is the thing Abouna
            needs in order to decide, and pointless noise otherwise. */}
        {warnings > 0 && (
          <div className="border-t border-rule-faint py-5">
            <label
              htmlFor={`${request.id}-note`}
              className="block font-mono text-[11px] uppercase tracking-[0.18em] text-gold"
            >
              Why?
            </label>
            <p className="mt-1.5 text-[13px] text-slate">
              This breaks a posted rule. A sentence explaining why helps Abouna
              decide without having to chase you for it.
            </p>
            <textarea
              id={`${request.id}-note`}
              rows={2}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Two girls moved away in July."
              className="mt-2.5 w-full rounded-[2px] border border-rule bg-ink-2 px-3 py-2.5 text-[15px] text-linen placeholder:text-slate-dim focus:border-gold focus:outline-none"
            />
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3 border-t border-rule p-[clamp(18px,3vw,26px)]">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={busy !== null}
          className="rounded-[2px] bg-gold px-5 py-2.5 text-[13.5px] font-medium text-ink hover:bg-[#E9B857] disabled:opacity-60"
        >
          {busy === 'submit'
            ? 'Sending…'
            : warnings > 0
              ? 'Send anyway, for approval'
              : 'Send to committee'}
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
          ) : errors > 0 && Object.keys(touched).length > 0 ? (
            <span className="text-madder">
              {errors} {errors === 1 ? 'thing needs' : 'things need'} fixing before
              this can be sent.
            </span>
          ) : /* Confirmation outranks the advisory note — otherwise a submission
                 with an exception sends with no visible acknowledgement at all. */
          saved ? (
            <span className="text-verd">{saved}</span>
          ) : warnings > 0 ? (
            <span className="text-gold">
              {warnings === 1 ? 'One answer breaks' : `${warnings} answers break`} a
              posted rule. You can still send it.
            </span>
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
