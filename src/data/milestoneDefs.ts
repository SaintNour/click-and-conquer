/**
 * Data-driven row-level milestones for businesses and crew (long-tail scaling).
 * Multipliers stack multiplicatively in `milestoneScaling.ts`.
 */
export const ROW_LEVEL_MILESTONE_BREAKPOINTS = [10, 25, 50, 100] as const

/** Per-breakpoint multipliers (same order as ROW_LEVEL_MILESTONE_BREAKPOINTS). */
export const ROW_LEVEL_MILESTONE_MULTS = [1.022, 1.028, 1.035, 1.045] as const
