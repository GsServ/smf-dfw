import { supabase } from './supabase'

/**
 * Reads names off a picture of a roster, via the `read-roster` edge function.
 *
 * The picture goes to the function and nowhere else — it is not uploaded to
 * storage and not written to the database. What comes back is a suggestion the
 * servant checks before any of it reaches the form.
 */

export interface RosterRead {
  names: string[]
  /** Anything the reader skipped or could not make out. Often empty. */
  note: string
}

function toBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('That file could not be opened.'))
    reader.onload = () => {
      const result = String(reader.result)
      const comma = result.indexOf(',')
      // A data URL, of which we want only what follows the comma.
      resolve(comma > -1 ? result.slice(comma + 1) : result)
    }
    reader.readAsDataURL(file)
  })
}

export async function readRoster(file: File): Promise<RosterRead> {
  if (!supabase) throw new Error('Not connected.')

  const image = await toBase64(file)
  const { data, error } = await supabase.functions.invoke('read-roster', {
    body: { image, mimeType: file.type },
  })

  if (error) {
    // The function explains itself in the body; the thrown error alone says
    // only "non-2xx", which is no use to a servant standing in a church hall.
    let message = 'That picture could not be read. Please type the names in.'
    try {
      const body = await (error as { context?: Response }).context?.json()
      if (body?.error) message = body.error
    } catch {
      // Keep the plain message.
    }
    throw new Error(message)
  }

  return {
    names: Array.isArray(data?.names) ? (data.names as string[]) : [],
    note: typeof data?.note === 'string' ? data.note : '',
  }
}
