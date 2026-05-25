import type { GameState } from '../data/types'
import type {
  PendingRivalEncounter,
  RivalArchetype,
  RivalRelationship,
  RivalState,
} from '../data/rivalTypes'
import { passiveMoneyPerSecond, totalPowerFromRecruits } from './compute'
import { houseItemRivalLossMitigation } from './houseCustomizationEngine'
import { lifeHeatGainMultiplier } from './lifeEngine'
import { setNarratorFromKey } from './narrator'
import {
  HEAT_CAP,
  HEAT_CAP_GRACE_TICKS,
  HEAT_DECAY_PER_TICK,
  HEAT_IDLE_FAST_DECAY_PER_TICK,
  HEAT_IDLE_GRACE_TICKS,
  HEAT_WARNING_LATCH_CLEAR,
  HEAT_WARNING_THRESHOLD,
  RIVAL_DEFEND_HEAT_COEF,
  RIVAL_DEFEND_POWER_FLOOR,
  RIVAL_DEFEND_RIVAL_COEF,
  RIVAL_DEFEND_SPEND_FRACTION,
  RIVAL_DEFEND_THREAT_COEF,
} from './balanceConfig'
import {
  applyRandomHeatMaxPenalty,
  clearExpiredHeatCrackdown,
  isHeatCrackdownActive,
  isHeatGracePeriod,
} from './heatCrackdownEngine'
import { isGameplayModalBlocking, stashActiveMinorLifeForBlocking } from './lifeEventFlow'
import { inferWarDifficulty, RIVAL_WAR_POWER_HP_MAX } from './rivalWarEngine'
import {
  STATIC_TIER_BRACKETS,
  TIER_COUNT,
  TERRITORIES_PER_TIER,
  rivalDefenseFloorFromTerritory,
} from './tierEngine'

const RIVALS_PER_TIER = 3
export const RIVAL_COUNT = TIER_COUNT * RIVALS_PER_TIER

/** Medium “skirmish” modal: win/lose stakes are a flat skim of current stash (not old %-of-everything swings). */
const SKIRMISH_MONEY_FRAC = 0.05
const SKIRMISH_POWER_FRAC = 0.05

const ARCHETYPES: RivalArchetype[] = ['aggressive', 'greedy', 'strategic', 'reckless', 'defensive']
const COLOR_TAGS = [
  '#c45c68',
  '#8b5cf6',
  '#d97706',
  '#22c55e',
  '#64748b',
  '#0ea5e9',
  '#f43f5e',
  '#a16207',
  '#10b981',
  '#7c3aed',
  '#ef4444',
  '#f59e0b',
  '#06b6d4',
  '#84cc16',
  '#e11d48',
]

/** Starting value for the relationship sub-bar (0–100). 100 = full bar — one nudge can escalate tier. */
export const RELATIONSHIP_POINTS_START = 100

const HEAT_FROM_TERRITORY_CAPTURE = 4
const HEAT_CAP_FROM_PASSIVE_PER_TICK = 0.16

const RIVAL_CHECK_MIN = 20
const RIVAL_CHECK_MAX = 44
const RIVAL_COOLDOWN_AFTER_ENCOUNTER = 38
const RIVAL_AMBIENT_COOLDOWN_TICKS = 55

const RIVAL_INCOME_MULT_CAP = 1.12
const RIVAL_INCOME_MULT_PER_REVENGE = 1.008

const FIRST_NAMES = [
  'Vex',
  'Nico',
  'Kade',
  'Rook',
  'Sable',
  'Juno',
  'Orin',
  'Mara',
  'Dante',
  'Iris',
  'Cairo',
  'Zara',
  'Silas',
  'Remy',
  'Lux',
]

const EPITHETS = [
  'Harbor',
  'Iron',
  'Redline',
  'Ghost',
  'Crown',
  'Serpent',
  'Raven',
  'Ash',
  'Grim',
  'Kings',
  'North',
  'Low',
  'East',
  'Gate',
]

const SUFFIXES = [
  'Syndicate',
  'Crew',
  'Cartel',
  'Family',
  'Collective',
  'Ring',
  'Line',
  'Union',
  'Brotherhood',
  'Syndicate',
]

function randPick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]!
}

export function generateRivalName(): string {
  return `${randPick(FIRST_NAMES)} ${randPick(EPITHETS)} ${randPick(SUFFIXES)}`
}

