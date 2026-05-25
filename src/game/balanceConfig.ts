/**
 * DEV / TUNING — Central economy & pacing knobs
 * ==============================================
 * Adjust multipliers here rather than scattering magic numbers.
 *
 * Content counts (after expansion): see `CONTENT_COUNTS` at bottom of `territories.ts`,
 * `recruits.ts`, `businesses.ts` header comments, and `shopVisibility.ts` for shop chains.
 */

/** New runs and full reset: start broke to force early hustle. */
export const INITIAL_MONEY = 0
export const INITIAL_POWER = 0

/** Global multiplier on recruit & business upgradeCost (applied in pricing.ts). Long-form pacing. */
export const SHOP_COST_MULT = 3.12

/**
 * Per successive Attack / Defend in the same gang war (same curve shape as recruit upgrades:
 * `base * mult^uses`, see `pricing.upgradeCost`).
 */
export const WAR_ACTION_ESCALATION_MULT = 1.16

// —— Offline catch-up (applied on load from local save) ——
/** Max real-time seconds credited when returning after closing the tab. */
export const OFFLINE_INCOME_SECONDS_CAP = 8 * 60 * 60
/** Fraction of live passive rates applied offline (anti-inflation vs active play). */
export const OFFLINE_INCOME_EFFICIENCY = 0.78
/** Show “while you were away” if at least this much money was credited. */
export const OFFLINE_REPORT_MIN_MONEY = 40
export const OFFLINE_REPORT_MIN_POWER = 4

// —— Partner neglect & grief ——
/** Ticks without date/gift before affection/happiness decay. */
export const LIFE_NEGLECT_GRACE_TICKS = 150
/** Every N ticks while neglected, apply decay. */
export const LIFE_NEGLECT_DECAY_INTERVAL = 40
export const LIFE_NEGLECT_AFFECTION_DELTA = -2
export const LIFE_NEGLECT_HAPPINESS_DELTA = -2
/** Break-up grief: −25% money & power for this many ticks (~3 min at 1/s). */
export const LIFE_GRIEF_DURATION_TICKS = 180
export const LIFE_GRIEF_INCOME_POWER_MULT = 0.75

// —— Street luck (golden-cookie style cash surges) ——
export const STREET_LUCK_MIN_UNITS = 8
export const STREET_LUCK_BASE_CHANCE = 0.00115
export const STREET_LUCK_UNITS_SCALE = 95_000
export const STREET_LUCK_BONUS_CHANCE_CAP = 0.00185
export const STREET_LUCK_DURATION_MIN = 38
export const STREET_LUCK_DURATION_RANGE = 58

// —— Auto-hustle (cursor-like; scales from crew depth) ——
export const AUTO_HUSTLE_MIN_RECRUIT_LEVELS = 4
export const AUTO_HUSTLE_PER_SQRT_CREW = 0.062
export const AUTO_HUSTLE_CAP = 4.25

/** Multiplier on empire shop upgrade $ costs (applied in shopUpgradeEngine / purchase checks). */
export const EMPIRE_UPGRADE_COST_MULT = 2.05

/** First solo prestige: minimum run time (~20h at 1 tick/s) plus empire traction. */
export const PRESTIGE_SOLO_MIN_TICKS = 72_000
/** Family prestige: slightly lower time gate (heir path), still long-form. */
export const PRESTIGE_FAMILY_MIN_TICKS = 64_800

/**
 * Life events — longer gaps so they feel occasional, not constant.
 * Post-resolve adds `LIFE_EVENT_RESOLVE_BUFFER_*` on top (see `lifePostResolveDelaySeconds` in lifeEngine).
 */
export const LIFE_EVENT_COOLDOWN_MIN_SEC = 52
export const LIFE_EVENT_COOLDOWN_MAX_SEC = 140

/** Extra seconds after resolving a life event before the timer starts again. */
export const LIFE_EVENT_RESOLVE_BUFFER_MIN_SEC = 18
export const LIFE_EVENT_RESOLVE_BUFFER_MAX_SEC = 42

/** After resolving any life event, wait this many seconds before the life timer resumes. */
export function nextLifeEventCooldownSeconds(): number {
  const a = LIFE_EVENT_COOLDOWN_MIN_SEC
  const b = LIFE_EVENT_COOLDOWN_MAX_SEC
  return a + Math.floor(Math.random() * (b - a + 1))
}

/** If a minor life is already on screen and another minor would fire, defer the timer (no stacking). */
export const LIFE_EVENT_MINOR_STACK_DEFER_MIN_SEC = 14
export const LIFE_EVENT_MINOR_STACK_DEFER_MAX_SEC = 36

