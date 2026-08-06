import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../auth/AuthProvider'
import { events } from '../content'
import { describeFile, publicUrl, type EventDocument } from '../lib/eventDocuments'
import Shell from '../components/portal/Shell'

const MAX_BYTES = 10 * 1024 * 1024

/** Keeps storage paths predictable and free of characters that break URLs. */
function safeName(name: string): string {
  return name
    .normalize('NFKD')
    .replace(/[^\w.\-]+/g, '-')
    .replace(/-+/g, '-')
    .toLowerCase()
    .slice(-80)
}

export default function EventDocumentsAdmin({
  onNavigate,
}: {
  onNavigate: (p: string) => void
}) {
  const { profile, loading: authLoading } = useAuth()
  const [docs, setDocs] = useState<EventDocument[]>([])
  const [loading, setLoading] = useState(true)
  const [eventSlug, setEventSlug] = useState(events[0]?.id ?? '')
  const [title, setTitle] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<{ kind: 'ok' | 'bad'; text: string } | null>(null)

  const load = useCallback(async () => {
    if (!supabase) return
    const { data } = await supabase
      .from('event_documents')
      .select('*')
      .order('created_at', { ascending: false })
    setDocs((data as EventDocument[]) ?? [])
    setLoading(false)
  }, [])

  useEffect(() => {
    if (profile?.role === 'committee') load()
  }, [profile?.role, load])

  async function handleUpload(e: FormEvent) {
    e.preventDefault()
    if (!supabase || !file || !eventSlug) return

    if (file.size > MAX_BYTES) {
      setMessage({ kind: 'bad', text: 'That file is over 10 MB. Please use a smaller one.' })
      return
    }

    setBusy(true)
    setMessage(null)

    const path = `${eventSlug}/${Date.now()}-${safeName(file.name)}`
    const { error: uploadError } = await supabase.storage
      .from('event-documents')
      .upload(path, file, { contentType: file.type || undefined })

    if (uploadError) {
      setBusy(false)
      setMessage({ kind: 'bad', text: uploadError.message })
      return
    }

    const { error: rowError } = await supabase.from('event_documents').insert({
      event_slug: eventSlug,
      title: title.trim() || file.name,
      storage_path: path,
      mime_type: file.type || null,
      size_bytes: file.size,
    })

    if (rowError) {
      // Don't leave an orphaned file behind if the row failed to save.
      await supabase.storage.from('event-documents').remove([path])
      setBusy(false)
      setMessage({ kind: 'bad', text: rowError.message })
      return
    }

    setTitle('')
    setFile(null)
    ;(document.getElementById('doc-file') as HTMLInputElement | null)?.value &&
      ((document.getElementById('doc-file') as HTMLInputElement).value = '')
    await load()
    setBusy(false)
    setMessage({ kind: 'ok', text: 'Added. It is on the calendar now.' })
  }

  async function handleDelete(doc: EventDocument) {
    if (!supabase) return
    setBusy(true)
    await supabase.storage.from('event-documents').remove([doc.storage_path])
    await supabase.from('event_documents').delete().eq('id', doc.id)
    await load()
    setBusy(false)
    setMessage({ kind: 'ok', text: 'Removed.' })
  }

  if (!authLoading && profile?.role !== 'committee') {
    return (
      <Shell title="Committee only" onNavigate={onNavigate}>
        <p className="max-w-note text-[15px] text-slate">
          Only committee accounts can post documents.
        </p>
      </Shell>
    )
  }

  const eventTitle = (slug: string) => events.find((e) => e.id === slug)?.title ?? slug

  return (
    <Shell
      title="Rules and documents"
      subtitle="Attach a PDF, a photo of a printed page, or a Word document to an event. It appears under that event on the calendar."
      onNavigate={onNavigate}
    >
      <p className="mb-6 max-w-prose rounded-[3px] border border-madder/50 bg-madder/10 px-4 py-3 text-[14px] text-linen">
        <b className="font-semibold text-linen-2">Anyone can read these.</b> They sit
        beside the rules on the public calendar, which is the point — a servant should
        not need an account to read the rules for a game. Do not attach rosters,
        contact lists, or anything with a child's name in it.
      </p>

      <form
        onSubmit={handleUpload}
        className="mb-10 max-w-note rounded-[3px] border border-rule bg-ink-2/40 p-[clamp(18px,3vw,26px)]"
      >
        <label
          htmlFor="doc-event"
          className="block font-mono text-[11px] uppercase tracking-[0.18em] text-gold"
        >
          Event
        </label>
        <select
          id="doc-event"
          value={eventSlug}
          onChange={(e) => setEventSlug(e.target.value)}
          className="mt-2 w-full rounded-[2px] border border-rule bg-ink-2 px-3 py-2.5 text-[15px] text-linen focus:border-gold focus:outline-none"
        >
          {events.map((e) => (
            <option key={e.id} value={e.id}>
              {e.title}
            </option>
          ))}
        </select>

        <label
          htmlFor="doc-title"
          className="mt-5 block font-mono text-[11px] uppercase tracking-[0.18em] text-gold"
        >
          What is it called?
        </label>
        <input
          id="doc-title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Jeopardy rules, updated Aug 6"
          className="mt-2 w-full rounded-[2px] border border-rule bg-ink-2 px-3 py-2.5 text-[15px] text-linen placeholder:text-slate-dim focus:border-gold focus:outline-none"
        />
        <p className="mt-1.5 text-[13px] text-slate">
          This is the wording servants will see and click. Left blank, the file name is used.
        </p>

        <label
          htmlFor="doc-file"
          className="mt-5 block font-mono text-[11px] uppercase tracking-[0.18em] text-gold"
        >
          File
        </label>
        <input
          id="doc-file"
          type="file"
          accept=".pdf,.png,.jpg,.jpeg,.webp,.heic,.doc,.docx"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="mt-2 w-full text-[14px] text-linen file:mr-3 file:rounded-[2px] file:border-0 file:bg-gold file:px-4 file:py-2 file:text-[13px] file:font-medium file:text-ink hover:file:bg-[#E9B857]"
        />
        <p className="mt-1.5 text-[13px] text-slate">
          PDF, photo, or Word document. Up to 10 MB.
        </p>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <button
            type="submit"
            disabled={busy || !file}
            className="rounded-[2px] bg-gold px-5 py-2.5 text-[13.5px] font-medium text-ink hover:bg-[#E9B857] disabled:opacity-60"
          >
            {busy ? 'Uploading…' : 'Post it'}
          </button>
          <p aria-live="polite" className="m-0 text-[13px]">
            {message && (
              <span className={message.kind === 'ok' ? 'text-verd' : 'text-madder'}>
                {message.text}
              </span>
            )}
          </p>
        </div>
      </form>

      <h2 className="m-0 font-display text-[24px] font-normal text-linen-2">Posted</h2>

      {loading ? (
        <p className="mt-3 text-[15px] text-slate">Loading…</p>
      ) : docs.length === 0 ? (
        <p className="mt-3 text-[15px] text-slate">Nothing posted yet.</p>
      ) : (
        <ul className="mt-4 list-none space-y-3 p-0">
          {docs.map((doc) => (
            <li
              key={doc.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-[3px] border border-rule bg-ink-2/40 px-4 py-3"
            >
              <div className="min-w-[220px] flex-1">
                <a
                  href={publicUrl(doc.storage_path)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[15px] text-gold underline decoration-gold/40 underline-offset-2 hover:decoration-gold"
                >
                  {doc.title}
                </a>
                <p className="m-0 mt-1 font-mono text-[11px] uppercase tracking-[0.14em] text-slate">
                  {eventTitle(doc.event_slug)} · {describeFile(doc)}
                </p>
              </div>
              <button
                type="button"
                disabled={busy}
                onClick={() => handleDelete(doc)}
                className="rounded-[2px] border border-rule px-3 py-1.5 text-[13px] text-slate hover:border-madder hover:text-madder disabled:opacity-60"
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}
    </Shell>
  )
}
