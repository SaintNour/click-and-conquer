import gsap from 'gsap'
import { useLayoutEffect, useRef } from 'react'
import { playMinorLifeEventOpenSfx } from '../audio/gameSfx'
import { playEventChoicePress } from '../animations/eventModalFx'
import { LIFE_EVENTS } from '../data/lifeEvents'
import type { EventChoiceDef, GameState } from '../data/types'
import { getEmbeddedNarrativeEventDef } from '../game/lifeEventFlow'
import {
  effectiveLifeMoneyCost,
  effectiveLifePowerCost,
  lifeChoiceDisplayLabel,
} from '../game/lifeChoiceCosts'

type Props = {
  eventId: string
  state: GameState
  onResolve: (eventId: string, choice: EventChoiceDef) => void
}

function choiceDisabled(state: GameState, c: EventChoiceDef): boolean {
  const cm = effectiveLifeMoneyCost(state, c)
  const cp = effectiveLifePowerCost(state, c)
  const md = c.moneyDelta
  const minNeed = cm + (md !== undefined && md < 0 ? -md : 0)
  if (state.money < minNeed || state.power < cp) return true
  return false
}

function reducedMotion(): boolean {
  return (
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )
}

export function MinorLifeEventCard({ eventId, state, onResolve }: Props) {
  const rootRef = useRef<HTMLDivElement>(null)
  const ev = getEmbeddedNarrativeEventDef(eventId)

  useLayoutEffect(() => {
    if (!ev) return
    queueMicrotask(() => playMinorLifeEventOpenSfx())
    const el = rootRef.current
    if (!el || reducedMotion()) return
    gsap.killTweensOf(el, 'opacity,y,scale')
    gsap.fromTo(
      el,
      { y: 10, opacity: 0, scale: 0.98 },
      { y: 0, opacity: 1, scale: 1, duration: 0.36, ease: 'power3.out' },
    )
  }, [eventId, ev])

  if (!ev) return null

  const isLifeCard = Boolean(LIFE_EVENTS.find((e) => e.id === eventId))

  const onPick = async (c: EventChoiceDef, btn: HTMLElement) => {
    if (choiceDisabled(state, c)) return
    await playEventChoicePress(btn)
    onResolve(ev.id, c)
  }

  return (
    <div
      ref={rootRef}
      className="minor-life-event minor-life-event--embedded"
      role="region"
      aria-label={isLifeCard ? 'Life event' : 'Street event'}
      aria-labelledby="minor-life-title"
    >
      <div className="minor-life-event__chrome" aria-hidden />
      <p className="minor-life-event__kicker">{isLifeCard ? 'Life moment' : 'On the street'}</p>
      <h2 id="minor-life-title" className="minor-life-event__title">
        {ev.title}
      </h2>
      <p className="minor-life-event__body">{ev.body}</p>
      <div className="minor-life-event__choices">
        {ev.choices.map((c) => (
          <button
            key={c.id}
            type="button"
            className="minor-life-event__choice"
            disabled={choiceDisabled(state, c)}
            onClick={(e) => void onPick(c, e.currentTarget)}
          >
            {lifeChoiceDisplayLabel(state, c)}
          </button>
        ))}
      </div>
    </div>
  )
}
