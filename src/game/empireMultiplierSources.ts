import { SHOP_UPGRADES } from '../data/shopUpgrades'
import { countTerritoriesOwned } from '../data/territories'
import type { GameState } from '../data/types'
import { PASSIVE_SCALE_CAP } from './constants'
import { sumBusinessLevels, sumRecruitLevels, territoriesOwnedCount } from './progressionMomentum'

function clampScaleComponent(scale: number): number {
  return Math.min(PASSIVE_SCALE_CAP, Math.max(1, scale))
}

/**
 * Permanent empire scale from owned progression (crew, businesses, territories, shop, home, prestige).
 * Replaces the old tick-based passiveScale drift — repeated Hustle clicks no longer inflate this by themselves.
 * With no owned progression, this returns exactly 1.0.
 */
export function progressionEmpireScaleMult(state: GameState): number {
  const t = territoriesOwnedCount(state)
  const u = sumRecruitLevels(state) + sumBusinessLevels(state)
  const shops = countPurchasedShopUpgrades(state)
  const house = state.houseLevel > 0 ? 1 : 0
  const prestige = (state.lifePrestigeMarried ?? 0) + (state.lifePrestigeSolo ?? 0)

  const raw =
    0.15 * Math.sqrt(t) +
    0.0042 * Math.sqrt(Math.max(0, u)) +
    0.052 * shops +
    0.11 * house +
    0.038 * Math.sqrt(prestige)
  const saturation = 1 - Math.exp(-raw)
  // Share the old (CAP-1) budget with event/rival modifiers (additive bonuses below).
  const maxProgBonus = (PASSIVE_SCALE_CAP - 1) * 0.72
  return 1 + maxProgBonus * saturation
}

export function countPurchasedShopUpgrades(state: GameState): number {
  return SHOP_UPGRADES.reduce((n, u) => n + (state.shopUpgradesPurchased[u.id] ? 1 : 0), 0)
}

/** True if the player has any durable progression that should justify non-1.0 empire scale. */
export function hasOwnedProgression(state: GameState): boolean {
  if (countTerritoriesOwned(state.territoriesOwned) > 0) return true
  if (sumRecruitLevels(state) + sumBusinessLevels(state) > 0) return true
  if (countPurchasedShopUpgrades(state) > 0) return true
  if (state.houseLevel > 0) return true
  if ((state.lifePrestigeMarried ?? 0) + (state.lifePrestigeSolo ?? 0) > 0) return true
  return false
}

/**
 * Full permanent empire rhythm multiplier: progression + event/rival layer (`state.passiveScale` bonus only).
 * Capped at PASSIVE_SCALE_CAP. With zero progression and no event modifier, equals 1.0.
 */
export function totalEmpireScaleMultiplier(state: GameState): number {
  const prog = progressionEmpireScaleMult(state)
  const evt = clampScaleComponent(state.passiveScale)
  return clampScaleComponent(1 + (prog - 1) + (evt - 1))
}

/**
 * v9 migration: legacy `passiveScale` mixed tick drift + events + rival hits.
 * Strip inflation that came only from time (no owned progression). Split remainder into the event/rival field
 * so `progressionEmpireScaleMult` + `passiveScale` reconstructs the old total where possible.
 */
export function migratePassiveScaleV9(state: GameState): GameState {
  if (state.saveVersion >= 9) return state
  const oldTotal = clampScaleComponent(state.passiveScale)
  const prog = progressionEmpireScaleMult(state)
  const progB = prog - 1
  const evtBFromLegacy = Math.max(0, oldTotal - 1 - progB)
  const newPassiveScale = !hasOwnedProgression(state) ? 1 : clampScaleComponent(1 + evtBFromLegacy)
  return { ...state, passiveScale: newPassiveScale, saveVersion: 9 }
}