export function lifeEventMinorStackDeferSeconds(): number {
  const a = LIFE_EVENT_MINOR_STACK_DEFER_MIN_SEC
  const b = LIFE_EVENT_MINOR_STACK_DEFER_MAX_SEC
  return a + Math.floor(Math.random() * (b - a + 1))
}

/** Full gap after a life event = next roll + resolve buffer (anti back-to-back spam). */
export function lifeEventFullCooldownAfterResolveSeconds(): number {
  const buf =
    LIFE_EVENT_RESOLVE_BUFFER_MIN_SEC +
    Math.floor(
      Math.random() * (LIFE_EVENT_RESOLVE_BUFFER_MAX_SEC - LIFE_EVENT_RESOLVE_BUFFER_MIN_SEC + 1),
    )
  return nextLifeEventCooldownSeconds() + buf
}

/** Late game: optional slight tightening of life event gaps (still within min/max). */
export function lifeEventCooldownSecondsForState(
  tickCount: number,
  territoriesOwned: number,
): number {
  const base = lifeEventFullCooldownAfterResolveSeconds()
  if (tickCount < 3600 || territoriesOwned < 4) return base
  return Math.max(
    LIFE_EVENT_COOLDOWN_MIN_SEC + LIFE_EVENT_RESOLVE_BUFFER_MIN_SEC,
    base - Math.floor(Math.random() * 10),
  )
}

// —— Heat max (police pressure) ——
export const HEAT_CAP = 100

/** Passive heat bleed per tick (1 tick ≈ 1 s) while you are still “active” (recent manual hustle). */
export const HEAT_DECAY_PER_TICK = 0.12

/**
 * After this many ticks without a manual hustle click, heat uses `HEAT_IDLE_FAST_DECAY_PER_TICK`
 * instead of `HEAT_DECAY_PER_TICK` (stops heat from sitting at 100% between bursts).
 */
export const HEAT_IDLE_GRACE_TICKS = 2

/** Heat points lost per tick when idle past the grace window (0–100 scale). */
export const HEAT_IDLE_FAST_DECAY_PER_TICK = 4

/** After crackdown, heat resets to this (0–100). */
export const HEAT_RESET_AFTER_TRIGGER = 48

/** Seconds (ticks) heat stays pegged at 100% before a random penalty fires (1 tick ≈ 1 s). */
export const HEAT_CAP_GRACE_TICKS = 60

/** Lose this fraction of current cash (random between min and max). */
export const HEAT_CRACKDOWN_MONEY_LOSS_MIN = 0.1
export const HEAT_CRACKDOWN_MONEY_LOSS_MAX = 0.2

/** Flat power loss range on crackdown. */
export const HEAT_CRACKDOWN_POWER_LOSS_MIN = 8
export const HEAT_CRACKDOWN_POWER_LOSS_MAX = 22

/** Income multiplier while debuff active (0.6 = −40% income). */
export const HEAT_CRACKDOWN_INCOME_MULT = 0.68

/** Debuff duration in ticks (seconds) after max-heat crackdown resolves — full minute of pressure. */
export const HEAT_DEBUFF_DURATION_MIN_TICKS = 60
export const HEAT_DEBUFF_DURATION_MAX_TICKS = 60

/** Extra bite on crackdown cash % loss at max wealth pressure (see economyWealthPressure01). */
export const HEAT_CRACKDOWN_WEALTH_MONEY_STRESS = 0.55
/** Scale flat power loss from max heat by wealth (multiplier at max pressure). */
export const HEAT_CRACKDOWN_WEALTH_POWER_STRESS = 1.75
/** How much wealth pressure tightens crackdown income mult (0–1 pressure → up to this much extra tax). */
export const HEAT_CRACKDOWN_INCOME_WEALTH_PINCH = 0.26

/** Multiplier on rival attack probability during crackdown debuff. */
export const HEAT_RIVAL_ATTACK_MULT_DURING_CRACKDOWN = 1.55

/** Alias — extra rival pressure during crackdown (same as `HEAT_RIVAL_ATTACK_MULT_DURING_CRACKDOWN`). */
export const HEAT_RIVAL_BOOST = HEAT_RIVAL_ATTACK_MULT_DURING_CRACKDOWN

/** Alias — fraction of income lost while debuffed (e.g. 0.32 ≈ −32%; derived from `HEAT_CRACKDOWN_INCOME_MULT`). */
export const HEAT_INCOME_PENALTY = 1 - HEAT_CRACKDOWN_INCOME_MULT

