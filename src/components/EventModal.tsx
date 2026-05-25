import { useLayoutEffect, useMemo, useRef } from 'react'
import { playEventOpenSfx, playMajorLifeEventOpenSfx } from '../audio/gameSfx'
import {
  playEventBackdropDim,
  playEventCardEnter,
  playEventChoicePress,
  playRivalStreetEventOpen,
} from '../animations/eventModalFx'
import { RANDOM_EVENTS } from '../data/events'
import { LIFE_EVENTS } from '../data/lifeEvents'
import { RIVAL_EVENTS } from '../data/rivalEvents'
import { STORY_EVENTS } from '../data/storyEvents'
import type { EventChoiceDef, GameState, RandomEventDef } from '../data/types'
import { getStreetEventDef } from '../data/eventRegistry'
import {
  getLifeEventDefById,
  isBlockingLifeEventId,
  isBlockingStreetEventId,
} from '../game/lifeEventFlow'
import { GANG_DEMAND_EVENT_ID } from '../game/gangArcEngine'
import { gangStrikeFirstPowerCost } from '../game/rivalsEngine'
import {
  effectiveLifeMoneyCost,
  effectiveLifePowerCost,
  lifeChoiceDisplayLabel,
} from '../game/lifeChoiceCosts'
import { interpolateRivalText } from '../game/rivalEngine'

const ALL_EVENTS = [...RANDOM_EVENTS, ...LIFE_EVENTS, ...STORY_EVENTS, ...RIVAL_EVENTS]

type Props = {
  eventId: string | null
  state: GameState
  onResolve: (eventId: string, choice: EventChoiceDef) => void
}

function choiceDisabled(state: GameState, c: EventChoiceDef, eventId: string): boolean {
  const cm = effectiveLifeMoneyCost(state, c)
  const cp = effectiveLifePowerCost(state, c)
  const md = c.moneyDelta
  const minNeed = cm + (md !== undefined && md < 0 ? -md : 0)
  if (state.money < minNeed || state.power < cp) return true
  if (eventId === GANG_DEMAND_EVENT_ID && c.id === 'cede_turf') {
    if (!Object.values(state.territoriesOwned).some(Boolean)) return true
  }
  return false
}

