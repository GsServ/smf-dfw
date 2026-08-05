import { useMemo } from 'react'
import { events } from './content'
import { findNextIndex, startOfToday } from './lib/dates'
import DraftBanner from './components/DraftBanner'
import Masthead from './components/Masthead'
import NextEvent from './components/NextEvent'
import SeasonCalendar from './components/SeasonCalendar'
import RulesAccordion from './components/RulesAccordion'
import SiteFooter from './components/SiteFooter'

export default function App() {
  // Past/upcoming is computed from the reader's own date at render, never
  // stored. Nothing on this page can go stale on its own.
  const today = useMemo(() => startOfToday(), [])
  const nextIndex = useMemo(() => findNextIndex(events, today), [today])

  return (
    <>
      <DraftBanner />
      <Masthead />
      <main>
        <NextEvent event={nextIndex > -1 ? events[nextIndex] : null} today={today} />
        <SeasonCalendar events={events} nextIndex={nextIndex} today={today} />
        <RulesAccordion />
      </main>
      <SiteFooter />
    </>
  )
}
