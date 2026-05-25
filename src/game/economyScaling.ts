import { countTerritoriesOwned } from '../data/territories'
import type { GameState } from '../data/types'

/**
 * Life / UI: charge max(base, wealth slice, passive-income slice), then clamp to cap.
 * Used for dates, gifts, marriage, and life-event choice costs.
 */
export function calculateDynamicMoneyCost(
  state: GameState,
  baseCost: number,
  wealthFraction: number,
  cap: number,
  passiveIncomePerSecond: number,
  passiveIncomeSeconds: number,
): number {
  const fromWealth = Math.floor(state.money * wealthFraction)
  const fromPassive =
    passiveIncomeSeconds > 0 ? Math.floor(passiveIncomePerSecond * passiveIncomeSeconds) : 0
  const merged = Math.max(baseCost, fromWealth, fromPassive)
  return Math.min(cap, merged)
}

export function calculateDynamicPowerCost(
  state: GameState,
  baseCost: number,
  powerStockFraction: number,
  cap: number,
  passivePowerPerSecond: number,
  passivePowerSeconds: number,
): number {
  const fromStock = Math.floor(state.power * powerStockFraction)
  const fromPassive =
    passivePowerSeconds > 0 ? Math.floor(passivePowerPerSecond * passivePowerSeconds) : 0
  const merged = Math.max(baseCost, fromStock, fromPassive)
  return Math.min(cap, merged)
}

/** 0 at broke run, ramps toward ~1 in late billions (for crackdown / war scaling). */
export function economyWealthPressure01(state: GameState): number {
  const m = Math.max(0, state.money)
  return Math.max(0, Math.min(1, (Math.log10(m + 500) - 2.2) / 5.2))
}

/**
 * Slight passive drag in mid-game to curb runaway inflation; eases slightly in very late money.
 */
export function passiveEconomyDragMultiplier(state: GameState): number {
  const t = countTerritoriesOwned(state.territoriesOwned)
  const m = state.money
  if (t < 4 && m < 120_000) return 1
  if (t < 9 && m < 2_500_000) return 0.93
  if (m < 40_000_000) return 0.89
  return 0.91
}
