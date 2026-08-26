import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'jsr:@supabase/supabase-js@2'
import Anthropic from 'npm:@anthropic-ai/sdk@0.120.0'

/**
 * Reads the names off a screenshot of a roster.
 *
 * Servants send lists of children in the WhatsApp group as pictures. Typing
 * twenty names back into a form is the single most tedious thing this site
 * asks anybody to do, and it is where mistakes come from.
 *
 * What this is careful about:
 *
 * - **The picture is never stored.** It arrives in the request body, goes to
 *   the model, and is gone when the request ends. Nothing is written to the
 *   database, nothing to storage, and the names are not logged.
 * - **Nothing is submitted automatically.** The names come back to the form as
 *   a suggestion the servant reviews and edits. A wrong name that nobody looked
 *   at is worse than a name that was typed by hand.
 * - **Only invited people can call it.** The caller must be signed in *and*
 *   have a profile, which is the same bar as everything else here. Without the
 *   profile check, any signed-in address — including one nobody invited — could
 *   spend the API budget.
 *
 * Inert until ANTHROPIC_API_KEY is set, exactly like the reminder function was
 * before Resend existed. Deploy it, decide later.
 */

const MODEL = 'claude-opus-5'

/** What the vision model can actually read. HEIC is not on the list. */
const READABLE = ['image/png', 'image/jpeg', 'image/webp', 'image/gif']

/** Anthropic rejects a base64 image much above 5 MB; stop before it does. */
const MAX_BYTES = 4_500_000

const SYSTEM = `You read pictures that Coptic Orthodox church servants send one another, and pull out the list of young people's names.

What you are given is usually a screenshot of a message, a photo of a handwritten or printed list, or a note typed on a phone. Return only the names of the youth on the roster.

Leave out:
- the name of whoever sent the message, and anyone in a chat header
- phone numbers, times, dates, and read receipts
- headings and group labels such as "MS Girls", "Team 1", or a church name
- the name of a servant or of Abouna, unless they are plainly on the roster themselves

Keep every name spelled exactly as it is written, including transliterations of Arabic and Coptic names. Do not correct spelling, anglicise anything, swap first and last names, or change the order they appear in.

If a name is cut off or you genuinely cannot make it out, leave it out and say so in the note. If the picture is not a list of names at all, return an empty list and say what it appears to be.`

const RECORD_NAMES = {
  name: 'record_names',
  description: 'Record the youth names read off the picture.',
  strict: true,
  input_schema: {
    type: 'object' as const,
    properties: {
      names: {
        type: 'array',
        items: { type: 'string' },
        description: 'The youth names, in the order they appear.',
      },
      note: {
        type: 'string',
        description:
          'One short sentence for the person checking this: anything skipped, unreadable, or surprising. Empty string if the list was plain.',
      },
    },
    required: ['names', 'note'],
    additionalProperties: false,
  },
}

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  })
}

/**
 * The caller must be somebody the committee invited.
 *
 * Signing in is not enough: an address nobody invited gets an auth user with no
 * profile, and every policy in the database then denies it everything. The same
 * bar applies here, or that account could still spend the API budget.
 */
async function invitedCaller(req: Request): Promise<boolean> {
  const authorization = req.headers.get('Authorization') ?? ''
  if (!authorization) return false

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authorization } } },
  )

  const { data: auth } = await supabase.auth.getUser()
  if (!auth?.user) return false

  // Row-level security means this returns their own profile or nothing at all.
  const { data: profile } = await supabase
    .from('profiles')
    .select('user_id')
    .eq('user_id', auth.user.id)
    .maybeSingle()

  return Boolean(profile)
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (req.method !== 'POST') return json({ error: 'POST an image.' }, 405)

  const apiKey = Deno.env.get('ANTHROPIC_API_KEY')
  if (!apiKey) {
    return json(
      {
        error:
          'Reading names from a picture is not switched on for this site yet.',
      },
      503,
    )
  }

  if (!(await invitedCaller(req))) {
    return json({ error: 'Sign in with an address the committee has added.' }, 403)
  }

  let image: string
  let mimeType: string
  try {
    const body = await req.json()
    image = String(body.image ?? '')
    mimeType = String(body.mimeType ?? '')
  } catch {
    return json({ error: 'That request was not readable.' }, 400)
  }

  if (!image) return json({ error: 'No picture came through.' }, 400)

  if (!READABLE.includes(mimeType)) {
    return json(
      {
        error:
          'That kind of picture cannot be read. A screenshot, or a photo saved as JPEG or PNG, works.',
      },
      400,
    )
  }

  // base64 carries about 4 bytes for every 3 of the original.
  if (image.length * 0.75 > MAX_BYTES) {
    return json({ error: 'That picture is too large. Around 4 MB is the limit.' }, 400)
  }

  const anthropic = new Anthropic({ apiKey })

  try {
    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 8000,
      system: SYSTEM,
      tools: [RECORD_NAMES],
      tool_choice: { type: 'tool', name: 'record_names' },
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: { type: 'base64', media_type: mimeType, data: image },
            },
            { type: 'text', text: 'Read the names off this.' },
          ],
        },
      ],
    })

    if (response.stop_reason === 'refusal') {
      return json({ error: 'The reader would not process that picture.' }, 422)
    }

    const call = response.content.find((block) => block.type === 'tool_use')
    if (!call || call.type !== 'tool_use') {
      return json({ error: 'Nothing readable came back. Try a clearer picture.' }, 422)
    }

    const { names, note } = call.input as { names: string[]; note: string }

    return json({
      names: names.map((n) => n.trim()).filter(Boolean),
      note: note?.trim() ?? '',
    })
  } catch (error) {
    // Deliberately not echoing the picture or the model's text into the logs.
    console.error('read-roster failed:', error instanceof Error ? error.message : error)
    return json({ error: 'The reader could not be reached. Type the names in instead.' }, 502)
  }
})
