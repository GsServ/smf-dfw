/**
 * Mirror of the `validate_submission` function in the database.
 *
 * Both exist on purpose. This one runs as the servant types, so a five-person
 * team is flagged in the moment rather than the week of the event. The database
 * one runs on every write, so the rule holds even if someone posts straight to
 * the API. If you change a rule, change it in both places — the SQL lives in
 * supabase/migrations/.
 */

export interface FieldSpec {
  key: string
  label: string
  type: 'number' | 'text' | 'textarea' | 'name_list'
  required?: boolean
  help?: string
  min?: number
  max?: number
  min_items?: number
  max_items?: number
}

export type Payload = Record<string, unknown>

/** Field key -> problem, for fields that have one. */
export type FieldErrors = Record<string, string>

function isBlank(value: unknown): boolean {
  return (
    value === undefined ||
    value === null ||
    (typeof value === 'string' && value.trim() === '')
  )
}

/** Names that are actually filled in — blank rows in the roster UI don't count. */
export function filledNames(value: unknown): string[] {
  return Array.isArray(value)
    ? value.map((v) => String(v ?? '').trim()).filter((v) => v !== '')
    : []
}

export function validateField(field: FieldSpec, value: unknown): string | null {
  if (isBlank(value) || (field.type === 'name_list' && filledNames(value).length === 0)) {
    return field.required ? `${field.label} is required.` : null
  }

  if (field.type === 'number') {
    const n = Number(value)
    if (!Number.isFinite(n)) return `${field.label} must be a number.`
    if (field.min !== undefined && n < field.min)
      return `${field.label} must be at least ${field.min}.`
    if (field.max !== undefined && n > field.max)
      return `${field.label} must be no more than ${field.max}.`
  }

  if (field.type === 'name_list') {
    const count = filledNames(value).length
    if (field.min_items !== undefined && count < field.min_items)
      return `${field.label} needs at least ${field.min_items} names — you have ${count}.`
    if (field.max_items !== undefined && count > field.max_items)
      return `${field.label} allows at most ${field.max_items} names — you have ${count}.`
  }

  return null
}

export function validateSubmission(fields: FieldSpec[], payload: Payload): FieldErrors {
  const errors: FieldErrors = {}
  for (const field of fields) {
    const problem = validateField(field, payload[field.key])
    if (problem) errors[field.key] = problem
  }
  return errors
}
