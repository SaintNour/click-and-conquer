import { BUSINESSES } from '../data/businesses'
import { RECRUITS } from '../data/recruits'
import type { ShopUpgradeDef } from '../data/shopUpgrades'
import { shopUpgradeById, SHOP_UPGRADES } from '../data/shopUpgrades'
import { countTerritoriesOwned } from '../data/territories'
import type { GameState } from '../data/types'
import { EMPIRE_UPGRADE_COST_MULT } from './balanceConfig'
import { intrinsicRecruitPowerFactor } from './progressionMomentum'
import { rowLevelMilestoneMult } from './milestoneScaling'

function territoriesOwnedCount(state: GameState): number {
  return countTerritoriesOwned(state.territoriesOwned)
}

function sumRecruitLevels(state: GameState): number {
  return RECRUITS.reduce((s, r) => s + (state.recruitLevels[r.id] ?? 0), 0)
}

function sumBusinessLevels(state: GameState): number {
  return BUSINESSES.reduce((s, b) => s + (state.businessLevels[b.id] ?? 0), 0)
}

export function isUnlockConditionMet(state: GameState, cond: ShopUpgradeDef['unlock']): boolean {
  switch (cond.type) {
    case 'recruit_min':
      return (state.recruitLevels[cond.recruitId] ?? 0) >= cond.min
    case 'business_min':
      return (state.businessLevels[cond.businessId] ?? 0) >= cond.min
    case 'power_min':
      return state.power >= cond.min
    case 'territories_min':
      return territoriesOwnedCount(state) >= cond.min
    case 'total_recruit_levels_min':
      return sumRecruitLevels(state) >= cond.min
    case 'sum_business_levels_min':
      return sumBusinessLevels(state) >= cond.min
    case 'all':
      return cond.conditions.every((c) => isUnlockConditionMet(state, c))
  }
}

export function isShopUpgradeUnlocked(state: GameState, def: ShopUpgradeDef): boolean {
  return isUnlockConditionMet(state, def.unlock)
}

export function isShopUpgradePurchased(state: GameState, id: string): boolean {
  return state.shopUpgradesPurchased[id] === true
}

export function scaledShopUpgradeCost(def: ShopUpgradeDef): number {
  return Math.max(1, Math.floor(def.cost * EMPIRE_UPGRADE_COST_MULT))
}

export function canPurchaseShopUpgrade(state: GameState, id: string): boolean {
  const def = shopUpgradeById(id)
  if (!def || isShopUpgradePurchased(state, id)) return false
  if (!isShopUpgradeUnlocked(state, def)) return false
  return state.money >= scaledShopUpgradeCost(def)
}

function purchasedDefs(state: GameState): ShopUpgradeDef[] {
  return SHOP_UPGRADES.filter((u) => state.shopUpgradesPurchased[u.id])
}

export type GlobalIncomeMults = {
  clickMoney: number
  passiveMoney: number
  clickPower: number
  passivePower: number
  allMoney: number
  allPower: number
}

export function globalIncomeMultipliers(state: GameState): GlobalIncomeMults {
  const out: GlobalIncomeMults = {
    clickMoney: 1,
    passiveMoney: 1,
    clickPower: 1,
    passivePower: 1,
    allMoney: 1,
    allPower: 1,
  }
  for (const u of purchasedDefs(state)) {
    for (const e of u.effects) {
      if (e.kind !== 'global') continue
      switch (e.scope) {
        case 'clickMoney':
          out.clickMoney *= e.mult
          break
        case 'passiveMoney':
          out.passiveMoney *= e.mult
          break
        case 'clickPower':
          out.clickPower *= e.mult
          break
        case 'passivePower':
          out.passivePower *= e.mult
          break
        case 'allMoney':
          out.allMoney *= e.mult
          break
        case 'allPower':
          out.allPower *= e.mult
          break
      }
    }
  }
  return out
}

function recruitFlatMult(state: GameState, recruitId: string): number {
  let m = 1
  for (const u of purchasedDefs(state)) {
    for (const e of u.effects) {
      if (e.kind === 'recruit' && e.recruitId === recruitId) m *= e.mult
    }
  }
  return m
}

function synergyPowerFactor(state: GameState, toRecruitId: string): number {
  let m = 1
  for (const u of purchasedDefs(state)) {
    for (const e of u.effects) {
      if (e.kind !== 'synergy_power' || e.toRecruit !== toRecruitId) continue
      const fromLv = state.recruitLevels[e.fromRecruit] ?? 0
      const raw = 1 + fromLv * e.perFromLevel
      const capped = Math.min(e.capMult, raw)
      m *= capped
    }
  }
  return m
}

/** Purchased upgrades: extra recruit-power scaling from total business footprint. */
function synergyBusinessRecruitPowerFromShop(state: GameState): number {
  let m = 1
  const sumBiz = sumBusinessLevels(state)
  for (const u of purchasedDefs(state)) {
    for (const e of u.effects) {
      if (e.kind !== 'synergy_business_recruit_power') continue
      m *= Math.min(e.capMult, 1 + sumBiz * e.perBusinessLevel)
    }
  }
  return m
}

/** Multiplier for a recruit's contribution to click power & passive power. */
export function recruitPowerMultiplier(state: GameState, recruitId: string): number {
  const lv = state.recruitLevels[recruitId] ?? 0
  return (
    recruitFlatMult(state, recruitId) *
    synergyPowerFactor(state, recruitId) *
    synergyBusinessRecruitPowerFromShop(state) *
    intrinsicRecruitPowerFactor(state, recruitId) *
    rowLevelMilestoneMult(lv)
  )
}

/** Multiplier for a business's money (click + passive from that business). */
export function businessMoneyMultiplier(state: GameState, businessId: string): number {
  let m = 1
  for (const u of purchasedDefs(state)) {
    for (const e of u.effects) {
      if (e.kind === 'business' && e.businessId === businessId) m *= e.mult
    }
  }
  const lv = state.businessLevels[businessId] ?? 0
  return m * rowLevelMilestoneMult(lv)
}
