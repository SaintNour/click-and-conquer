import type { GameState } from '../data/types'
import {
  HEAT_LAUNDER_COOLDOWN_TICKS,
  HEAT_LAUNDER_DROP_BASE,
  HEAT_LAUNDER_DROP_PER_HEAT,
  HEAT_LAUNDER_MAX_COST,
  HEAT_LAUNDER_MIN_COST,
  HEAT_LAUNDER_MIN_HEAT,
  HEAT_LAUNDER_WEALTH_FRAC,
} from './balanceConfig'
import { setNarratorFromKey } from './narrator'
import { attachOutcomeBanner } from './outcomeMeta'

export function tryHeatLaunder(state: GameState): GameState {
  if (state.tickCount < state.heatLaunderCooldownEndTick) return state
  if (state.heat < HEAT_LAUNDER_MIN_HEAT) return state
  const proposed = Math.round(state.money * HEAT_LAUNDER_WEALTH_FRAC)
  const cost = Math.min(HEAT_LAUNDER_MAX_COST, Math.max(HEAT_LAUNDER_MIN_COST, proposed))
  if (state.money < cost) return state
  const drop = HEAT_LAUNDER_DROP_BASE + Math.floor(state.heat * HEAT_LAUNDER_DROP_PER_HEAT)
  let next: GameState = {
    ...state,
    money: state.money - cost,
    heat: Math.max(0, state.heat - drop),
    heatLaunderCooldownEndTick: state.tickCount + HEAT_LAUNDER_COOLDOWN_TICKS,
  }
  next = setNarratorFromKey(next, 'heat_launder_ok')
  return attachOutcomeBanner(state, next, {
    title: 'Heat laundered',
    detail: 'Paper trails and polite fiction bought the block a quieter night.',
    variant: 'success',
  })
}
