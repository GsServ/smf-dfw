import { filledNames, type FieldProblem, type FieldSpec } from '../../lib/validateSubmission'

interface Props {
  field: FieldSpec
  value: unknown
  problem?: FieldProblem
  onChange: (value: unknown) => void
}

export default function FieldInput({ field, value, problem, onChange }: Props) {
  const invalid = problem?.severity === 'error'
  const flagged = problem?.severity === 'warning'

  const describedBy = [
    field.help ? `${field.key}-help` : null,
    problem ? `${field.key}-problem` : null,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div className="border-b border-rule-faint py-5 last:border-b-0">
      <label
        htmlFor={field.key}
        className="block font-mono text-[11px] uppercase tracking-[0.18em] text-gold"
      >
        {field.label}
        {field.required && <span className="text-gold-label"> ·  required</span>}
      </label>

      {field.help && (
        <p id={`${field.key}-help`} className="mt-1.5 text-[13px] text-slate">
          {field.help}
        </p>
      )}

      <div className="mt-2.5">
        {field.type === 'name_list' ? (
          <NameList
            field={field}
            value={value}
            onChange={onChange}
            describedBy={describedBy}
            invalid={invalid}
            flagged={flagged}
          />
        ) : field.type === 'textarea' ? (
          <textarea
            id={field.key}
            rows={3}
            value={String(value ?? '')}
            aria-invalid={invalid}
            aria-describedby={describedBy || undefined}
            onChange={(e) => onChange(e.target.value)}
            className={inputClass(invalid, flagged)}
          />
        ) : (
          <input
            id={field.key}
            type={field.type === 'number' ? 'number' : 'text'}
            inputMode={field.type === 'number' ? 'numeric' : undefined}
            /* Deliberately no min/max attributes: the browser would block values
               Abouna is allowed to permit. The bounds are advisory here. */
            value={String(value ?? '')}
            aria-invalid={invalid}
            aria-describedby={describedBy || undefined}
            onChange={(e) =>
              onChange(
                field.type === 'number'
                  ? e.target.value === ''
                    ? ''
                    : Number(e.target.value)
                  : e.target.value,
              )
            }
            className={`${inputClass(invalid, flagged)} ${field.type === 'number' ? 'max-w-[140px]' : ''}`}
          />
        )}
      </div>

      <p
        id={`${field.key}-problem`}
        role={invalid ? 'alert' : undefined}
        aria-live="polite"
        className={`mt-2 text-[13px] ${
          invalid ? 'text-madder' : flagged ? 'text-gold' : 'sr-only'
        }`}
      >
        {problem
          ? flagged
            ? `${problem.message} You can still send this — Abouna will be asked to approve it.`
            : problem.message
          : ''}
      </p>
    </div>
  )
}

function inputClass(invalid: boolean, flagged = false) {
  const border = invalid
    ? 'border-madder focus:border-madder'
    : flagged
      ? 'border-gold focus:border-gold'
      : 'border-rule focus:border-gold'

  return `w-full rounded-[2px] border bg-ink-2 px-3 py-2.5 text-[15px] text-linen placeholder:text-slate-dim focus:outline-none ${border}`
}

function NameList({
  field,
  value,
  onChange,
  describedBy,
  invalid,
  flagged,
}: {
  field: FieldSpec
  value: unknown
  onChange: (v: unknown) => void
  describedBy: string
  invalid: boolean
  flagged: boolean
}) {
  const names: string[] = Array.isArray(value) ? (value as string[]) : []
  const rows = names.length === 0 ? [''] : names
  const count = filledNames(names).length

  function update(i: number, next: string) {
    const copy = [...rows]
    copy[i] = next
    onChange(copy)
  }

  return (
    <div>
      <ol className="m-0 list-none space-y-2 p-0">
        {rows.map((name, i) => (
          <li key={i} className="flex items-center gap-2">
            <span className="w-6 shrink-0 text-right font-mono text-[11px] text-slate-dim">
              {i + 1}
            </span>
            <input
              id={i === 0 ? field.key : undefined}
              type="text"
              value={name}
              aria-label={`${field.label}, name ${i + 1}`}
              aria-invalid={invalid}
              aria-describedby={i === 0 ? describedBy || undefined : undefined}
              onChange={(e) => update(i, e.target.value)}
              className={inputClass(invalid, flagged)}
            />
            <button
              type="button"
              onClick={() => {
                const copy = rows.filter((_, idx) => idx !== i)
                onChange(copy.length ? copy : [''])
              }}
              aria-label={`Remove name ${i + 1}`}
              className="shrink-0 rounded-[2px] border border-rule px-2.5 py-2 text-[13px] text-slate hover:border-madder hover:text-madder"
            >
              ✕
            </button>
          </li>
        ))}
      </ol>

      <div className="mt-3 flex flex-wrap items-center gap-4">
        <button
          type="button"
          onClick={() => onChange([...rows, ''])}
          className="rounded-[2px] border border-rule px-3 py-1.5 text-[13px] text-linen hover:border-gold hover:text-gold"
        >
          + Add a name
        </button>
        <span
          className={`font-mono text-[11px] uppercase tracking-[0.14em] ${
            flagged ? 'text-gold' : 'text-slate'
          }`}
        >
          {count} {count === 1 ? 'name' : 'names'}
          {field.min_items !== undefined && ` · ${field.min_items} minimum`}
          {field.max_items !== undefined && ` · ${field.max_items} maximum`}
        </span>
      </div>
    </div>
  )
}
