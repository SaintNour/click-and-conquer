import type { BusinessDef, RecruitDef } from '../data/types'
import { SHOP_COST_MULT } from './balanceConfig'

/** Per-level grind on top of exponential shop curve (see SHOP_COST_MULT). */
function upgradeTierPinch(currentLevel: number): number {
  return 1 + Math.min(0.26, currentLevel * 0.00165)
}

export function upgradeCost(def: RecruitDef | BusinessDef, currentLevel: number): number {
  return Math.floor(
    def.baseCost * def.costMult ** currentLevel * SHOP_COST_MULT * upgradeTierPinch(currentLevel),
  )
}

/** Sum cost for `qty` consecutive levels starting at `currentLevel`. */
export function upgradeCostBulk(
  def: RecruitDef | BusinessDef,
  currentLevel: number,
  qty: number,
): number {
  let sum = 0
  for (let i = 0; i < qty; i++) sum += upgradeCost(def, currentLevel + i)
  return sum
}

const MAX_BULK_LEVELS = 500_000

/** Largest `qty ≥ 1` such that bulk cost ≤ `money` (0 if cannot afford one level). */
export function maxAffordableBulk(
  def: RecruitDef | BusinessDef,
  currentLevel: number,
  money: number,
): number {
  if (money < upgradeCost(def, currentLevel)) return 0
  let lo = 1
  let hi = 2
  while (hi < MAX_BULK_LEVELS && upgradeCostBulk(def, currentLevel, hi) <= money) {
    lo = hi
    hi = Math.min(hi * 2, MAX_BULK_LEVELS)
  }
  if (hi === MAX_BULK_LEVELS && upgradeCostBulk(def, currentLevel, MAX_BULK_LEVELS) <= money) {
    return MAX_BULK_LEVELS
  }
  let left = lo
  let right = hi
  while (left < right) {
    const mid = Math.floor((left + right + 1) / 2)
    if (upgradeCostBulk(def, currentLevel, mid) <= money) left = mid
    else right = mid - 1
  }
  return left
}