const LEADER_FIRST_NAMES = [
  'Marcus',
  'Sofia',
  'Diego',
  'Maya',
  'Kenji',
  'Yusuf',
  'Elena',
  'Theo',
  'Anya',
  'Rafael',
  'Naomi',
  'Lev',
  'Iman',
  'Vera',
  'Hassan',
]

const LEADER_LAST_NAMES = [
  'Castellanos',
  'Okafor',
  'Volkov',
  'Reyes',
  'Bianchi',
  'Petrov',
  'Mensah',
  'Nakamura',
  'Lazaro',
  'Khoury',
  'Solano',
  'Vasquez',
  'Greco',
  'Tanaka',
  'Marin',
]

export function generateLeaderName(): string {
  return `${randPick(LEADER_FIRST_NAMES)} ${randPick(LEADER_LAST_NAMES)}`
}

function relRank(rel: RivalRelationship): number {
  switch (rel) {
    case 'neutral':
      return 0
    case 'rival':
      return 1
    case 'enemy':
      return 2
    case 'nemesis':
      return 3
  }
}

export function escalateRelationship(rel: RivalRelationship): RivalRelationship {
  if (rel === 'neutral') return 'rival'
  if (rel === 'rival') return 'enemy'
  return 'nemesis'
}

export function deescalateRelationship(rel: RivalRelationship): RivalRelationship {
  if (rel === 'nemesis') return 'enemy'
  if (rel === 'enemy') return 'rival'
  if (rel === 'rival') return 'neutral'
  return 'neutral'
}

/**
 * Adjust a rival's `relationshipPoints` (0–100 sub-bar inside the current tier).
 * Crossing 100 escalates the tier and resets points to 30 (just into the next bucket).
 * Crossing 0 de-escalates the tier and resets points to 70 (just inside the lower bucket).
 *
 * `delta` is positive when the relationship gets WORSE (closer to nemesis) and
 * negative when it gets BETTER (closer to neutral). This matches the existing
 * `escalateRelationship` semantics so the sub-bar fills toward conflict.
 */
export function bumpRelationshipPoints(
  state: GameState,
  rivalId: string,
  delta: number,
): GameState {
  const r = state.rivals[rivalId]
  if (!r) return state
  let rel = r.relationship
  let pts = (r.relationshipPoints ?? RELATIONSHIP_POINTS_START) + delta
  // Escalate while we keep crossing 100.
  while (pts >= 100 && rel !== 'nemesis') {
    rel = escalateRelationship(rel)
    pts = pts - 100 + 30
  }
  // De-escalate while we keep crossing 0.
  while (pts <= 0 && rel !== 'neutral') {
    rel = deescalateRelationship(rel)
    pts = pts + 70
  }
  if (rel === 'nemesis') pts = Math.min(100, pts)
  if (rel === 'neutral') pts = Math.max(0, pts)
  return {
    ...state,
    rivals: {
      ...state.rivals,
      [rivalId]: { ...r, relationship: rel, relationshipPoints: Math.max(0, Math.min(100, pts)) },
    },
  }
}

/** True when the rival meets all conditions for a Big-War (elimination) trigger. */
export function isRivalEliminationEligible(state: GameState, rivalId: string): boolean {
  const r = state.rivals[rivalId]
  if (!r || r.alive === false) return false
  if (r.relationship !== 'nemesis') return false
  if ((r.relationshipPoints ?? RELATIONSHIP_POINTS_START) > 25) return false
  // Must own no territories.
  for (const tid of Object.keys(state.territoryOwner ?? {})) {
    if (state.territoryOwner[tid] === rivalId) return false
  }
  return true
}

export function playerThreatScore(state: GameState): number {
  const p = state.power + totalPowerFromRecruits(state) * 1.5
  const m = Math.sqrt(Math.max(0, state.money))
  return Math.max(8, p + m * 0.08)
}

