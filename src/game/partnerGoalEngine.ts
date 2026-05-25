import type { GameState } from '../data/types'
import { clampPassiveScale } from './compute'
import { attachOutcomeBanner } from './outcomeMeta'

function clampLifeStat(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)))
}

export function startPartnerGoal(state: GameState): GameState {
  if (!state.hasPartner || state.partnerGoal) return state
  return {
    ...state,
    partnerGoal: {
      baselineMoney: state.money,
      targetMoneyDelta: 42_000,
      maxHeat: 46,
      endTick: state.tickCount + 165,
    },
  }
}

/** Run after economy tick; `beforeTick` is state snapshot at tick start (for outcome deltas). */
export function tickPartnerGoal(beforeTick: GameState, s: GameState): GameState {
  const g = s.partnerGoal
  if (!g) return s
  if (s.money - g.baselineMoney >= g.targetMoneyDelta) {
    const next = {
      ...s,
      partnerGoal: null,
      affection: clampLifeStat(s.affection + 10),
      happiness: clampLifeStat(s.happiness + 8),
      passiveScale: clampPassiveScale(s.passiveScale + 0.004),
    }
    return attachOutcomeBanner(beforeTick, next, {
      title: 'Shared goal hit',
      detail:
        'You banked the target while keeping the heat promise. Affection, happiness, and scale all nod.',
      variant: 'success',
    })
  }
  if (s.heat > g.maxHeat) {
    const next = {
      ...s,
      partnerGoal: null,
      loyalty: clampLifeStat(s.loyalty - 5),
    }
    return attachOutcomeBanner(beforeTick, next, {
      title: 'Shared goal slipped',
      detail: 'Heat spiked past what you promised together. Loyalty took the lesson.',
      variant: 'fail',
    })
  }
  if (s.tickCount >= g.endTick) {
    const next = { ...s, partnerGoal: null }
    return attachOutcomeBanner(beforeTick, next, {
      title: 'Shared goal lapsed',
      detail: 'The window closed before the bag landed. Try another lap when the tempo fits.',
      variant: 'neutral',
    })
  }
  return s
}
