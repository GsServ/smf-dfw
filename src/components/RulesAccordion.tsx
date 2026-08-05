import { rules, site } from '../content'
import RuleGroup from './RuleGroup'
import SectionHead from './SectionHead'

export default function RulesAccordion() {
  return (
    <section className="wrap py-[clamp(40px,6vw,68px)]" aria-labelledby="rules-heading">
      <SectionHead id="rules-heading" title={site.rulesHeading} note={site.rulesNote} />

      <div className="border-t border-rule">
        {rules.map((group) => (
          <RuleGroup key={group.id} group={group} />
        ))}
      </div>
    </section>
  )
}