function seedRivals(state: GameState): Record<string, RivalState> {
  const baseThreat = playerThreatScore(state)
  const out: Record<string, RivalState> = {}
  let colorIdx = 0
  for (const bracket of STATIC_TIER_BRACKETS) {
    const tierMid = (bracket.min + bracket.max) / 2
    for (let k = 0; k < RIVALS_PER_TIER; k++) {
      const id = `rival_t${bracket.tier}_${k + 1}`
      // Power scales to this tier's territory requirements so the fight stays in-tier.
      const powerLevel = Math.round(
        tierMid * (0.4 + Math.random() * 0.45) + 30 + Math.random() * 80,
      )
      const archetype = ARCHETYPES[(bracket.tier * 3 + k) % ARCHETYPES.length]!
      const wealth = Math.round(
        bracket.min * (0.04 + Math.random() * 0.08) + 600 + Math.random() * 1800,
      )
      const skeleton: RivalState = {
        id,
        name: generateRivalName(),
        leaderName: generateLeaderName(),
        powerLevel,
        aggression: 0.25 + Math.random() * 0.65,
        territoryCount: 0,
        relationship: 'neutral',
        archetype,
        wealth,
        territoryPressure: Math.floor(Math.random() * 22),
        alive: true,
        colorTag: COLOR_TAGS[colorIdx % COLOR_TAGS.length]!,
        warHp: 100,
        warMaxHp: 100,
        warDifficulty: 'normal',
        warPowerHp: RIVAL_WAR_POWER_HP_MAX,
        warPowerHpMax: RIVAL_WAR_POWER_HP_MAX,
        tier: bracket.tier,
        relationshipPoints: RELATIONSHIP_POINTS_START,
      }
      const warDifficulty = inferWarDifficulty(skeleton, baseThreat)
      out[id] = { ...skeleton, warDifficulty }
      colorIdx++
    }
  }
  return out
}

/**
 * Assign rivals to all un-owned territories (skips territories the player already holds).
 * Each tier's 3 territories get distributed across that tier's 3 rivals (one each).
 * If a tier somehow has missing rivals, owners are reused round-robin.
 */
export function assignTerritoryOwnership(state: GameState): GameState {
  const owner: Record<string, string | null> = { ...(state.territoryOwner ?? {}) }
  // Index rivals by tier so we can hand out turf evenly.
  const rivalsByTier: Record<number, string[]> = {}
  for (const r of Object.values(state.rivals)) {
    if (!r || r.alive === false) continue
    const t = r.tier ?? 1
    rivalsByTier[t] = rivalsByTier[t] ?? []
    rivalsByTier[t].push(r.id)
  }
  for (const bracket of STATIC_TIER_BRACKETS) {
    const pool = rivalsByTier[bracket.tier] ?? []
    if (pool.length === 0) continue
    for (let i = 0; i < bracket.territoryIds.length; i++) {
      const tid = bracket.territoryIds[i]!
      // Player already owns this turf → leave alone (no rival).
      if (state.territoriesOwned[tid]) {
        owner[tid] = null
        continue
      }
      // Already assigned → keep it.
      if (owner[tid] && state.rivals[owner[tid]!]?.alive !== false) continue
      owner[tid] = pool[i % pool.length]!
    }
  }
  // Refresh each rival's territoryCount based on the new ownership map.
  const counts: Record<string, number> = {}
  for (const tid of Object.keys(owner)) {
    const rid = owner[tid]
    if (!rid) continue
    counts[rid] = (counts[rid] ?? 0) + 1
  }
  const nextRivals: Record<string, RivalState> = { ...state.rivals }
  for (const rid of Object.keys(nextRivals)) {
    nextRivals[rid] = { ...nextRivals[rid]!, territoryCount: counts[rid] ?? 0 }
  }
  const tmpState: GameState = { ...state, territoryOwner: owner, rivals: nextRivals }
  for (const rid of Object.keys(nextRivals)) {
    const floor = rivalDefenseFloorFromTerritory(tmpState, rid)
    if (floor > (nextRivals[rid]!.powerLevel ?? 0)) {
      nextRivals[rid] = { ...nextRivals[rid]!, powerLevel: floor }
    }
  }
  return { ...state, territoryOwner: owner, rivals: nextRivals }
}

/** Seed rivals if the table is empty AND assign ownership over un-owned territory. */
export function ensureRivals(state: GameState): GameState {
  let next = state
  if (Object.keys(next.rivals).length < RIVAL_COUNT) {
    next = { ...next, rivals: seedRivals(next) }
  }
  // Ensure ownership map is populated.
  const ownerKeys = Object.keys(next.territoryOwner ?? {})
  const totalStaticTerritories = TIER_COUNT * TERRITORIES_PER_TIER
  if (ownerKeys.length < totalStaticTerritories) {
    next = assignTerritoryOwnership(next)
  }
  return next
}

