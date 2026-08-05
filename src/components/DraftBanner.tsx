import { site } from '../content'

/** Shown while the site is being reviewed. Set draftBanner.show to false in site.json to remove it. */
export default function DraftBanner() {
  if (!site.draftBanner.show) return null

  return (
    <div className="bg-madder px-3 py-[7px] text-center font-mono text-[11px] uppercase tracking-[0.14em] text-white">
      {site.draftBanner.text}
    </div>
  )
}
