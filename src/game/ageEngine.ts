import type { GameState } from '../data/types'
import { passiveMoneyPerSecond, passivePowerPerSecond } from './compute'
import { setNarratorFromKey } from './narrator'

/** Points needed to age one year; tuned for slow, gameplay-driven pacing. */
export const AGE_POINTS_PER_YEAR = 2800

export const AGE_PROGRESS_EVENT_RESOLVED = 155
export const AGE_PROGRESS_TERRITORY = 300
export const AGE_PROGRESS_PURCHASE = 70
export const AGE_PROGRESS_RIVAL_ENCOUNTER = 52

export type AgeProgressOpts = {
  /** When true, age still advances and pulse fires, but narrator is not replaced (e.g. after event lines). */
  skipNarrator?: boolean
}

export function passiveAgeProgressPerTick(state: GameState): number {
  const m = passiveMoneyPerSecond(state)
  const p = passivePowerPerSecond(state)
  return Math.max(2, Math.floor(2 + m / 20 + p / 14))
}

export function ageProgressFromClick(gainMoney: number, gainPower: number): number {
  return Math.max(1, Math.floor((gainMoney + gainPower * 1.4) / 14))
}

export function applyAgeProgress(
  state: GameState,
  delta: number,
  opts?: AgeProgressOpts,
): GameState {
  if (delta <= 0) return state
  let pts = state.ageProgressPoints + delta
  let age = state.age
  let nonce = state.agePulseNonce
  let years = 0
  while (pts >= AGE_POINTS_PER_YEAR) {
    pts -= AGE_POINTS_PER_YEAR
    age += 1
    years += 1
  }
  if (years === 0) {
    return pts === state.ageProgressPoints ? state : { ...state, ageProgressPoints: pts }
  }
  nonce += 1
  const next: GameState = { ...state, ageProgressPoints: pts, age, agePulseNonce: nonce }
  if (opts?.skipNarrator) return next
  return setNarratorFromKey(next, 'life_age_year')
}
