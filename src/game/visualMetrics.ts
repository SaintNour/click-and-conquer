import { BUSINESSES } from '../data/businesses'
import { RECRUITS } from '../data/recruits'
import type { GameState } from '../data/types'
import { territoriesOwnedCount } from './compute'
import { VISUAL_BUILDINGS_PER_BUSINESS_KIND, VISUAL_UNITS_PER_RECRUIT_KIND } from './visualCaps'

export { territoriesOwnedCount }

/** Sum of all business upgrade levels — drives background building count. */
export function sumBusinessLevels(state: GameState): number {
  return BUSINESSES.reduce((s, b) => s + (state.businessLevels[b.id] ?? 0), 0)
}

/** Sum of all recruit upgrade levels — drives background walker count. */
export function sumRecruitLevels(state: GameState): number {
  return RECRUITS.reduce((s, r) => s + (state.recruitLevels[r.id] ?? 0), 0)
}

/** 0–3 “street presence” tier from total power for subtle Pixi emphasis. */
export function powerPresenceTier(power: number): number {
  if (power >= 500) return 3
  if (power >= 150) return 2
  if (power >= 40) return 1
  return 0
}

/** Snapshot for Pixi empire — gameplay-derived, visual-only. */
export type EmpireSnapshot = {
  recruitLevels: Record<string, number>
  businessLevels: Record<string, number>
  powerTier: number
  territoryCount: number
  power: number
  /** Bucket 0+ for extra owned levels beyond per-row visual caps (glow / richness). */
  visualPressureBucket: number
  /** 0–3: first territory captures widen road feel; later stages add skyline depth instead. */
  roadSpreadStage: number
  /** Background richness after road cap (parallax / lights). */
  cityDepthTier: number
}

/** Compact sorted fingerprint — avoids JSON.stringify of sparse objects each tick. */
export function levelsFingerprint(levels: Record<string, number>, ids: readonly string[]): string {
  const parts: string[] = []
  for (const id of ids) {
    const n = levels[id] ?? 0
    if (n > 0) parts.push(`${id}:${n}`)
  }
  return parts.join(',')
}

/** Extra progression beyond visible unit caps — drives glow / environment without more nodes. */
export function visualPressureBucketFromState(state: GameState): number {
  let over = 0
  for (const r of RECRUITS) {
    const lv = state.recruitLevels[r.id] ?? 0
    over += Math.max(0, lv - VISUAL_UNITS_PER_RECRUIT_KIND)
  }
  for (const b of BUSINESSES) {
    const lv = state.businessLevels[b.id] ?? 0
    over += Math.max(0, lv - VISUAL_BUILDINGS_PER_BUSINESS_KIND)
  }
  return Math.min(24, Math.floor(over / 8))
}

export function empireSnapshotFromState(state: GameState): EmpireSnapshot {
  const tc = territoriesOwnedCount(state)
  return {
    recruitLevels: { ...state.recruitLevels },
    businessLevels: { ...state.businessLevels },
    powerTier: powerPresenceTier(state.power),
    territoryCount: tc,
    power: state.power,
    visualPressureBucket: visualPressureBucketFromState(state),
    roadSpreadStage: Math.min(3, tc),
    cityDepthTier: Math.min(12, Math.max(0, tc - 3)),
  }
}

/** Stable key for React deps + Pixi rebuilds (no full JSON of level maps). */
export function empireVisualRebuildKey(state: GameState): string {
  const s = empireSnapshotFromState(state)
  return empireSnapshotKey(s, 0, 0)
}

export function empireSnapshotKey(s: EmpireSnapshot, w: number, h: number): string {
  return [
    levelsFingerprint(
      s.recruitLevels,
      RECRUITS.map((r) => r.id),
    ),
    levelsFingerprint(
      s.businessLevels,
      BUSINESSES.map((b) => b.id),
    ),
    s.powerTier,
    s.territoryCount,
    s.visualPressureBucket,
    s.roadSpreadStage,
    s.cityDepthTier,
    Math.round(w),
    Math.round(h),
  ].join('|')
}
