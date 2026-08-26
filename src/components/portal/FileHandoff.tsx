import { useState } from 'react'

/**
 * How every committee editor ends.
 *
 * None of them write to the database. The site's content is flat JSON so that
 * it keeps working when nothing else does, and putting it behind a login to
 * save one commit would trade that away. So an editor's last act is to hand
 * back a finished file for a maintainer to commit.
 */
export default function FileHandoff({
  filename,
  text,
  blockedBy,
  children,
}: {
  filename: string
  /** Called only when the file is actually wanted, so ids can be settled late. */
  text: () => string
  /** Non-empty when the draft is not yet exportable; shown instead of letting them try. */
  blockedBy?: string
  children?: React.ReactNode
}) {
  const [copied, setCopied] = useState(false)
  const blocked = Boolean(blockedBy)

  async function copy() {
    try {
      await navigator.clipboard.writeText(text())
      setCopied(true)
    } catch {
      setCopied(false)
      window.alert('This browser would not let the page copy. Use Download instead.')
    }
  }

  function download() {
    const url = URL.createObjectURL(new Blob([text()], { type: 'application/json' }))
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <section className="mt-10 rounded-[3px] border border-gold/40 bg-gold/[0.06] p-[clamp(18px,3vw,26px)]">
      <h2 className="m-0 font-display text-[22px] font-normal text-linen-2">
        When you are finished
      </h2>
      <p className="mt-2 max-w-prose text-[14px] text-linen">
        Press Download. A file called <code className="text-gold">{filename}</code> is
        saved to your device — send it to whoever maintains the site and the change
        appears about a minute after they publish it.
      </p>
      {children}

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={download}
          disabled={blocked}
          className="rounded-[2px] bg-gold px-5 py-2.5 text-[13.5px] font-medium text-ink hover:bg-[#E9B857] disabled:opacity-60"
        >
          Download {filename}
        </button>
        <button
          type="button"
          onClick={copy}
          disabled={blocked}
          className="rounded-[2px] border border-rule px-4 py-2.5 text-[13.5px] text-linen hover:border-gold hover:text-gold disabled:opacity-60"
        >
          {copied ? 'Copied' : 'Copy the text instead'}
        </button>
      </div>

      {blockedBy && (
        <p className="m-0 mt-3 text-[13.5px] text-madder">{blockedBy}</p>
      )}
    </section>
  )
}
