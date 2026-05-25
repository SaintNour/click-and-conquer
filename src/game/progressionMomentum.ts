import { BUSINESSES } from '../data/businesses'
import { RECRUITS } from '../data/recruits'
import { countTerritoriesOwned } from '../data/territories'
import type { GameState } from '../data/types'
import {
  EARLY_CLICK_MONEY_MULT,
  EARLY_CLICK_POWER_MULT,
  EARLY_SESSION_MAX_UNITS,
  EARLY_SESSION_TICK_MAX,
} from './constants'

/** Intrinsic: business footprint makes crews more efficient (all recruit power). */
const BIZ_PER_LEVEL = 0.0032
const BIZ_RECRUIT_CAP = 1.18

/** Intrinsic: fast runners spot angles for muscle (muscle power only). */
const RUNNER_PER_MUSCLE = 0.014
const RUNNER_MUSCLE_CAP = 1.95

/** Hidden soft scaling — toned for long-form grind (costs outpace these). */
const LOG_TERR_MONEY = 0.02
const LOG_UNIT_MONEY = 0.014
const LOG_TERR_POWER = 0.018
const LOG_UNIT_POWER = 0.016
const LOG_BIZ_GLOBAL = 0.01

export function sumRecruitLevels(state: GameState): number {
  return RECRUITS.reduce((s, r) => s + (state.recruitLevels[r.id] ?? 0), 0)
}

export function sumBusinessLevels(state: GameState): number {
  return BUSINESSES.reduce((s, b) => s + (state.businessLevels[b.id] ?? 0), 0)
}

/**
 * Soft early-session lift after the first owned unit (not pure click spam at zero progression).
 * Temporary pacing — not a permanent scale tied to click count.
 */
export function earlySessionClickMoneyMult(state: GameState): number {
  const units = sumRecruitLevels(state) + sumBusinessLevels(state)
  if (units < 1) return 1
  if (state.tickCount >= EARLY_SESSION_TICK_MAX || units >= EARLY_SESSION_MAX_UNITS) return 1
  return EARLY_CLICK_MONEY_MULT
}

export function earlySessionClickPowerMult(state: GameState): number {
  const units = sumRecruitLevels(state) + sumBusinessLevels(state)
  if (units < 1) return 1
  if (state.tickCount >= EARLY_SESSION_TICK_MAX || units >= EARLY_SESSION_MAX_UNITS) return 1
  return EARLY_CLICK_POWER_MULT
}

export function territoriesOwnedCount(state: GameState): number {
  return countTerritoriesOwned(state.territoriesOwned)
}

/**
 * Always-on recruit power factors (synergy without buying an upgrade).
 * — Total business levels gently boost every recruit’s output.
 * — Runner levels specifically boost Muscle (intel + intimidation pipeline).
 */
export function intrinsicRecruitPowerFactor(state: GameState, recruitId: string): number {
  const bizSum = sumBusinessLevels(state)
  let f = Math.min(BIZ_RECRUIT_CAP, 1 + bizSum * BIZ_PER_LEVEL)
  if (recruitId === 'muscle') {
    const runners = state.recruitLevels.runner ?? 0
    f *= Math.min(RUNNER_MUSCLE_CAP, 1 + runners * RUNNER_PER_MUSCLE)
  }
  return f
}

/** Territory + unit mass: subtle global money momentum. */
export function hiddenMoneyMomentum(state: GameState): number {
  const t = territoriesOwnedCount(state)
  const u = sumRecruitLevels(state)
  const b = sumBusinessLevels(state)
  return (
    (1 + LOG_TERR_MONEY * Math.log1p(t)) *
    (1 + LOG_UNIT_MONEY * Math.log1p(u)) *
    (1 + LOG_BIZ_GLOBAL * Math.log1p(b))
  )
}

/** Territory + unit mass: subtle global power momentum. */
export function hiddenPowerMomentum(state: GameState): number {
  const t = territoriesOwnedCount(state)
  const u = sumRecruitLevels(state)
  return (1 + LOG_TERR_POWER * Math.log1p(t)) * (1 + LOG_UNIT_POWER * Math.log1p(u))
}
