import { filledNames, type FieldSpec } from '../../lib/validateSubmission'

interface Props {
  field: FieldSpec
  value: unknown
  error?: string
  onChange: (value: unknown) => void
}

export default function FieldInput({ field, value, error, onChange }: Props) {
  const describedBy = [
    field.help ? `${field.key}-help` : null,
    error ? `${field.key}-error` : null,
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
            invalid={Boolean(error)}
          />
        ) : field.type === 'textarea' ? (
          <textarea
            id={field.key}
            rows={3}
            value={String(value ?? '')}
            aria-invalid={Boolean(error)}
            aria-describedby={describedBy || undefined}
            onChange={(e) => onChange(e.target.value)}
            className={inputClass(Boolean(error))}
          />
        ) : (
          <input
            id={field.key}
            type={field.type === 'number' ? 'number' : 'text'}
            inputMode={field.type === 'number' ? 'numeric' : undefined}
            min={field.min}
            max={field.max}
            value={String(value ?? '')}
            aria-invalid={Boolean(error)}
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
            className={`${inputClass(Boolean(error))} ${field.type === 'number' ? 'max-w-[140px]' : ''}`}
          />
        )}
      </div>

      {/* aria-live so the count/limit feedback reaches a screen reader as it changes. */}
      <p
        id={`${field.key}-error`}
        role={error ? 'alert' : undefined}
        aria-live="polite"
        className={`mt-2 text-[13px] ${error ? 'text-madder' : 'sr-only'}`}
      >
        {error ?? ''}
      </p>
    </div>
  )
}

function inputClass(invalid: boolean) {
  return `w-full rounded-[2px] border bg-ink-2 px-3 py-2.5 text-[15px] text-linen placeholder:text-slate-dim focus:outline-none ${
    invalid ? 'border-madder focus:border-madder' : 'border-rule focus:border-gold'
  }`
}

function NameList({
  field,
  value,
  onChange,
  describedBy,
  invalid,
}: {
  field: FieldSpec
  value: unknown
  onChange: (v: unknown) => void
  describedBy: string
  invalid: boolean
}) {
  const names: string[] = Array.isArray(value) ? (value as string[]) : []
  const rows = names.length === 0 ? [''] : names
  const count = filledNames(names).length

  function update(i: number, next: string) {
    const copy = [...rows]
    copy[i] = next
    onChange(copy)
  }

  function addRow() {
    onChange([...rows, ''])
  }

  function removeRow(i: number) {
    const copy = rows.filter((_, idx) => idx !== i)
    onChange(copy.length ? copy : [''])
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
              className={inputClass(invalid)}
            />
            <button
              type="button"
              onClick={() => removeRow(i)}
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
          onClick={addRow}
          className="rounded-[2px] border border-rule px-3 py-1.5 text-[13px] text-linen hover:border-gold hover:text-gold"
        >
          + Add a name
        </button>
        <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-slate">
          {count} {count === 1 ? 'name' : 'names'}
          {field.min_items !== undefined && ` · ${field.min_items} minimum`}
          {field.max_items !== undefined && ` · ${field.max_items} maximum`}
        </span>
      </div>
    </div>
  )
}
