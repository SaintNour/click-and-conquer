import { houseItemById } from '../data/houseItems'
import { houseTierAtLevel } from '../data/lifeContent'
import type { RandomEventDef } from '../data/types'
import type { GameState } from '../data/types'
import type { EventOutcomeBundle } from '../data/types'
import { houseGridSize } from './houseCustomizationEngine'

export type HomeDefenseProfile = {
  security: number
  detection: number
  intimidation: number
  durability: number
}

function addProfile(a: HomeDefenseProfile, b: Partial<HomeDefenseProfile>): HomeDefenseProfile {
  return {
    security: a.security + (b.security ?? 0),
    detection: a.detection + (b.detection ?? 0),
    intimidation: a.intimidation + (b.intimidation ?? 0),
    durability: a.durability + (b.durability ?? 0),
  }
}

/** Baseline defense from house tier only (no placed items). Exported for UI deltas. */
export function tierDefenseFromHouseLevel(level: number): HomeDefenseProfile {
  const t = houseTierAtLevel(level)
  if (t.gridSize <= 0) {
    return { security: 0, detection: 0, intimidation: 0, durability: 0 }
  }
  const s = t.security
  return {
    security: Math.round(s * 0.34),
    detection: Math.round(s * 0.26),
    intimidation: Math.round(s * 0.2),
    durability: Math.round(s * 0.2),
  }
}

/** Aggregate tier + placed HQ items for modular defense stats. */
export function getHomeDefenseProfile(state: GameState): HomeDefenseProfile {
  let p = tierDefenseFromHouseLevel(state.houseLevel)
  const size = houseGridSize(state)
  if (size <= 0) return p
  const placements = state.housePlacements ?? {}
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const id = placements[`${r}-${c}`]
      if (!id) continue
      const def = houseItemById(id)
      const d = def?.effect.defense
      if (d) p = addProfile(p, d)
    }
  }
  return p
}

export function homeDefenseScore(profile: HomeDefenseProfile): number {
  return (profile.security + profile.detection + profile.intimidation + profile.durability) / 4
}

/** Rival pressure vs HQ + optional player power — adjusts stochastic success chance. */
export function adjustedHomeDefenseChance(
  state: GameState,
  event: RandomEventDef,
  baseChance: number,
): number {
  const pressure = event.homePressure ?? 30
  const score = homeDefenseScore(getHomeDefenseProfile(state))
  const powerBonus = Math.min(0.055, (state.power / 14000) * 0.055)
  const delta = (score - pressure) * 0.0055 + powerBonus
  return Math.max(0.13, Math.min(0.88, baseChance + delta))
}

export type HomeFailureSeverity = 'major' | 'partial'

/** Soften money/power losses on failed home defense when stats are strong. */
export function softenHomeFailureBundle(
  state: GameState,
  event: RandomEventDef,
  bundle: EventOutcomeBundle,
): { bundle: EventOutcomeBundle; severity: HomeFailureSeverity } {
  const score = homeDefenseScore(getHomeDefenseProfile(state))
  const pressure = event.homePressure ?? 30
  const ratio = Math.max(0.38, Math.min(1, 0.52 + (score - pressure) * 0.012))
  let next: EventOutcomeBundle = { ...bundle }
  if (next.moneyDelta !== undefined && next.moneyDelta < 0) {
    next = { ...next, moneyDelta: Math.floor(next.moneyDelta * ratio) }
  }
  if (next.powerDelta !== undefined && next.powerDelta < 0) {
    next = { ...next, powerDelta: Math.floor(next.powerDelta * ratio) }
  }
  const severity: HomeFailureSeverity = ratio >= 0.72 ? 'partial' : 'major'
  return { bundle: next, severity }
}

export type PlacedDefenseItem = { name: string; points: number }

/** Placed HQ items ranked by total defense contribution (sum of four stats). */
export function placedDefenseItemsRanked(state: GameState): PlacedDefenseItem[] {
  const size = houseGridSize(state)
  if (size <= 0) return []
  const placements = state.housePlacements ?? {}
  const list: PlacedDefenseItem[] = []
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const id = placements[`${r}-${c}`]
      if (!id) continue
      const def = houseItemById(id)
      const d = def?.effect.defense
      if (!def || !d) continue
      const points =
        (d.security ?? 0) + (d.detection ?? 0) + (d.intimidation ?? 0) + (d.durability ?? 0)
      if (points <= 0) continue
      list.push({ name: def.name, points })
    }
  }
  list.sort((a, b) => b.points - a.points)
  return list
}

/**
 * Short line for outcome banner: credit HQ / items on full defense or partial mitigation.
 * Uses {{rival}} for interpolation when relevant.
 */
export function describeHomeDefenseHighlight(
  state: GameState,
  tier: 'full' | 'partial',
): string | null {
  if (houseGridSize(state) <= 0) return null

  const ranked = placedDefenseItemsRanked(state)
  const itemPts = ranked.reduce((s, x) => s + x.points, 0)

  if (tier === 'full') {
    if (ranked.length >= 2 && ranked[0]!.points >= 5 && ranked[1]!.points >= 4) {
      return `${ranked[0]!.name} and ${ranked[1]!.name} earned this—their stats were on the roll.`
    }
    if (ranked.length >= 1 && ranked[0]!.points >= 6) {
      return `${ranked[0]!.name} did the heavy lifting. Your HQ wasn’t decoration tonight.`
    }
    if (itemPts >= 10) {
      const names = ranked
        .slice(0, 3)
        .map((x) => x.name)
        .join(' · ')
      return `Your grid pulled weight (${names})—that defense score mattered.`
    }
    if (itemPts >= 4) {
      return `Placed gear nudged the odds—${ranked[0]!.name} showed up when it counted.`
    }
    return `Your address and tier carried the roll—next décor upgrade makes {{rival}} work harder for the same disrespect.`
  }

  if (ranked.length >= 1 && itemPts >= 6) {
    return `Your HQ kit shaved the worst off the failure—${ranked[0]!.name} still paid rent.`
  }
  if (itemPts >= 3) {
    return `Baseline walls and what you placed kept this from going full catastrophe.`
  }
  return `Your defense profile blunted the hit—without it, {{rival}} walks away louder.`
}
