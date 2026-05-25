export const SAVE_KEY = 'clicky-save-v1'
/** @deprecated Removed in v9 — empire scale no longer increases every tick from idle time. */
export const PASSIVE_SCALE_PER_TICK = 0.0042
/** @deprecated Removed in v9 — was paired with PASSIVE_SCALE_PER_TICK late-game tick drift. */
export const PASSIVE_SCALE_LATE_BONUS_PER_TICK = 0.0028
export const PASSIVE_SCALE_LATE_BOOST_AT = 2.02
export const PASSIVE_SCALE_LATE_TICKS = 2000
/** Global cap for combined empire scale (progression + event/rival layer). */
export const PASSIVE_SCALE_CAP = 2.45
export const EVENT_COOLDOWN_MIN = 8
export const EVENT_COOLDOWN_MAX = 22
/** Slightly longer gaps once the run is established (breathing room for decisions). */
export const EVENT_COOLDOWN_MID_MIN = 12
export const EVENT_COOLDOWN_MID_MAX = 26
export const MIDGAME_EVENT_TICK = 720
export const MIDGAME_TERRITORIES = 2
/** Early-session lift: fades out by tick count or after a few upgrades. */
export const EARLY_SESSION_TICK_MAX = 300
export const EARLY_SESSION_MAX_UNITS = 2
export const EARLY_CLICK_MONEY_MULT = 1.05
export const EARLY_CLICK_POWER_MULT = 1.04

/** ~0.1% chance per tick when off cooldown (subtle, rare). */
export const DANGER_ROLL_CHANCE = 0.001
/** Minimum ticks between danger ambience rolls. */
export const DANGER_COOLDOWN_TICKS = 75