export function EventModal({ eventId, state, onResolve }: Props) {
  const backdropRef = useRef<HTMLDivElement>(null)
  const cardRef = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    if (!eventId) return
    const ev = ALL_EVENTS.find((e) => e.id === eventId)
    if (!ev) return
    const isLifeMajor = Boolean(getLifeEventDefById(eventId) && isBlockingLifeEventId(eventId))
    const isRival = ev.eventKind === 'rival'
    const isRevenge = ev.id === 'rival_revenge_opportunity'
    const isHomeThreat = !!ev.targetsHome
    if (isRival) {
      const tl = playRivalStreetEventOpen(backdropRef.current, cardRef.current, {
        isRevenge,
        isHomeThreat,
      })
      queueMicrotask(() => playEventOpenSfx())
      return () => {
        tl.kill()
      }
    }
    playEventBackdropDim(backdropRef.current)
    const tl = playEventCardEnter(cardRef.current)
    queueMicrotask(() => (isLifeMajor ? playMajorLifeEventOpenSfx() : playEventOpenSfx()))
    return () => {
      tl.kill()
    }
  }, [eventId])

  // Resolve which tribute the gang leader is demanding for this modal instance — money, power, or
  // a random owned territory (if any). Picked once when the modal opens so the player sees a stable
  // ask while the card is up.
  const demandKind = useMemo<'pay_tribute' | 'pay_power' | 'cede_turf' | null>(() => {
    if (eventId !== GANG_DEMAND_EVENT_ID) return null
    const hasTurf = Object.values(state.territoriesOwned).some(Boolean)
    const pool: Array<'pay_tribute' | 'pay_power' | 'cede_turf'> = hasTurf
      ? ['pay_tribute', 'pay_power', 'cede_turf']
      : ['pay_tribute', 'pay_power']
    return pool[Math.floor(Math.random() * pool.length)]!
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId])

  if (!eventId) return null
  const ev = ALL_EVENTS.find((e) => e.id === eventId)
  if (!ev) return null
  if (getLifeEventDefById(eventId)?.meetConvo) return null
  if (getLifeEventDefById(eventId) && !isBlockingLifeEventId(eventId)) return null
  if (getStreetEventDef(eventId) && !isBlockingStreetEventId(eventId)) return null

  // Filter the demand event down to the rolled tribute + the two war answers.
  const displayedChoicesRaw: EventChoiceDef[] =
    eventId === GANG_DEMAND_EVENT_ID && demandKind
      ? (ev as RandomEventDef).choices.filter(
          (c) => c.id === demandKind || c.id === 'prepare_war' || c.id === 'strike_first',
        )
      : ev.choices

  const strikeFirstCost = eventId === GANG_DEMAND_EVENT_ID ? gangStrikeFirstPowerCost(state) : 0
  const withStrike: EventChoiceDef[] =
    eventId === GANG_DEMAND_EVENT_ID
      ? displayedChoicesRaw.map((c) =>
          c.id === 'strike_first'
            ? {
                ...c,
                costPower: strikeFirstCost,
                label: `Strike first (${strikeFirstCost.toLocaleString()}⚡)`,
              }
            : c,
        )
      : displayedChoicesRaw

  const isBlockingLifeCard = Boolean(
    eventId && getLifeEventDefById(eventId) && isBlockingLifeEventId(eventId),
  )

  const displayedChoices: EventChoiceDef[] = isBlockingLifeCard
    ? withStrike.map((c) => ({ ...c, label: lifeChoiceDisplayLabel(state, c) }))
    : withStrike

  const rivalId = state.pendingRivalEventContext?.rivalId
  const rivalName =
    rivalId && state.rivals[rivalId]?.name ? state.rivals[rivalId]!.name : 'a rival crew'
  const title = interpolateRivalText(ev.title, rivalName)
  const demandBody =
    eventId === GANG_DEMAND_EVENT_ID && demandKind
      ? demandKind === 'pay_tribute'
        ? 'They want cash on the table · pay the tribute or answer with smoke. The street does not rewind.'
        : demandKind === 'pay_power'
          ? 'They want your muscle on loan · hand over leverage or answer with smoke. The street does not rewind.'
          : 'They want a slice of your map · cede a territory or answer with smoke. The street does not rewind.'
      : ev.body
  const body = interpolateRivalText(demandBody, rivalName)
  const isRivalEvent = ev.eventKind === 'rival'
  const isRevengeCard = ev.id === 'rival_revenge_opportunity'
  const isHomeThreat = !!ev.targetsHome
  const isLifeMajor =
    Boolean(getLifeEventDefById(eventId) && isBlockingLifeEventId(eventId)) && !isRivalEvent

  const onPick = async (c: EventChoiceDef, el: HTMLElement) => {
    if (choiceDisabled(state, c, ev.id)) return
    await playEventChoicePress(el)
    onResolve(ev.id, c)
  }

  return (
    <div
      ref={backdropRef}
      className={`modal-backdrop modal-backdrop--event${isRivalEvent ? ' modal-backdrop--rival' : ''}${isRevengeCard ? ' modal-backdrop--revenge-event' : ''}${isHomeThreat ? ' modal-backdrop--home-threat' : ''}${isLifeMajor ? ' modal-backdrop--life-major' : ''}`}
      role="dialog"
      aria-modal="true"
      aria-labelledby="event-title"
    >
      <div
        ref={cardRef}
        className={`modal modal--event-card${isRivalEvent ? ' modal--rival-street' : ''}${isRevengeCard ? ' modal--revenge-street' : ''}${isHomeThreat ? ' modal--home-threat' : ''}${isLifeMajor ? ' modal--life-major' : ''}`}
      >
        {isRivalEvent ? (
          <div
            className={`rival-event-badge${isHomeThreat ? ' rival-event-badge--home' : ''}`}
            aria-hidden
          >
            {isRevengeCard ? 'Revenge' : isHomeThreat ? 'At your door' : 'Rival pressure'}
          </div>
        ) : null}
        <h2 id="event-title" className="modal__title">
          {title}
        </h2>
        {isHomeThreat ? (
          <p className="modal__home-stakes" role="presentation">
            {interpolateRivalText(
              `This is not abstract pressure—it is {{rival}} testing where you lay your head.`,
              rivalName,
            )}
          </p>
        ) : null}
        <p className="modal__body">{body}</p>
        <div className="modal__choices">
          {displayedChoices.map((c) => (
            <button
              key={c.id}
              type="button"
              className={`modal__choice${c.costPower && c.costPower >= 24 ? ' modal__choice--danger' : ''}`}
              disabled={choiceDisabled(state, c, ev.id)}
              onClick={(e) => void onPick(c, e.currentTarget)}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