/** Weighted pick for gang-war target (same weights as legacy random attack rolls). */
export function pickRivalForGangWarTarget(state: GameState): string | null {
  const ids = Object.keys(state.rivals).filter((id) => state.rivals[id]?.alive !== false)
  if (!ids.length) return null
  let sum = 0
  const weights = ids.map((id) => {
    const r = state.rivals[id]!
    const w = (0.2 + r.aggression) * (1 + relRank(r.relationship) * 0.45)
    sum += w
    return w
  })
  let roll = Math.random() * sum
  for (let i = 0; i < ids.length; i++) {
    roll -= weights[i]!
    if (roll <= 0) return ids[i]!
  }
  return ids[ids.length - 1]!
}

/** Rival is tense enough that a street skirmish modal may fire (relationship tier or sub-bar). */
function isSkirmishTensionRival(r: RivalState): boolean {
  if (r.alive === false) return false
  const pts = r.relationshipPoints ?? RELATIONSHIP_POINTS_START
  return relRank(r.relationship) >= 1 || pts >= 55
}

function pickSkirmishRival(state: GameState): string | null {
  const ids = Object.keys(state.rivals).filter((id) => {
    const r = state.rivals[id]!
    return r.alive !== false && isSkirmishTensionRival(r)
  })
  if (!ids.length) return null
  let sum = 0
  const weights = ids.map((id) => {
    const r = state.rivals[id]!
    const w =
      8 + relRank(r.relationship) * 18 + (r.relationshipPoints ?? RELATIONSHIP_POINTS_START) * 0.35
    sum += w
    return w
  })
  let roll = Math.random() * sum
  for (let i = 0; i < ids.length; i++) {
    roll -= weights[i]!
    if (roll <= 0) return ids[i]!
  }
  return ids[ids.length - 1]!
}

function buildEncounter(
  state: GameState,
  rivalId: string,
  kind: 'attack' | 'revenge',
): PendingRivalEncounter | null {
  const r = state.rivals[rivalId]
  if (!r) return null
  const threat = playerThreatScore(state)
  const heat = state.heat
  const defendPowerCost = Math.max(
    RIVAL_DEFEND_POWER_FLOOR,
    Math.floor(
      r.powerLevel * RIVAL_DEFEND_RIVAL_COEF +
        threat * RIVAL_DEFEND_THREAT_COEF +
        heat * RIVAL_DEFEND_HEAT_COEF,
    ),
  )
  const payMoneyCost = Math.max(120, Math.floor(r.powerLevel * 9 + threat * 3.5 + heat * 14))
  const ignoreFailChance = Math.min(0.72, 0.2 + heat * 0.0045 + relRank(r.relationship) * 0.055)
  const revengePowerCost = Math.max(
    18,
    Math.floor(defendPowerCost * (kind === 'revenge' ? 1.15 : 1.28)),
  )
  // Reward is shaped to the power you actually spend (8–14× the strike cost in $),
  // with a tiny wealth-scaled bonus that hard-caps at $25k so revenge can never balloon
  // into a quarter-million payout just because the player is already rich.
  const revengeRewardMoney =
    Math.floor(revengePowerCost * (8 + Math.random() * 6)) +
    Math.min(25_000, Math.floor(state.money * 0.03))
  const revengeRewardPower = Math.max(8, Math.floor(revengePowerCost * 0.35))
  return {
    kind,
    rivalId,
    defendPowerCost,
    payMoneyCost,
    ignoreFailChance,
    revengePowerCost,
    revengeRewardMoney,
    revengeRewardPower,
  }
}

/**
 * Heat from passive economy this tick (small; avoids frame loops).
 */
function heatFromPassiveTick(state: GameState): number {
  const pm = passiveMoneyPerSecond(state)
  const raw = Math.min(HEAT_CAP_FROM_PASSIVE_PER_TICK, pm / 26_000)
  return raw * lifeHeatGainMultiplier(state)
}

/** Heat from a single manual Hustle resolution (not auto-hustle ticks). */
export function addHeatFromClickGains(
  state: GameState,
  gainMoney: number,
  gainPower: number,
): GameState {
  const hm = Math.min(0.85, gainMoney / 19_500)
  const hp = Math.min(0.62, gainPower / 55)
  const mult = lifeHeatGainMultiplier(state)
  return { ...state, heat: Math.min(HEAT_CAP, state.heat + (hm + hp) * mult) }
}

