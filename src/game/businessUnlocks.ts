import { businessById, BUSINESSES } from '../data/businesses'
import { getTerritoryDefinition } from '../data/territories'
import type { BusinessDef } from '../data/types'
import type { GameState } from '../data/types'

/** Starter / always-available businesses (no territory gate). */
export function isBusinessUnlocked(state: GameState, businessId: string): boolean {
  const b = businessById(businessId)
  if (!b) return false
  if (!b.unlockTerritoryId) return true
  if ((state.businessLevels[businessId] ?? 0) > 0) return true
  return !!state.territoriesOwned[b.unlockTerritoryId]
}

/** Businesses first gated by owning this territory (for territory card previews). */
export function businessesUnlockedByTerritory(territoryId: string): BusinessDef[] {
  return BUSINESSES.filter((b) => b.unlockTerritoryId === territoryId)
}

export function businessUnlockRequirementLabel(b: BusinessDef): string | null {
  if (!b.unlockTerritoryId) return null
  const t = getTerritoryDefinition(b.unlockTerritoryId)
  if (!t) return 'Requires territory control'
  return `Unlocked by ${t.name}`
}
