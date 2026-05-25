import type { GameState } from '../data/types'
import {
  STREET_LUCK_BASE_CHANCE,
  STREET_LUCK_BONUS_CHANCE_CAP,
  STREET_LUCK_DURATION_MIN,
  STREET_LUCK_DURATION_RANGE,
  STREET_LUCK_MIN_UNITS,
  STREET_LUCK_UNITS_SCALE,
} from './balanceConfig'
import { isGameplayModalBlocking } from './lifeEventFlow'
import { sumBusinessLevels, sumRecruitLevels } from './progressionMomentum'

export function maybeRollStreetLuck(state: GameState): GameState {
  if (state.tickCount < state.streetLuckEndTick) return state
  const units = sumRecruitLevels(state) + sumBusinessLevels(state)
  if (units < STREET_LUCK_MIN_UNITS) return state
  if (isGameplayModalBlocking(state)) return state

  const bonus = Math.min(STREET_LUCK_BONUS_CHANCE_CAP, units / STREET_LUCK_UNITS_SCALE)
  if (Math.random() >= STREET_LUCK_BASE_CHANCE + bonus) return state

  const dur = STREET_LUCK_DURATION_MIN + Math.floor(Math.random() * STREET_LUCK_DURATION_RANGE)
  const mult = Math.random() < 0.74 ? 2 : 3
  return {
    ...state,
    streetLuckEndTick: state.tickCount + dur,
    streetLuckMoneyMult: mult,
  }
}
