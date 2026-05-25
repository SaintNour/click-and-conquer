import { useEffect, useRef, useState } from 'react'
import { getStreetEventDef } from '../data/eventRegistry'
import type { GameState } from '../data/types'
import type { LifeSocialAction } from '../game/gameLogic'
import { BossCard } from './BossCard'
import { RivalHud } from './RivalHud'
import { LifePanel } from './LifePanel'
import { HousePanel } from './HousePanel'
import { SidebarAccordionSection } from './SidebarAccordionSection'
import { summaryHq, summaryLife } from './leftSidebarSummaries'

export type SidebarSectionId = 'life' | 'hq'

const OPEN_MAX = 2

type Props = {
  state: GameState
  onAvatarClick: () => void
  onUpgradeHouse: () => void
  onSocial: (action: LifeSocialAction) => void
  onMarry: () => void
  onPrestigeChild: () => void
  onPrestigeSolo: () => void
  onBuyHouseItem: (itemId: string) => void
  onPlaceHouseItem: (slotKey: string, itemId: string | null) => void
  onOpenRevenge: () => void
  onRivalWarAttack: (rivalId: string) => void
  onRivalWarSurge: (rivalId: string) => void
  onRivalSurrender: (rivalId: string) => void
  onRivalTruce: (rivalId: string) => void
  onHeatLaunder?: () => void
  onStartPartnerGoal?: () => void
}

function toggleSection(prev: SidebarSectionId[], id: SidebarSectionId): SidebarSectionId[] {
  if (prev.includes(id)) return prev.filter((x) => x !== id)
  const next = [...prev, id]
  if (next.length <= OPEN_MAX) return next
  return next.slice(next.length - OPEN_MAX)
}

export function LeftSidebarAccordion({
  state,
  onAvatarClick,
  onUpgradeHouse,
  onSocial,
  onMarry,
  onPrestigeChild,
  onPrestigeSolo,
  onBuyHouseItem,
  onPlaceHouseItem,
  onOpenRevenge,
  onRivalWarAttack,
  onRivalWarSurge,
  onRivalSurrender,
  onRivalTruce,
  onHeatLaunder,
  onStartPartnerGoal,
}: Props) {
  const [openSections, setOpenSections] = useState<SidebarSectionId[]>([])
  const prevLifeId = useRef<string | null>(null)
  const prevBlockingStreetId = useRef<string | null>(null)
  const prevMinorStreetId = useRef<string | null>(null)

  const bumpOpen = (id: SidebarSectionId) => {
    setOpenSections((p) => {
      const n = [...new Set([...p, id])]
      return n.length > OPEN_MAX ? n.slice(n.length - OPEN_MAX) : n
    })
  }

  useEffect(() => {
    const id = state.pendingLifeEventId
    if (id && id !== prevLifeId.current) bumpOpen('life')
    prevLifeId.current = id
  }, [state.pendingLifeEventId])

  useEffect(() => {
    const pe = state.pendingEventId
    if (pe && pe !== prevBlockingStreetId.current) {
      const ev = getStreetEventDef(pe)
      if (ev?.targetsHome) bumpOpen('hq')
    }
    prevBlockingStreetId.current = pe

    const pm = state.pendingMinorStreetEventId
    if (pm && pm !== prevMinorStreetId.current) {
      const ev = getStreetEventDef(pm)
      if (ev?.targetsHome) bumpOpen('hq')
    }
    prevMinorStreetId.current = pm
  }, [state.pendingEventId, state.pendingMinorStreetEventId])

  const isOpen = (id: SidebarSectionId) => openSections.includes(id)

  return (
    <div className="left-sidebar">
      <div className="left-sidebar__hud">
        <RivalHud
          state={state}
          onOpenRevenge={onOpenRevenge}
          onRivalWarAttack={onRivalWarAttack}
          onRivalWarSurge={onRivalWarSurge}
          onRivalSurrender={onRivalSurrender}
          onRivalTruce={onRivalTruce}
          onHeatLaunder={onHeatLaunder}
        />
      </div>
      <div className="left-sidebar__intel">
        <p className="left-sidebar__intel-label">Character &amp; intel</p>
        <BossCard state={state} onAvatarClick={onAvatarClick} />
        {state.eventLog.length > 0 ? (
          <div className="left-sidebar__event-log" aria-label="Recent outcomes">
            <p className="left-sidebar__event-log-label">Recent</p>
            <ul className="left-sidebar__event-log-list">
              {state.eventLog.map((e, i) => (
                <li key={`${e.tick}-${i}`} className="left-sidebar__event-log-item">
                  <span className="left-sidebar__event-log-title">{e.title}</span>
                  <span className="left-sidebar__event-log-detail">{e.detail}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>

      <SidebarAccordionSection
        title="Life"
        summary={summaryLife(state)}
        isOpen={isOpen('life')}
        onToggle={() => setOpenSections((p) => toggleSection(p, 'life'))}
      >
        <LifePanel
          state={state}
          onUpgradeHouse={onUpgradeHouse}
          onSocial={onSocial}
          onMarry={onMarry}
          onPrestigeChild={onPrestigeChild}
          onPrestigeSolo={onPrestigeSolo}
          onBuyHouseItem={onBuyHouseItem}
          onPlaceHouseItem={onPlaceHouseItem}
          onStartPartnerGoal={onStartPartnerGoal}
          omitHouse
          embedded
        />
      </SidebarAccordionSection>

      <SidebarAccordionSection
        title="Home / HQ"
        summary={summaryHq(state)}
        isOpen={isOpen('hq')}
        onToggle={() => setOpenSections((p) => toggleSection(p, 'hq'))}
      >
        <HousePanel state={state} onBuyItem={onBuyHouseItem} onPlace={onPlaceHouseItem} />
      </SidebarAccordionSection>
    </div>
  )
}
