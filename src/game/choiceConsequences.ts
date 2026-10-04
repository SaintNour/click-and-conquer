import type {
  EventChoiceDef,
  EventOutcomeBundle,
  GameState,
  ScaledResourceDelta,
} from '../data/types'

/**
 * Choice consequences — two layers that make decisions matter beyond the click:
 *
 * 1. Scaled deltas: money/power outcomes sized to the player's current stockpile
 *    (early floor, late cap) so flat $300 rewards don't trivialize the economy.
 * 2. Branch flags: persistent `lifeBranchFlags` writes from choices/outcomes —
 *    gates for delayed follow-up events and trait multipliers (see branchTraits.ts).
 */

export function resolveScaledDelta(current: number, d: ScaledResourceDelta): number {
  const raw = current * d.fraction
  const mag = Math.min(d.cap, Math.max(d.floor, Math.abs(raw)))
  return Math.round(Math.sign(raw) * mag)
}

/** Choice-level money delta: flat `moneyDelta` wins; otherwise resolve `scaledMoneyDelta`. */
export function effectiveChoiceMoneyDelta(
  state: GameState,
  c: EventChoiceDef,
): number | undefined {
  if (c.moneyDelta !== undefined) return c.moneyDelta
  if (c.scaledMoneyDelta) return resolveScaledDelta(state.money, c.scaledMoneyDelta)
  return undefined
}

export function effectiveChoicePowerDelta(
  state: GameState,
  c: EventChoiceDef,
): number | undefined {
  if (c.powerDelta !== undefined) return c.powerDelta
  if (c.scaledPowerDelta) return resolveScaledDelta(state.power, c.scaledPowerDelta)
  return undefined
}

/** Resolve scaled deltas inside an outcome bundle into flat deltas (economy-sized at pick time). */
export function resolveOutcomeBundleDeltas(
  state: GameState,
  bundle: EventOutcomeBundle,
): EventOutcomeBundle {
  let b = bundle
  if (b.moneyDelta === undefined && b.scaledMoneyDelta) {
    b = { ...b, moneyDelta: resolveScaledDelta(state.money, b.scaledMoneyDelta) }
  }
  if (b.powerDelta === undefined && b.scaledPowerDelta) {
    b = { ...b, powerDelta: resolveScaledDelta(state.power, b.scaledPowerDelta) }
  }
  return b
}

/** Merge set/clear flag lists into lifeBranchFlags (idempotent, returns same state on no-op). */
export function applyBranchFlags(
  state: GameState,
  set: readonly string[] | undefined,
  clear: readonly string[] | undefined,
): GameState {
  if ((!set || set.length === 0) && (!clear || clear.length === 0)) return state
  const flags = { ...(state.lifeBranchFlags ?? {}) }
  for (const k of set ?? []) flags[k] = true
  for (const k of clear ?? []) delete flags[k]
  return { ...state, lifeBranchFlags: flags }
}
