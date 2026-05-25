/**
 * Visual-only caps for Pixi empire scene. Gameplay levels are uncapped; rendering stays bounded.
 */
export const VISUAL_UNITS_PER_RECRUIT_KIND = 12
export const VISUAL_BUILDINGS_PER_BUSINESS_KIND = 12
/** Hard ceiling on simultaneous recruit silhouettes (after per-kind caps + allocation). */
export const MAX_VISIBLE_RECRUIT_UNITS_TOTAL = 72
/** Hard ceiling on business building props in the street layer. */
export const MAX_VISIBLE_BUSINESS_BUILDINGS = 72
/** Ambient runners (non-owned) stay few. */
export const AMBIENT_RUNNERS_COUNT = 3
/** Mid-district filler buildings (background) — cap so density scales via glow, not count. */
export const MAX_MID_DISTRICT_BUILDINGS = 12
export const MAX_VEHICLES_CAP = 11
export const PARTICLE_COUNT_BASE = 40
export const PARTICLE_NEAR_COUNT_BASE = 28
