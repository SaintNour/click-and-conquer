import { useLayoutEffect } from 'react'
import { playMinorLifeEventOpenSfx } from '../audio/gameSfx'
import { playEventChoicePress } from '../animations/eventModalFx'
import { LIFE_EVENTS } from '../data/lifeEvents'
import type { EventChoiceDef, GameState } from '../data/types'
import { getEmbeddedNarrativeEventDef } from '../game/lifeEventFlow'
import { choiceMinStockpileNeeded, lifeChoiceDisplayLabel } from '../game/lifeChoiceCosts'

type Props = {
  eventId: string
  state: GameState
  onResolve: (eventId: string, choice: EventChoiceDef) => void
}

function choiceDisabled(state: GameState, c: EventChoiceDef): boolean {
  const need = choiceMinStockpileNeeded(state, c)
  if (state.money < need.money || state.power < need.power) return true
  return false
}

export function MinorLifeEventCard({ eventId, state, onResolve }: Props) {
  const ev = getEmbeddedNarrativeEventDef(eventId)

  useLayoutEffect(() => {
    if (!ev) return
    queueMicrotask(() => playMinorLifeEventOpenSfx())
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
