import { countTerritoriesOwned } from '../data/territories'
import type { GameState } from '../data/types'

/**
 * Cross-system synergy: territories amplify passive empire feel without stacking duplicate multipliers from life tier.
 */
export function territoryEmpireSynergyMoneyMult(state: GameState): number {
  const t = countTerritoriesOwned(state.territoriesOwned)
  return 1 + Math.min(0.12, Math.sqrt(Math.max(0, t)) * 0.022)
}

export function territoryEmpireSynergyPowerMult(state: GameState): number {
  const t = countTerritoriesOwned(state.territoriesOwned)
  return 1 + Math.min(0.1, Math.sqrt(Math.max(0, t)) * 0.018)
}
