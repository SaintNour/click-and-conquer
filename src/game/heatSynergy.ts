import { HEAT_CAP } from './balanceConfig'

/**
 * Risk/reward: higher heat slightly boosts income (attention = opportunity),
 * capped so crackdown / rivals remain the real downside.
 */
export function heatIncomeBonusMultiplier(heat: number): number {
  const h = Math.max(0, Math.min(1, heat / HEAT_CAP))
  if (h < 0.28) return 1
  if (h < 0.55) return 1 + (h - 0.28) * 0.028
  if (h < 0.82) return 1.0076 + (h - 0.55) * 0.045
  return 1.02 + (h - 0.82) * 0.08
}

/** Slight inefficiency at high heat before crackdown — crew feels the pressure. */
export function heatRecruitPowerEfficiency(heat: number): number {
  const h = Math.max(0, Math.min(1, heat / HEAT_CAP))
  if (h < 0.5) return 1
  return Math.max(0.94, 1 - (h - 0.5) * 0.1)
}
