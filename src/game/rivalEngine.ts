import type { RandomEventDef } from '../data/types'
import type { GameState } from '../data/types'
import type { EventOutcomeBundle, RivalChoiceHooks } from '../data/types'
import type { RivalRelationship } from '../data/rivalTypes'

import { HEAT_CAP } from './balanceConfig'

function relRank(rel: RivalRelationship): number {
  switch (rel) {
    case 'neutral':
      return 0
    case 'rival':
      return 1
    case 'enemy':
      return 2
    case 'nemesis':
      return 3
  }
}

export function escalateRelationship(rel: RivalRelationship): RivalRelationship {
  if (rel === 'neutral') return 'rival'
  if (rel === 'rival') return 'enemy'
  return 'nemesis'
}

function deescalateRelationship(rel: RivalRelationship): RivalRelationship {
  if (rel === 'nemesis') return 'enemy'
  if (rel === 'enemy') return 'rival'
  if (rel === 'rival') return 'neutral'
  return 'neutral'
}

export type RivalFxSource = Partial<EventOutcomeBundle> & Partial<RivalChoiceHooks>

/** Apply heat, rival stats, revenge flags from an outcome bundle or choice hooks. */
export function applyRivalOutcomeEffects(state: GameState, fx: RivalFxSource): GameState {
  let next = state

  if (fx.heatDelta !== undefined) {
    next = {
      ...next,
      heat: Math.min(HEAT_CAP, Math.max(0, next.heat + fx.heatDelta)),
    }
  }

  const rid = fx.rivalFactionId
  if (rid && next.rivals[rid]) {
    const r = next.rivals[rid]!
    let powerLevel = r.powerLevel
    if (fx.rivalPowerDelta !== undefined) {
      powerLevel = Math.max(6, Math.round(powerLevel + fx.rivalPowerDelta))
    }
    let territoryPressure = r.territoryPressure
    if (fx.territoryPressureDelta !== undefined) {
      territoryPressure = Math.min(100, Math.max(0, territoryPressure + fx.territoryPressureDelta))
    }
    let relationship = r.relationship
    if (fx.rivalRelationshipDelta === 1) relationship = escalateRelationship(relationship)
    if (fx.rivalRelationshipDelta === -1) relationship = deescalateRelationship(relationship)

    next = {
      ...next,
      rivals: {
        ...next.rivals,
        [rid]: {
          ...r,
          powerLevel,
          territoryPressure,
          relationship,
        },
      },
    }
  }

  if (fx.revengeUnlocked && rid) {
    next = { ...next, revengeTargetId: rid }
  }

  return next
}

export function interpolateRivalText(text: string, rivalName: string): string {
  return text.replace(/\{\{rival\}\}/g, rivalName)
}

export function pickRivalForEvent(state: GameState, ev: RandomEventDef): string | null {
  const ids = Object.keys(state.rivals).filter((id) => state.rivals[id]?.alive !== false)
  if (ids.length === 0) return null

  let pool = ids
  if (ev.rivalArchetype) {
    const match = ids.filter((id) => state.rivals[id]!.archetype === ev.rivalArchetype)
    if (match.length > 0) pool = match
  }

  let sum = 0
  const weights = pool.map((id) => {
    const r = state.rivals[id]!
    const arch =
      r.archetype === 'aggressive'
        ? 1.15
        : r.archetype === 'greedy'
          ? 1.08
          : r.archetype === 'strategic'
            ? 1.12
            : r.archetype === 'reckless'
              ? 1.18
              : 0.95
    const w = (0.25 + r.aggression) * (1 + relRank(r.relationship) * 0.35) * arch
    sum += w
    return w
  })
  let roll = Math.random() * sum
  for (let i = 0; i < pool.length; i++) {
    roll -= weights[i]!
    if (roll <= 0) return pool[i]!
  }
  return pool[pool.length - 1]!
}

export function eventOutcomeBannerVariant(
  success: boolean,
  _bundle: EventOutcomeBundle,
  opts: {
    isRivalEvent: boolean
    isRevengeEvent: boolean
    homeDefenseTier?: 'full' | 'partial' | 'breach' | null
  },
):
  | 'success'
  | 'fail'
  | 'rival-success'
  | 'rival-fail'
  | 'revenge-success'
  | 'revenge-fail'
  | 'home-success'
  | 'home-partial'
  | 'home-fail' {
  if (opts.isRevengeEvent) return success ? 'revenge-success' : 'revenge-fail'
  if (opts.homeDefenseTier === 'full') return 'home-success'
  if (opts.homeDefenseTier === 'partial') return 'home-partial'
  if (opts.homeDefenseTier === 'breach') return 'home-fail'
  if (opts.isRivalEvent) return success ? 'rival-success' : 'rival-fail'
  return success ? 'success' : 'fail'
}