export function addHeatFromTerritoryCapture(state: GameState): GameState {
  const mult = lifeHeatGainMultiplier(state)
  return {
    ...state,
    heat: Math.min(HEAT_CAP, state.heat + HEAT_FROM_TERRITORY_CAPTURE * mult),
  }
}

function updateRivalStats(state: GameState): GameState {
  const threat = playerThreatScore(state)
  const nextRivals: Record<string, RivalState> = { ...state.rivals }
  for (const id of Object.keys(nextRivals)) {
    const rv = nextRivals[id]!
    const target = threat * (0.65 + rv.aggression * 0.35)
    let powerLevel = Math.round(rv.powerLevel * 0.985 + target * 0.015)
    const cap = Math.floor(target * 2.2)
    const turfFloor = rivalDefenseFloorFromTerritory(state, id)
    powerLevel = Math.max(turfFloor, Math.min(cap, Math.max(12, powerLevel)))
    const wealth = Math.round(rv.wealth * 0.998 + Math.random() * 6)
    nextRivals[id] = {
      ...rv,
      powerLevel,
      territoryCount: Math.max(0, rv.territoryCount + (Math.random() < 0.002 ? 1 : 0)),
      wealth,
      territoryPressure: Math.min(100, rv.territoryPressure + (Math.random() < 0.003 ? 1 : 0)),
    }
  }
  return { ...state, rivals: nextRivals }
}

function rollAmbientWarning(state: GameState): GameState {
  if (state.heat < 52) return state
  if (state.rivalAmbientCooldownTicks > 0) return state
  if (isGameplayModalBlocking(state)) return state
  if (Math.random() > 0.012) return state
  return setNarratorFromKey(
    {
      ...state,
      rivalWarningNonce: state.rivalWarningNonce + 1,
      rivalAmbientCooldownTicks: RIVAL_AMBIENT_COOLDOWN_TICKS,
    },
    'rival_warning',
  )
}

/**
 * Main tick hook: decay heat, passive heat, rival scaling, countdown, ambient warning, attacks.
 */
export function tickRivalsAndHeat(state: GameState): GameState {
  let next = ensureRivals(state)
  next = clearExpiredHeatCrackdown(next)
  next = updateRivalStats(next)

  if (next.heatCapGraceEndTick > 0 && next.tickCount >= next.heatCapGraceEndTick) {
    next = applyRandomHeatMaxPenalty({ ...next, heatCapGraceEndTick: 0, heat: HEAT_CAP })
  }

  const graceActive = next.heatCapGraceEndTick > next.tickCount
  const idleTicks = next.tickCount - next.lastManualHustleTick
  const heatDecay =
    idleTicks >= HEAT_IDLE_GRACE_TICKS ? HEAT_IDLE_FAST_DECAY_PER_TICK : HEAT_DECAY_PER_TICK

  let heat: number
  if (graceActive) {
    heat = HEAT_CAP
  } else {
    heat = Math.max(0, next.heat - heatDecay)
    heat = Math.min(HEAT_CAP, heat + heatFromPassiveTick(next))
  }
  next = { ...next, heat }

  let heatLatch = next.heatWarningLatch
  if (heat < HEAT_WARNING_LATCH_CLEAR * HEAT_CAP) {
    heatLatch = false
  } else if (heat >= HEAT_WARNING_THRESHOLD * HEAT_CAP && !heatLatch) {
    heatLatch = true
    next = { ...next, heatWarningSfxNonce: next.heatWarningSfxNonce + 1 }
  }
  next = { ...next, heatWarningLatch: heatLatch }

  if (heat >= HEAT_CAP && next.heatCapGraceEndTick === 0 && !isHeatCrackdownActive(next)) {
    next = {
      ...next,
      heat: HEAT_CAP,
      heatCapGraceEndTick: next.tickCount + HEAT_CAP_GRACE_TICKS,
    }
  }

  next = {
    ...next,
    heatGracePeriodActive: isHeatGracePeriod(next),
  }

  const ambient = Math.max(0, next.rivalAmbientCooldownTicks - 1)
  next = { ...next, rivalAmbientCooldownTicks: ambient }

  const cd = Math.max(0, next.rivalAttackCooldownTicks - 1)
  next = { ...next, rivalAttackCooldownTicks: cd }

  const timer = next.secondsUntilRivalCheck - 1
  if (timer > 0) {
    next = { ...next, secondsUntilRivalCheck: timer }
    return rollAmbientWarning(next)
  }

  next = {
    ...next,
    secondsUntilRivalCheck:
      RIVAL_CHECK_MIN + Math.floor(Math.random() * (RIVAL_CHECK_MAX - RIVAL_CHECK_MIN + 1)),
  }

  if (isGameplayModalBlocking(next)) {
    return rollAmbientWarning(next)
  }
  if (next.rivalAttackCooldownTicks > 0) return rollAmbientWarning(next)

  // Medium war: relationship-tense crews can flash a skirmish modal on the rival timer.
  if (
    !next.gangWarRivalId &&
    !next.pendingWarStrike &&
    !next.revengeTargetId &&
    !next.pendingRivalEncounter
  ) {
    const skId = pickSkirmishRival(next)
    if (skId) {
      const r = next.rivals[skId]!
      const pts = r.relationshipPoints ?? RELATIONSHIP_POINTS_START
      const tension01 = Math.min(1, (relRank(r.relationship) * 24 + pts) / 115)
      const rollP = 0.014 + next.heat * 0.00011 + tension01 * 0.026
      if (Math.random() < rollP) {
        const enc = buildEncounter(next, skId, 'attack')
        if (enc) {
          const stashed = stashActiveMinorLifeForBlocking(next)
          return {
            ...stashed,
            pendingRivalEncounter: enc,
            rivalAttackFlashNonce: stashed.rivalAttackFlashNonce + 1,
            rivalAttackCooldownTicks: RIVAL_COOLDOWN_AFTER_ENCOUNTER,
          }
        }
      }
    }
  }

  return rollAmbientWarning(next)
}

