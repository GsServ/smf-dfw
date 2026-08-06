import { site } from '../content'

export default function SiteFooter({
  onNavigate,
}: {
  onNavigate?: (path: string) => void
}) {
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

        {/* Deliberately quiet. Only church reps need this; everyone else is here
            for the calendar and shouldn't be nudged toward a sign-in page. */}
        {onNavigate && (
          <p className="mt-5">
            <a
              href="/portal"
              onClick={(e) => {
                e.preventDefault()
                onNavigate('/portal')
              }}
              className="font-mono text-[11px] uppercase tracking-[0.14em] text-gold-label hover:text-gold"
            >
              Church representatives → sign in
            </a>
          </p>
        )}
      </div>
    </footer>
  )
}