/** Alias — money loss range on crackdown (fraction of current cash). */
export const HEAT_MONEY_LOSS_PERCENT_MIN = HEAT_CRACKDOWN_MONEY_LOSS_MIN
export const HEAT_MONEY_LOSS_PERCENT_MAX = HEAT_CRACKDOWN_MONEY_LOSS_MAX

/** Alias — flat power loss range (same ticks as seconds in this game). */
export const HEAT_POWER_LOSS_MIN = HEAT_CRACKDOWN_POWER_LOSS_MIN
export const HEAT_POWER_LOSS_MAX = HEAT_CRACKDOWN_POWER_LOSS_MAX

/** Alias — debuff duration (1 tick = 1 s in `useGame`). */
export const HEAT_DEBUFF_DURATION_MIN_SEC = HEAT_DEBUFF_DURATION_MIN_TICKS
export const HEAT_DEBUFF_DURATION_MAX_SEC = HEAT_DEBUFF_DURATION_MAX_TICKS

/** Play warning SFX when heat crosses this fraction of HEAT_CAP (e.g. 0.82). */
export const HEAT_WARNING_THRESHOLD = 0.82

/** Heat must fall below this fraction before another warning can fire. */
export const HEAT_WARNING_LATCH_CLEAR = 0.58

/** Launder heat: spend cash to drop attention (cooldown in ticks ≈ seconds). */
export const HEAT_LAUNDER_COOLDOWN_TICKS = 260
export const HEAT_LAUNDER_MIN_COST = 650
export const HEAT_LAUNDER_MAX_COST = 220_000
export const HEAT_LAUNDER_WEALTH_FRAC = 0.0038
export const HEAT_LAUNDER_DROP_BASE = 11
export const HEAT_LAUNDER_DROP_PER_HEAT = 0.085
export const HEAT_LAUNDER_MIN_HEAT = 12

// —— Life event progression tiers (by current money) ——
/** Upper bounds for tiers: tier = 1 + index where money < threshold; last tier if above all. */
export const LIFE_PROGRESS_MONEY_THRESHOLDS = [220, 2800, 52000, 850_000] as const

export function getLifeEventTier(state: { money: number }): 1 | 2 | 3 | 4 | 5 {
  const m = state.money
  const t = LIFE_PROGRESS_MONEY_THRESHOLDS
  if (m < t[0]) return 1
  if (m < t[1]) return 2
  if (m < t[2]) return 3
  if (m < t[3]) return 4
  return 5
}

/** Rival modal: defend/scare — base floor before scaling (was 14). */
export const RIVAL_DEFEND_POWER_FLOOR = 200

/** Extra scaling: defendCost ≈ max(RIVAL_DEFEND_POWER_FLOOR, rivalPower*0.42 + threat*0.12 + heat*0.5) */
export const RIVAL_DEFEND_RIVAL_COEF = 0.42
export const RIVAL_DEFEND_THREAT_COEF = 0.12
export const RIVAL_DEFEND_HEAT_COEF = 0.5

/** Power spent on successful defend (fraction of displayed defend cost). */
export const RIVAL_DEFEND_SPEND_FRACTION = 0.22

/** Territory attempt fail: % of current power lost (min floor handled in logic). */
export const TERRITORY_FAIL_POWER_FRAC = 0.08
export const TERRITORY_FAIL_POWER_MIN = 14

/** Recruit chain: row i unlocks when row i-1 reaches this level (length = recruits - 1). */
export const RECRUIT_UNLOCK_AT_PREV_LEVEL = [18, 42, 72, 110, 165, 240, 320] as const

/** Business chain (territory-gated businesses still need turf); this is *extra* level gates on prior row. */
export const BUSINESS_UNLOCK_AT_PREV_LEVEL = [16, 40, 70, 105, 155, 220, 300, 400, 520] as const

// —— Life / relationship costs (long-form economy) ——
/** Floor costs for social actions; actual spend uses max(floor, wealth %, passive slice). */
export const DATE_COST = 820
export const GIFT_COST = 2400
export const MARRIAGE_COST = 125_000
export const DATE_COST_WEALTH_FRAC = 0.0011
export const DATE_COST_CAP = 480_000
export const DATE_COST_PASSIVE_SECONDS = 22
export const GIFT_COST_WEALTH_FRAC = 0.002
export const GIFT_COST_CAP = 1_100_000
export const GIFT_COST_PASSIVE_SECONDS = 28
export const MARRIAGE_COST_WEALTH_FRAC = 0.052
export const MARRIAGE_COST_CAP = 18_000_000
export const MARRIAGE_COST_PASSIVE_SECONDS = 55
