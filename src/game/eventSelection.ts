import { RANDOM_EVENTS } from '../data/events'
import { RIVAL_EVENTS } from '../data/rivalEvents'
import { STORY_EVENTS } from '../data/storyEvents'
import { houseTierAtLevel } from '../data/lifeContent'
import type { GameState, RandomEventDef } from '../data/types'
import { territoriesOwnedCount } from './compute'
import { pickRivalForEvent } from './rivalEngine'

/** ~22% of eligible street pulls use story cards when not taking rival branch. */
export const STORY_EVENT_WEIGHT = 0.22

/** Home-threat rival cards: rare vs ordinary rival street pressure. */
const RIVAL_HOME_WEIGHT = 0.13

function eventEligible(state: GameState, ev: RandomEventDef): boolean {
  if (ev.requiresRevenge && !state.revengeTargetId) return false
  if (ev.id === 'rival_revenge_opportunity' && !state.revengeTargetId) return false
  if (ev.minHeat !== undefined && state.heat < ev.minHeat) return false
  if (ev.maxHeat !== undefined && state.heat > ev.maxHeat) return false
  if (ev.targetsHome) {
    const tier = houseTierAtLevel(state.houseLevel)
    if (tier.gridSize <= 0) return false
    if (ev.minTick !== undefined && state.tickCount < ev.minTick) return false
    if (ev.minTerritories !== undefined && territoriesOwnedCount(state) < ev.minTerritories) {
      return false
    }
  }
  return true
}

function filterPool(state: GameState, pool: RandomEventDef[]): RandomEventDef[] {
  return pool.filter((e) => eventEligible(state, e))
}

/**
 * Pick the next street event (generic / story / rival) with heat-aware weighting.
 */
export function pickStreetEvent(state: GameState): {
  event: RandomEventDef
  rivalContext: { rivalId: string } | null
} {
  const heat = state.heat
  const territories = territoriesOwnedCount(state)
  const tick = state.tickCount
  const hasRivals = Object.keys(state.rivals).some((id) => state.rivals[id]?.alive !== false)

  // Revenge follow-up: occasional priority when flagged (enough to matter, not spammy)
  const revPool = filterPool(state, RIVAL_EVENTS).filter(
    (e) => e.id === 'rival_revenge_opportunity',
  )
  if (revPool.length && state.revengeTargetId && Math.random() < 0.17) {
    const event = revPool[0]!
    return { event, rivalContext: { rivalId: state.revengeTargetId } }
  }

  const rivalFiltered = filterPool(state, RIVAL_EVENTS)
  const storyFiltered = filterPool(state, STORY_EVENTS)
  const genericFiltered = filterPool(state, RANDOM_EVENTS)

  // Base rival pressure: scales with heat/territory but sublinear on heat to avoid late-game spam
  const heatT = Math.pow(Math.min(1, heat / 100), 1.08)
  let pRival = 0.042 + heatT * 0.168 + Math.sqrt(Math.max(0, territories)) * 0.011
  // First ~3.5 min: ramp from “whispers” to full weighting
  if (tick < 210) {
    pRival *= 0.38 + 0.62 * (tick / 210)
  }
  // Low heat: light pressure only (mostly scout/rumor-tier cards); ramps fully by ~22 heat
  if (heat < 22) {
    pRival *= 0.48 + 0.52 * (heat / 22)
  }
  if (!hasRivals || rivalFiltered.length === 0) pRival = 0

  let pStory = STORY_EVENT_WEIGHT * (storyFiltered.length > 0 ? 1 : 0)
  let pGen = Math.max(0.2, 1 - pRival - pStory)
  const sum = pRival + pStory + pGen
  pRival /= sum
  pStory /= sum
  pGen /= sum

  const r = Math.random()

  if (r < pRival && rivalFiltered.length > 0) {
    const rivalHome = rivalFiltered.filter((e) => e.targetsHome)
    const rivalNonHome = rivalFiltered.filter((e) => !e.targetsHome)
    let pool = rivalFiltered
    if (rivalHome.length > 0 && rivalNonHome.length > 0 && Math.random() < RIVAL_HOME_WEIGHT) {
      pool = rivalHome
    } else if (rivalNonHome.length > 0) {
      pool = rivalNonHome
    } else {
      pool = rivalHome.length > 0 ? rivalHome : rivalNonHome
    }
    const event = pool[Math.floor(Math.random() * pool.length)]!
    const rivalId = pickRivalForEvent(state, event)
    return { event, rivalContext: rivalId ? { rivalId } : null }
  }

  if (r < pRival + pStory && storyFiltered.length > 0) {
    const event = storyFiltered[Math.floor(Math.random() * storyFiltered.length)]!
    return { event, rivalContext: null }
  }

  const event = genericFiltered[Math.floor(Math.random() * genericFiltered.length)]!
  return { event, rivalContext: null }
}
