import type { EventChoiceDef, GameState, LifeScaledMoneyCost } from '../data/types'
import { passiveMoneyPerSecond, passivePowerPerSecond } from './compute'
import { calculateDynamicMoneyCost, calculateDynamicPowerCost } from './economyScaling'

function dynamicMoneyCap(state: GameState, sc: LifeScaledMoneyCost, fromWealth: number): number {
  if (sc.capWealthFraction != null && sc.capWealthFraction > 0) {
    return Math.max(sc.cap, Math.floor(state.money * sc.capWealthFraction))
  }
  if (state.money <= sc.cap * 3) return sc.cap
  return Math.max(
    sc.cap,
    Math.min(Math.floor(state.money * 0.13), Math.max(sc.cap, Math.floor(fromWealth * 2.6))),
  )
}

export function effectiveLifeMoneyCost(state: GameState, c: EventChoiceDef): number {
  const sc = c.scaledMoneyCost
  if (sc) {
    const pps = passiveMoneyPerSecond(state)
    const passivePin =
      sc.passiveIncomeSeconds != null && sc.passiveIncomeSeconds > 0
        ? Math.floor(pps * sc.passiveIncomeSeconds)
        : state.money > 85_000
          ? Math.floor(pps * 7)
          : 0
    const fromWealth = Math.round(state.money * sc.fractionOfWealth)
    const raw = Math.max(sc.floor, fromWealth, passivePin)
    const cap = dynamicMoneyCap(state, sc, fromWealth)
    return Math.min(cap, raw)
  }
  if (c.costMoney != null) {
    const pps = passiveMoneyPerSecond(state)
    return calculateDynamicMoneyCost(
      state,
      c.costMoney,
      0.0018,
      Math.max(180_000, c.costMoney * 200),
      pps,
      16,
    )
  }
  return 0
}

export function effectiveLifePowerCost(state: GameState, c: EventChoiceDef): number {
  const sc = c.scaledPowerCost
  if (sc) {
    const pps = passivePowerPerSecond(state)
    const passivePin =
      sc.passivePowerSeconds != null && sc.passivePowerSeconds > 0
        ? Math.floor(pps * sc.passivePowerSeconds)
        : state.power > 2_200
          ? Math.floor(pps * 5.5)
          : 0
    const fromStock = Math.round(state.power * sc.fractionOfPower)
    const raw = Math.max(sc.floor, fromStock, passivePin)
    let cap = sc.cap
    if (sc.capPowerStockFraction != null && sc.capPowerStockFraction > 0) {
      cap = Math.max(sc.cap, Math.floor(state.power * sc.capPowerStockFraction))
    } else if (state.power > sc.cap * 2.5) {
      cap = Math.max(sc.cap, Math.min(Math.floor(state.power * 0.22), Math.floor(fromStock * 2.4)))
    }
    return Math.min(cap, raw)
  }
  if (c.costPower != null) {
    const pps = passivePowerPerSecond(state)
    return calculateDynamicPowerCost(
      state,
      c.costPower,
      0.028,
      Math.max(12_000, c.costPower * 90),
      pps,
      10,
    )
  }
  return 0
}

export function formatLifeMoneyAmount(n: number): string {
  return `$${Math.max(0, Math.floor(n)).toLocaleString()}`
}

/**
 * Replace {{money}} / {{power}} with resolved amounts. Labels should avoid ASCII hyphen for copy tone.
 */
export function lifeChoiceDisplayLabel(state: GameState, c: EventChoiceDef): string {
  const m = effectiveLifeMoneyCost(state, c)
  const p = effectiveLifePowerCost(state, c)
  let label = c.label
  if (label.includes('{{money}}')) {
    label = label.replace(/\{\{money\}\}/g, formatLifeMoneyAmount(m))
  }
  if (label.includes('{{power}}')) {
    label = label.replace(/\{\{power\}\}/g, `${Math.max(0, Math.floor(p)).toLocaleString()}⚡`)
  }
  return label
}
