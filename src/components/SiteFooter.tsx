import { site } from '../content'

export default function SiteFooter() {
  return (
    <footer className="mt-[clamp(40px,6vw,70px)] border-t border-rule pb-[46px] pt-[34px]">
      <div className="wrap">
        <p className="mb-3.5 font-coptic text-xl text-gold-label" aria-hidden="true">
          ☩
        </p>
        {site.footerLines.map((line, i) => (
          <p key={i} className="mb-2 max-w-note text-[13.5px] text-slate">
            {line}
          </p>
        ))}
      </div>
    </footer>
  )
}
