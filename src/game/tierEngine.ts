import { STATIC_TERRITORIES, buildInfiniteTerritory } from '../data/territories'
import type { GameState } from '../data/types'
import type { TerritoryDef } from '../data/types'

/**
 * Tier system — groups territories into 5 tiers of 3 (handcrafted set).
 * Each tier has a (min, max) power-required bracket derived from those territories.
 * Tier 6+ wraps into infinite territory generation.
 */
export const TIER_COUNT = 5
export const TERRITORIES_PER_TIER = 3
export const FAIL_COST_BUMP_PER_LOSS = 0.15

/** Power bracket for one tier (min/max territory power-required across the tier). */
export type TierBracket = {
  tier: number
  min: number
  max: number
  territoryIds: string[]
}

function computeStaticTierBrackets(): TierBracket[] {
  const brackets: TierBracket[] = []
  for (let t = 0; t < TIER_COUNT; t++) {
    const slice = STATIC_TERRITORIES.slice(t * TERRITORIES_PER_TIER, (t + 1) * TERRITORIES_PER_TIER)
    if (slice.length === 0) continue
    const min = slice[0]!.powerRequired
    const max = slice[slice.length - 1]!.powerRequired
    brackets.push({ tier: t + 1, min, max, territoryIds: slice.map((s) => s.id) })
  }
  return brackets
}

export const STATIC_TIER_BRACKETS: TierBracket[] = computeStaticTierBrackets()

/** Tier (1..N+) a given territory belongs to. Static tiers fixed; infinite territories fall into tier `TIER_COUNT + index/3`. */
export function tierForTerritoryId(territoryId: string): number {
  for (const b of STATIC_TIER_BRACKETS) {
    if (b.territoryIds.includes(territoryId)) return b.tier
  }
  const m = /^inf_(\d+)$/.exec(territoryId)
  if (!m) return TIER_COUNT
  const idx = parseInt(m[1]!, 10)
  return TIER_COUNT + Math.floor(idx / TERRITORIES_PER_TIER) + 1
}

/**
 * Player tier — derived from current power vs the tiers' power brackets.
 * Tier 1 = power is in the lowest bracket; Tier N = high-end empire territory.
 * Always returns at least 1.
 */
export function playerPowerTier(state: GameState): number {
  const p = state.power
  // Sit one tier above the highest tier whose `min` you've passed.
  let tier = 1
  for (const b of STATIC_TIER_BRACKETS) {
    if (p >= b.min * 0.6) tier = b.tier
  }
  return tier
}

/** Power bracket for the player's current tier — used in the City Map header strip. */
export function playerPowerBracket(state: GameState): { tier: number; min: number; max: number } {
  const tier = playerPowerTier(state)
  const b = STATIC_TIER_BRACKETS.find((x) => x.tier === tier)
  if (b) return { tier, min: b.min, max: b.max }
  return { tier, min: 1, max: Number.POSITIVE_INFINITY }
}

/** Which tiers should the City Map / Gangs list include? Always from tier 1 up through your tier + 1. */
export function visibleTierRange(state: GameState): { min: number; max: number } {
  const t = playerPowerTier(state)
  return { min: 1, max: t + 1 }
}

/**
 * Effective power required for a takeover attempt — base requirement × (1 + fail bumps).
 * Used by the small-war entry-fee check + the territory list display.
 */
export function effectiveTerritoryPowerRequired(state: GameState, territory: TerritoryDef): number {
  const bumpMult = state.territoryFailMult?.[territory.id] ?? 1
  return Math.floor(territory.powerRequired * bumpMult)
}

/** Rough defense rating for one ward (UI + rival floor), ~24% of push cost. */
export function territoryDefenseRating(state: GameState, territoryId: string): number {
  const def = territoryDefById(territoryId)
  if (!def) return 0
  return Math.floor(effectiveTerritoryPowerRequired(state, def) * 0.24)
}

/** Convenience: bump the fail multiplier for a territory by FAIL_COST_BUMP_PER_LOSS. */
export function bumpedFailMultiplier(state: GameState, territoryId: string): number {
  const cur = state.territoryFailMult?.[territoryId] ?? 1
  return Math.min(3, cur + FAIL_COST_BUMP_PER_LOSS)
}

/**
 * Minimum crew `powerLevel` implied by the turf this rival holds (player-visible scale).
 * Prevents a gang sitting on a 48k ward from showing ~15⚡ while the push costs 48k⚡.
 */
export function rivalDefenseFloorFromTerritory(state: GameState, rivalId: string): number {
  const owner = state.territoryOwner ?? {}
  let maxFloor = 0
  for (const tid of Object.keys(owner)) {
    if (owner[tid] !== rivalId) continue
    if (state.territoriesOwned[tid]) continue
    const def = territoryDefById(tid)
    if (!def) continue
    maxFloor = Math.max(maxFloor, territoryDefenseRating(state, tid))
  }
  return maxFloor
}

/** All territory ids that fall in a given tier (handcrafted only; infinite tiers are open-ended). */
export function territoryIdsForTier(tier: number): string[] {
  const b = STATIC_TIER_BRACKETS.find((x) => x.tier === tier)
  if (b) return [...b.territoryIds]
  if (tier <= TIER_COUNT) return []
  // Infinite territories — return the 3 that fall in this tier offset.
  const offset = (tier - TIER_COUNT - 1) * TERRITORIES_PER_TIER
  return [0, 1, 2].map((k) => `inf_${offset + k}`)
}

/** Resolves a territory id to a TerritoryDef regardless of static/infinite. */
export function territoryDefById(territoryId: string): TerritoryDef | null {
  const s = STATIC_TERRITORIES.find((t) => t.id === territoryId)
  if (s) return s
  const m = /^inf_(\d+)$/.exec(territoryId)
  if (!m) return null
  return buildInfiniteTerritory(parseInt(m[1]!, 10))
}