export type RivalChoiceId = 'defend' | 'pay' | 'ignore' | 'revenge_strike' | 'revenge_walk'

export function resolveRivalEncounter(state: GameState, choice: RivalChoiceId): GameState {
  const enc = state.pendingRivalEncounter
  if (!enc) return state

  if (enc.kind === 'attack') {
    return resolveAttackEncounter(state, enc, choice)
  }
  return resolveRevengeEncounter(state, enc, choice)
}

function applyAttackFailure(state: GameState, rivalId: string): GameState {
  const mit = houseItemRivalLossMitigation(state)
  const moneyLoss = Math.floor(state.money * SKIRMISH_MONEY_FRAC * mit)
  const powerLoss = Math.floor(state.power * SKIRMISH_POWER_FRAC * mit)
  let next: GameState = {
    ...state,
    money: Math.max(0, state.money - moneyLoss),
    power: Math.max(0, state.power - powerLoss),
    revengeTargetId: rivalId,
  }
  next = bumpRelationshipPoints(next, rivalId, 18)
  next = setNarratorFromKey(next, 'rival_loss')
  return next
}

function resolveAttackEncounter(
  state: GameState,
  enc: PendingRivalEncounter,
  choice: RivalChoiceId,
): GameState {
  const rivalId = enc.rivalId
  if (choice === 'revenge_strike' || choice === 'revenge_walk') {
    return { ...state, pendingRivalEncounter: null }
  }

  let next: GameState = { ...state, pendingRivalEncounter: null }

  if (choice === 'defend') {
    if (state.power >= enc.defendPowerCost) {
      next = setNarratorFromKey(next, 'rival_attack_repelled')
      next = {
        ...next,
        power: Math.max(
          0,
          next.power - Math.floor(enc.defendPowerCost * RIVAL_DEFEND_SPEND_FRACTION),
        ),
      }
      const moneyWin = Math.floor(state.money * SKIRMISH_MONEY_FRAC)
      const powerWin = Math.floor(state.power * SKIRMISH_POWER_FRAC)
      next = {
        ...next,
        money: next.money + moneyWin,
        power: next.power + powerWin,
      }
      next = bumpRelationshipPoints(next, rivalId, -12)
    } else {
      next = applyAttackFailure(next, rivalId)
    }
    next = { ...next, rivalAttackCooldownTicks: RIVAL_COOLDOWN_AFTER_ENCOUNTER }
    return queueRevengeModalIfNeeded(next)
  }

  if (choice === 'pay') {
    if (state.money >= enc.payMoneyCost) {
      next = {
        ...next,
        money: next.money - enc.payMoneyCost,
      }
      next = setNarratorFromKey(next, 'rival_payoff')
      next = bumpRelationshipPoints(next, rivalId, -6)
    } else {
      next = applyAttackFailure(next, rivalId)
    }
    next = { ...next, rivalAttackCooldownTicks: RIVAL_COOLDOWN_AFTER_ENCOUNTER }
    return queueRevengeModalIfNeeded(next)
  }

  if (choice === 'ignore') {
    if (Math.random() < enc.ignoreFailChance) {
      next = applyAttackFailure(next, rivalId)
    } else {
      next = setNarratorFromKey(next, 'rival_ignore_ok')
      next = bumpRelationshipPoints(next, rivalId, -8)
    }
    next = { ...next, rivalAttackCooldownTicks: RIVAL_COOLDOWN_AFTER_ENCOUNTER }
    return queueRevengeModalIfNeeded(next)
  }

  return next
}

