/**
 * Documents attached to an event — a PDF of the rules, a photo of a printed
 * page, a Word file.
 *
 * The public calendar reads these with a plain fetch rather than the Supabase
 * client, on purpose: pulling the client into the public bundle would double its
 * size for the many visitors who only ever check a date. If the request fails,
 * the calendar simply shows no attachments and carries on.
 */

const URL_BASE = import.meta.env.VITE_SUPABASE_URL
const KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

export interface EventDocument {
  id: string
  event_slug: string
  title: string
  storage_path: string
  mime_type: string | null
  size_bytes: number | null
}

export function publicUrl(storagePath: string): string {
  return `${URL_BASE}/storage/v1/object/public/event-documents/${storagePath}`
}

/** All documents, grouped by the event they belong to. Never throws. */
export async function fetchEventDocuments(): Promise<Record<string, EventDocument[]>> {
  if (!URL_BASE || !KEY) return {}

  try {
    const res = await fetch(
      `${URL_BASE}/rest/v1/event_documents?select=id,event_slug,title,storage_path,mime_type,size_bytes&order=sort_order,created_at`,
      { headers: { apikey: KEY, Authorization: `Bearer ${KEY}` } },
    )
    if (!res.ok) return {}

    const rows = (await res.json()) as EventDocument[]
    const byEvent: Record<string, EventDocument[]> = {}
    for (const row of rows) {
      ;(byEvent[row.event_slug] ??= []).push(row)
    }
    return byEvent
  } catch {
    // The calendar must never break because an attachment lookup failed.
    return {}
  }
}

export function describeFile(doc: EventDocument): string {
  const kind = doc.mime_type?.startsWith('image/')
    ? 'Image'
    : doc.mime_type === 'application/pdf'
      ? 'PDF'
      : 'Document'

  if (!doc.size_bytes) return kind

  const mb = doc.size_bytes / 1_048_576
  const size = mb >= 1 ? `${mb.toFixed(1)} MB` : `${Math.round(doc.size_bytes / 1024)} KB`
  return `${kind} · ${size}`
}
