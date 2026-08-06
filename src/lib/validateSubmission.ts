/**
 * Mirror of `submission_errors` and `submission_warnings` in the database.
 *
 * Two kinds of problem, and the difference matters:
 *
 * - **errors** block sending. A missing team count or a word typed where a
 *   number belongs leaves nothing usable to record.
 * - **warnings** do not block. They mean a posted rule is broken — a team of
 *   five against a seven minimum — which Abouna sometimes allows. Refusing
 *   these would only push the truth back into WhatsApp, which is the problem
 *   this site exists to solve. So the form accepts them and flags them.
 *
 * Both copies exist on purpose: this one runs as the servant types, the database
 * one runs on every write. Change a rule in both places. The SQL lives in
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

export interface FieldProblem {
  message: string
  /** An error blocks sending; a warning is flagged for the committee. */
  severity: 'error' | 'warning'
}

export type FieldProblems = Record<string, FieldProblem>

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

export function checkField(field: FieldSpec, value: unknown): FieldProblem | null {
  const empty =
    isBlank(value) || (field.type === 'name_list' && filledNames(value).length === 0)

  if (empty) {
    return field.required
      ? { message: `${field.label} is required.`, severity: 'error' }
      : null
  }

  if (field.type === 'number') {
    const n = Number(value)
    if (!Number.isFinite(n)) {
      return { message: `${field.label} must be a number.`, severity: 'error' }
    }
    if (field.min !== undefined && n < field.min) {
      return {
        message: `${field.label} is ${n}, below the minimum of ${field.min}.`,
        severity: 'warning',
      }
    }
    if (field.max !== undefined && n > field.max) {
      return {
        message: `${field.label} is ${n}, above the limit of ${field.max}.`,
        severity: 'warning',
      }
    }
  }

  if (field.type === 'name_list') {
    const count = filledNames(value).length
    if (field.min_items !== undefined && count < field.min_items) {
      return {
        message: `${field.label} has ${count} names, below the minimum of ${field.min_items}.`,
        severity: 'warning',
      }
    }
    if (field.max_items !== undefined && count > field.max_items) {
      return {
        message: `${field.label} has ${count} names, above the limit of ${field.max_items}.`,
        severity: 'warning',
      }
    }
  }

  return null
}

export function checkSubmission(fields: FieldSpec[], payload: Payload): FieldProblems {
  const problems: FieldProblems = {}
  for (const field of fields) {
    const problem = checkField(field, payload[field.key])
    if (problem) problems[field.key] = problem
  }
  return problems
}

export function countBySeverity(problems: FieldProblems) {
  const all = Object.values(problems)
  return {
    errors: all.filter((p) => p.severity === 'error').length,
    warnings: all.filter((p) => p.severity === 'warning').length,
  }
}
