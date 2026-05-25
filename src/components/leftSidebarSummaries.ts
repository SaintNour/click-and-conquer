import { houseTierAtLevel } from '../data/lifeContent'
import { visibleTerritoryDefs } from '../data/territories'
import type { GameState } from '../data/types'
import { territoriesOwnedCount } from '../game/compute'
import { effectiveTerritoryPowerRequired } from '../game/tierEngine'
import { getHomeDefenseProfile, homeDefenseScore } from '../game/homeDefenseEngine'
import { houseGridSize, slotKeysForGrid } from '../game/houseCustomizationEngine'

export function summaryLife(state: GameState): string {
  const tier = houseTierAtLevel(state.houseLevel)
  if (!state.relationshipUnlocked) return `${tier.label} · solo`
  if (state.married) return `${tier.label} · married`
  return `${tier.label} · ${state.hasPartner ? 'dating' : 'social'}`
}

export function summaryHq(state: GameState): string {
  const defense = getHomeDefenseProfile(state)
  const score = homeDefenseScore(defense)
  const defensePct = Math.min(100, Math.round((score / 52) * 100))
  const size = houseGridSize(state)
  if (size <= 0) return 'No HQ · upgrade life home'
  const keys = slotKeysForGrid(size)
  const placed = keys.filter((k) => !!(state.housePlacements ?? {})[k]).length
  return `Defense ${defensePct}% · ${placed}/${keys.length} slots`
}

export function summaryTerritories(state: GameState): string {
  const owned = territoriesOwnedCount(state)
  const visible = visibleTerritoryDefs(state.territoriesOwned)
  const open = visible.filter((t) => !state.territoriesOwned[t.id]).length
  return `${owned} owned · ${open} available`
}

export function hasCapturableTerritory(state: GameState): boolean {
  return visibleTerritoryDefs(state.territoriesOwned).some(
    (t) =>
      !state.territoriesOwned[t.id] && state.power >= effectiveTerritoryPowerRequired(state, t),
  )
}
