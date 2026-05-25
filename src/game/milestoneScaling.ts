import { ROW_LEVEL_MILESTONE_BREAKPOINTS, ROW_LEVEL_MILESTONE_MULTS } from '../data/milestoneDefs'

/**
 * Per-row milestone multipliers (10 / 25 / 50 / 100). Stacks multiplicatively.
 * Applied to business income and recruit power in shopUpgradeEngine.
 */
export function rowLevelMilestoneMult(level: number): number {
  let m = 1
  for (let i = 0; i < ROW_LEVEL_MILESTONE_BREAKPOINTS.length; i++) {
    if (level >= ROW_LEVEL_MILESTONE_BREAKPOINTS[i]!) {
      m *= ROW_LEVEL_MILESTONE_MULTS[i]!
    }
  }
  return m
}
