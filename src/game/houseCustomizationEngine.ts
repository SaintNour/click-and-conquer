import { houseItemById } from '../data/houseItems'
import { houseTierAtLevel } from '../data/lifeContent'
import type { GameState } from '../data/types'

const MAX_INCOME = 1.22
const MAX_POWER = 1.18
const MIN_HEAT = 0.82
const MIN_RIVAL = 0.78

export function houseGridSize(state: GameState): number {
  return houseTierAtLevel(state.houseLevel).gridSize
}

export function slotKeysForGrid(size: number): string[] {
  const keys: string[] = []
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      keys.push(`${r}-${c}`)
    }
  }
  return keys
}

function aggregate(state: GameState): {
  income: number
  power: number
  heat: number
  rival: number
} {
  const size = houseGridSize(state)
  if (size <= 0) {
    return { income: 1, power: 1, heat: 1, rival: 1 }
  }
  let income = 1
  let power = 1
  let heat = 1
  let rival = 1
  const placements = state.housePlacements ?? ({} as Record<string, string>)
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const key = `${r}-${c}`
      const itemId = placements[key]
      if (!itemId) continue
      const def = houseItemById(itemId)
      if (!def) continue
      const e = def.effect
      if (e.incomeMult) income *= e.incomeMult
      if (e.powerMult) power *= e.powerMult
      if (e.heatMitigation) heat *= e.heatMitigation
      if (e.rivalLossMitigation) rival *= e.rivalLossMitigation
    }
  }
  return {
    income: Math.min(MAX_INCOME, income),
    power: Math.min(MAX_POWER, power),
    heat: Math.max(MIN_HEAT, heat),
    rival: Math.max(MIN_RIVAL, rival),
  }
}

export function houseItemIncomeMult(state: GameState): number {
  return aggregate(state).income
}

export function houseItemPowerMult(state: GameState): number {
  return aggregate(state).power
}

/** Multiplies into life heat gain (lower = less heat). */
export function houseItemHeatMitigation(state: GameState): number {
  return aggregate(state).heat
}

/** Multiplies rival loss on failed defense. */
export function houseItemRivalLossMitigation(state: GameState): number {
  return aggregate(state).rival
}

/** Strip placements outside current grid (e.g. after load or downgrade). */
export function pruneHousePlacementsToGrid(state: GameState): GameState {
  const size = houseGridSize(state)
  if (size <= 0) {
    return { ...state, housePlacements: {} }
  }
  const next: Record<string, string> = {}
  const raw = state.housePlacements ?? {}
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const key = `${r}-${c}`
      const id = raw[key]
      if (id && houseItemById(id)) next[key] = id
    }
  }
  return { ...state, housePlacements: next }
}