/** If the player just earned a revenge target, open revenge modal immediately after. */
function queueRevengeModalIfNeeded(state: GameState): GameState {
  if (!state.revengeTargetId) return state
  const enc = buildEncounter(state, state.revengeTargetId, 'revenge')
  if (!enc) return state
  return {
    ...state,
    pendingRivalEncounter: enc,
    rivalAttackFlashNonce: state.rivalAttackFlashNonce + 1,
  }
}

function resolveRevengeEncounter(
  state: GameState,
  enc: PendingRivalEncounter,
  choice: RivalChoiceId,
): GameState {
  const rivalId = enc.rivalId
  let next: GameState = { ...state, pendingRivalEncounter: null }

  if (choice === 'revenge_walk') {
    next = { ...next, revengeTargetId: null }
    next = setNarratorFromKey(next, 'rival_revenge_walk')
    next = { ...next, rivalAttackCooldownTicks: RIVAL_COOLDOWN_AFTER_ENCOUNTER }
    return next
  }

  if (choice === 'revenge_strike') {
    if (state.power >= enc.revengePowerCost) {
      const mult = Math.min(
        RIVAL_INCOME_MULT_CAP,
        state.rivalIncomeMult * RIVAL_INCOME_MULT_PER_REVENGE,
      )
      const rv = next.rivals[rivalId]
      next = {
        ...next,
        power: Math.max(0, next.power - enc.revengePowerCost + enc.revengeRewardPower),
        money: next.money + enc.revengeRewardMoney,
        heat: Math.max(0, next.heat - 5),
        rivalIncomeMult: mult,
        rivals: rv
          ? {
              ...next.rivals,
              [rivalId]: {
                ...rv,
                relationship: escalateRelationship(rv.relationship),
                territoryCount: Math.max(0, rv.territoryCount - 1),
                powerLevel: Math.max(10, Math.floor(rv.powerLevel * 0.92)),
              },
            }
          : next.rivals,
      }
      next = setNarratorFromKey({ ...next, revengeTargetId: null }, 'rival_revenge')
      next = { ...next, rivalRevengeNonce: next.rivalRevengeNonce + 1 }
    } else {
      next = {
        ...next,
        power: Math.max(0, next.power - Math.floor(enc.revengePowerCost * 0.35)),
        revengeTargetId: rivalId,
      }
      next = setNarratorFromKey(next, 'rival_revenge_fail')
    }
    next = { ...next, rivalAttackCooldownTicks: RIVAL_COOLDOWN_AFTER_ENCOUNTER }
    return next
  }

  return next
}

/** Power spent when choosing “Strike first” on the gang leader demand. */
export function gangStrikeFirstPowerCost(state: GameState): number {
  const threat = playerThreatScore(state)
  return Math.max(360, Math.floor(threat * 0.095))
}

/** Open revenge UI when player taps HUD (if eligible). */
export function openRevengeEncounter(state: GameState): GameState {
  if (!state.revengeTargetId || state.pendingRivalEncounter) return state
  const enc = buildEncounter(state, state.revengeTargetId, 'revenge')
  if (!enc) return state
  const stashed = stashActiveMinorLifeForBlocking(state)
  return {
    ...stashed,
    pendingRivalEncounter: enc,
    rivalAttackFlashNonce: state.rivalAttackFlashNonce + 1,
  }
}
