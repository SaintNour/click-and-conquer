import { getStreetEventDef } from '../data/eventRegistry'
import { LIFE_EVENTS, MEET_GIRLFRIEND_LIFE_EVENT_ID } from '../data/lifeEvents'
import type { GameState, RandomEventDef } from '../data/types'

export type LifeEventPriority = 'minor' | 'major'

/** Only these life events use the blocking modal; all other life content is embedded + non-blocking. */
export const GIRLFRIEND_BLOCKING_LIFE_EVENT_IDS = new Set<string>([
  MEET_GIRLFRIEND_LIFE_EVENT_ID,
  'life_partner_text',
  'life_partner_text_late',
  'life_family_dinner',
  'life_family_dinner_tense',
  'life_jealousy',
  'life_gang_rumor',
  'life_gang_leader_demand',
  'life_tier3_tab_tip',
  'life_tier3_date_surprise',
])

export function isGirlfriendBlockingLifeEventId(id: string | null): boolean {
  if (!id) return false
  return GIRLFRIEND_BLOCKING_LIFE_EVENT_IDS.has(id)
}

/**
 * Blocking life modal = girlfriend/relationship only.
 * Data `priority` is ignored here so mis-tagged events never block by mistake.
 */
export function isBlockingLifeEventId(id: string | null): boolean {
  return isGirlfriendBlockingLifeEventId(id)
}

export function getLifeEventDefById(id: string | null | undefined): RandomEventDef | null {
  if (!id) return null
  return LIFE_EVENTS.find((e) => e.id === id) ?? null
}

/** Display / weighting only; blocking uses `isBlockingLifeEventId`. */
export function lifeEventPriority(def: RandomEventDef | null | undefined): LifeEventPriority {
  return def?.priority ?? 'minor'
}

/** Blocking street modal = rival `eventKind` only. */
export function isBlockingStreetEventId(id: string | null): boolean {
  if (!id) return false
  return getStreetEventDef(id)?.eventKind === 'rival'
}

/** Def for UI embedded panel: minor life or non-rival street card. */
export function getEmbeddedNarrativeEventDef(eventId: string): RandomEventDef | undefined {
  const life = LIFE_EVENTS.find((e) => e.id === eventId)
  if (life && !isBlockingLifeEventId(eventId)) return life
  const st = getStreetEventDef(eventId)
  if (st && st.eventKind !== 'rival') return st
  return undefined
}

export function isGameplayModalBlocking(state: GameState): boolean {
  return Boolean(
    state.pendingRivalEncounter ||
    state.pendingWarStrike ||
    (state.pendingEventId && isBlockingStreetEventId(state.pendingEventId)) ||
    (state.pendingLifeEventId && isBlockingLifeEventId(state.pendingLifeEventId)),
  )
}

/**
 * Before showing a blocking rival street / girlfriend modal / rival encounter:
 * park embedded minor life + embedded non-rival street.
 */
export function stashActiveMinorLifeForBlocking(state: GameState): GameState {
  let next = state
  const lid = next.pendingLifeEventId
  if (lid && !isBlockingLifeEventId(lid)) {
    next = {
      ...next,
      pausedMinorLifeEventId: lid,
      pendingLifeEventId: null,
    }
  }
  const sid = next.pendingMinorStreetEventId
  if (sid) {
    next = {
      ...next,
      pausedMinorStreetEventId: sid,
      pendingMinorStreetEventId: null,
    }
  }
  return next
}

export function maybeRestorePausedMinorLifeEvent(state: GameState): GameState {
  const p = state.pausedMinorLifeEventId
  if (!p) return state
  if (
    state.pendingLifeEventId ||
    (state.pendingEventId && isBlockingStreetEventId(state.pendingEventId)) ||
    state.pendingRivalEncounter ||
    state.pendingMinorStreetEventId
  )
    return state
  return { ...state, pendingLifeEventId: p, pausedMinorLifeEventId: null }
}

export function maybeRestorePausedMinorStreetEvent(state: GameState): GameState {
  const p = state.pausedMinorStreetEventId
  if (!p) return state
  if (
    state.pendingLifeEventId ||
    (state.pendingEventId && isBlockingStreetEventId(state.pendingEventId)) ||
    state.pendingRivalEncounter ||
    state.pendingMinorStreetEventId
  )
    return state
  return { ...state, pendingMinorStreetEventId: p, pausedMinorStreetEventId: null }
}

/** After any blocking UI clears, restore shelved embedded events (life first, then street). */
export function maybeRestorePausedEmbeddedEvents(state: GameState): GameState {
  if (isGameplayModalBlocking(state)) return state
  let s = maybeRestorePausedMinorLifeEvent(state)
  if (isGameplayModalBlocking(s)) return s
  s = maybeRestorePausedMinorStreetEvent(s)
  return s
}
