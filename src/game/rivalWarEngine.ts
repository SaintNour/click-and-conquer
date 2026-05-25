import type { GameState } from '../data/types'
import type { RivalRelationship, RivalState, RivalWarDifficulty } from '../data/rivalTypes'
import { passivePowerPerSecond, totalPowerFromRecruits } from './compute'
import { isGameplayModalBlocking } from './lifeEventFlow'
import { territoriesOwnedCount, sumRecruitLevels } from './progressionMomentum'
import { setNarratorFromKey } from './narrator'
import { attachOutcomeBanner } from './outcomeMeta'
import {
  generateLeaderName,
  bumpRelationshipPoints,
  RELATIONSHIP_POINTS_START,
} from './rivalsEngine'
import {
  bumpedFailMultiplier,
  effectiveTerritoryPowerRequired,
  territoryDefById,
} from './tierEngine'
import { WAR_ACTION_ESCALATION_MULT } from './balanceConfig'

/** Reset war-line action counters when a gang arc ends or clears. */
const WAR_ARC_COST_RESET = { gangWarAttackUses: 0, gangWarDefendUses: 0 } as const

function warEconomySinkMult(state: GameState): number {
  const crew = sumRecruitLevels(state)
  const pps = passivePowerPerSecond(state)
  const c = Math.log10(1 + crew / 38)
  const p = Math.log10(1 + Math.max(1, pps) / 55)
  return 1 + c * 0.42 + p * 0.36
}

function playerThreatScore(state: GameState): number {
  const p = state.power + totalPowerFromRecruits(state) * 1.5
  const m = Math.sqrt(Math.max(0, state.money))
  return Math.max(8, p + m * 0.08)
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

export function inferWarDifficulty(r: RivalState, threat: number): RivalWarDifficulty {
  const ratio = r.powerLevel / Math.max(40, threat)
  if (ratio < 0.72) return 'easy'
  if (ratio > 1.15) return 'hard'
  return 'normal'
}

/** Default war-power pool size (0–100 like HP — paired stat shown in HUD). */
export const RIVAL_WAR_POWER_HP_MAX = 100

export function migrateRivalWarFields(r: RivalState, threat: number): RivalState {
  const leaderName = r.leaderName && r.leaderName.length > 0 ? r.leaderName : generateLeaderName()
  const hasWarFields =
    typeof r.warMaxHp === 'number' && typeof r.warHp === 'number' && r.warDifficulty
  const hasPowerFields = typeof r.warPowerHp === 'number' && typeof r.warPowerHpMax === 'number'
  const hasTierFields = typeof r.tier === 'number' && typeof r.relationshipPoints === 'number'
  if (hasWarFields && hasPowerFields && hasTierFields) {
    return r.leaderName === leaderName ? r : { ...r, leaderName }
  }
  const warDifficulty = hasWarFields ? r.warDifficulty : inferWarDifficulty(r, threat)
  const warMaxHp = hasWarFields ? r.warMaxHp : 100
  const warHp = hasWarFields ? Math.min(Math.max(0, r.warHp), warMaxHp) : warMaxHp
  const warPowerHpMax = hasPowerFields ? r.warPowerHpMax : RIVAL_WAR_POWER_HP_MAX
  const warPowerHp = hasPowerFields
    ? Math.min(Math.max(0, r.warPowerHp), warPowerHpMax)
    : warPowerHpMax
  // Legacy rivals: tier guess from powerLevel vs threat (best-effort; seedRivals usually overwrites them anyway).
  const tier = typeof r.tier === 'number' ? r.tier : 1
  const relationshipPoints =
    typeof r.relationshipPoints === 'number' ? r.relationshipPoints : RELATIONSHIP_POINTS_START
  return {
    ...r,
    leaderName,
    warDifficulty,
    warMaxHp,
    warHp,
    warPowerHpMax,
    warPowerHp,
    tier,
    relationshipPoints,
  }
}

function diffMult(d: RivalWarDifficulty): number {
  if (d === 'easy') return 0.42
  if (d === 'hard') return 1.55
  return 1
}

/**
 * Power ratio of player vs rival (≥1 means we are stronger).
 * Used to scale defend cost down and damage up while we out-power the gang.
 */
function powerEdgeRatio(state: GameState, rival: RivalState): number {
  const me = playerThreatScore(state)
  const them = Math.max(20, rival.powerLevel)
  return Math.max(0.25, Math.min(4, me / them))
}

/** 0.6 (we are much weaker) → 1.4 (we dominate). Drives defend cost down / damage up. */
function powerEdgeFactor(state: GameState, rival: RivalState): number {
  const ratio = powerEdgeRatio(state, rival)
  return Math.max(0.6, Math.min(1.4, 0.6 + (ratio - 0.5) * 0.6))
}

/**
 * Base power cost for one war attack (before per-arc escalation).
 * Same curve as before escalation was added.
 */
function rivalWarAttackPowerCostCore(state: GameState, rival: RivalState): number {
  const threat = playerThreatScore(state)
  const pl = Math.max(40, rival.powerLevel)
  const tick = state.tickCount
  const stage = 1 + Math.min(2.2, tick / 95_000 + territoriesOwnedCount(state) * 0.08)
  const rel = 1 + relRank(rival.relationship) * 0.12
  const edge = powerEdgeFactor(state, rival)
  const edgeCost = 1.7 - edge * 0.7
  const sink = warEconomySinkMult(state)
  const core = threat * 0.038 * stage * rel * diffMult(rival.warDifficulty) * edgeCost * sink
  // Floor/ceil must stay separated — old `ceil = threat*0.06` sat below floor and pinned everyone to ~180.
  const floor = Math.max(260, threat * 0.016 + pl * 0.038) * sink
  const ceil = Math.max(floor * 2.15, threat * 0.38 + pl * 0.095) * sink
  return Math.max(floor, Math.min(ceil, Math.floor(core)))
}

/**
 * Power cost for one war attack vs this rival.
 * Each attack in the same arc multiplies cost by `WAR_ACTION_ESCALATION_MULT` **uses**
 * (same exponential law as `pricing.upgradeCost` / recruit `costMult` tiers).
 */
export function rivalWarAttackPowerCost(state: GameState, rival: RivalState): number {
  const core = rivalWarAttackPowerCostCore(state, rival)
  const uses = state.gangWarAttackUses ?? 0
  return Math.max(200, Math.floor(core * WAR_ACTION_ESCALATION_MULT ** uses))
}

/**
 * Defend cost scales off attack **core** (~40%). Each defend in the arc escalates like attacks.
 */
export function rivalWarDefendPowerCost(state: GameState, rival: RivalState): number {
  const atkCore = rivalWarAttackPowerCostCore(state, rival)
  const edge = powerEdgeFactor(state, rival)
  const adj = atkCore * 0.48 * (1.55 - edge * 0.55)
  const uses = state.gangWarDefendUses ?? 0
  return Math.max(120, Math.floor(adj * WAR_ACTION_ESCALATION_MULT ** uses))
}

/** Damage dealt to the rival’s war HP. Bigger when we out-power them, smaller when they out-power us. */
export function rivalWarDamageToRival(
  attackPowerSpent: number,
  state: GameState,
  rival: RivalState,
): number {
  const edge = powerEdgeFactor(state, rival)
  const ref = Math.max(1, rivalWarAttackPowerCostCore(state, rival))
  // Damage is shaped to the cost (not raw power), so spending more never trivializes the fight.
  const raw = Math.floor((attackPowerSpent / ref) * (8 + Math.random() * 5))
  const scaled = Math.floor(raw * edge)
  return Math.max(6, scaled)
}

/** Drain to the rival’s war-power pool per attack (0–100 scale). Bigger when the rival is overpowered. */
export function rivalWarPowerDrainOnAttack(state: GameState, rival: RivalState): number {
  const edge = powerEdgeFactor(state, rival)
  const base = 9 + Math.floor(Math.random() * 7)
  return Math.max(4, Math.floor(base * edge))
}

/** Drain to the player’s power when defending an incoming strike (in addition to the power cost). Light. */
export function rivalWarRivalRecoverPerStrike(rival: RivalState): number {
  // Rival regenerates a small slice of their power pool every time they actually land a strike (or you bleed HP).
  const recovery = 2 + Math.floor(Math.random() * 4)
  return Math.min(recovery, Math.max(0, rival.warPowerHpMax - rival.warPowerHp))
}

function successorName(dead: RivalState): string {
  if (/\bJr\.?\b/i.test(dead.name)) return dead.name.replace(/\s+Jr\.?$/i, '') + ' II'
  return `${dead.name} Jr`
}

function buildSuccessor(dead: RivalState): RivalState {
  const powerLevel = Math.max(18, Math.floor(dead.powerLevel * 0.74))
  const warDifficulty: RivalWarDifficulty =
    dead.warDifficulty === 'hard' ? 'normal' : dead.warDifficulty === 'normal' ? 'easy' : 'easy'
  return {
    ...dead,
    name: successorName(dead),
    leaderName: generateLeaderName(),
    powerLevel,
    relationship: 'rival',
    relationshipPoints: RELATIONSHIP_POINTS_START,
    territoryPressure: Math.min(100, dead.territoryPressure + 8),
    alive: true,
    warDifficulty,
    warMaxHp: 100,
    warHp: 100,
    warPowerHpMax: RIVAL_WAR_POWER_HP_MAX,
    warPowerHp: RIVAL_WAR_POWER_HP_MAX,
    wealth: Math.floor(dead.wealth * 0.55),
  }
}

/** Loot fraction taken from the player's current money & power after eliminating a gang. */
export const RIVAL_WAR_VICTORY_LOOT_FRACTION = 0.2

/** Relationship sub-bar adjustments for war outcomes. Positive = relationship gets WORSE. */
const RELATIONSHIP_DELTA_SMALL_WIN = 22
const RELATIONSHIP_DELTA_SMALL_LOSS = 14
const RELATIONSHIP_DELTA_BIG_WIN = 35
const RELATIONSHIP_DELTA_BIG_LOSS = 18

/**
 * SMALL-WAR victory — territory transfers, rival is NOT eliminated.
 *  - Player gains the territory + its rewardMoney.
 *  - Rival's HP / power-pool reset to full but they lose one tile of turf.
 *  - Relationship sub-bar bumps toward conflict.
 *  - Fail multiplier on this territory is cleared (you actually took it).
 */
function applySmallWarVictory(
  state: GameState,
  rivalId: string,
  rivalAfterHit: RivalState,
  powerAfter: number,
): GameState {
  const tid = state.gangWarTargetTerritoryId
  if (!tid) return applyBigWarVictory(state, rivalId, rivalAfterHit, powerAfter)
  const td = territoryDefById(tid)
  const moneyGain = td?.rewardMoney ?? 0
  const territoriesOwned = { ...state.territoriesOwned, [tid]: true }
  const territoryOwner = { ...(state.territoryOwner ?? {}), [tid]: null }
  const territoryFailMult = { ...(state.territoryFailMult ?? {}) }
  delete territoryFailMult[tid]
  const rivalReset: RivalState = {
    ...rivalAfterHit,
    warHp: rivalAfterHit.warMaxHp,
    warPowerHp: rivalAfterHit.warPowerHpMax,
    territoryCount: Math.max(0, rivalAfterHit.territoryCount - 1),
  }
  let next: GameState = {
    ...state,
    money: state.money + moneyGain,
    power: powerAfter,
    territoriesOwned,
    territoryOwner,
    territoryFailMult,
    rivals: { ...state.rivals, [rivalId]: rivalReset },
    gangWarRivalId: null,
    gangWarTargetTerritoryId: null,
    gangWarSmallWar: false,
    ...WAR_ARC_COST_RESET,
    gangIntelRivalId: null,
    gangWarStrikePrepared: false,
    gangWarSurpriseDoublePending: false,
    pendingWarStrike: null,
    playerWarHp: state.playerWarMaxHp,
    rivalAttackFlashNonce: state.rivalAttackFlashNonce + 1,
  }
  next = bumpRelationshipPoints(next, rivalId, RELATIONSHIP_DELTA_SMALL_WIN)
  next = setNarratorFromKey(next, 'rival_war_territory_won')
  const firstFlag = !state.territoryFirstCaptureSeen?.[tid]
  if (firstFlag) {
    next = {
      ...next,
      territoryFirstCaptureSeen: { ...(state.territoryFirstCaptureSeen ?? {}), [tid]: true },
    }
  }
  const detailBase = `${rivalAfterHit.name} bled their line over ${td?.name ?? 'this turf'}. You bagged the corner and +$${moneyGain.toLocaleString()}.`
  const detail = firstFlag ? `First time your map holds this pin: ${detailBase}` : detailBase
  return attachOutcomeBanner(state, next, {
    title: `${td?.name ?? 'Territory'} flipped`,
    detail,
    variant: 'success',
  })
}

/**
 * BIG-WAR victory — full elimination + 20% spoils + successor spawns. (Existing flow.)
 */
function applyBigWarVictory(
  state: GameState,
  rivalId: string,
  rivalAfterHit: RivalState,
  powerAfter: number,
): GameState {
  const successor = buildSuccessor({ ...rivalAfterHit, alive: false, warHp: 0 })
  const moneyGain = Math.floor(state.money * RIVAL_WAR_VICTORY_LOOT_FRACTION)
  const powerGain = Math.floor(powerAfter * RIVAL_WAR_VICTORY_LOOT_FRACTION)
  let next: GameState = {
    ...state,
    money: state.money + moneyGain,
    power: powerAfter + powerGain,
    gangWarRivalId: null,
    gangWarTargetTerritoryId: null,
    gangWarSmallWar: false,
    ...WAR_ARC_COST_RESET,
    gangIntelRivalId: null,
    gangWarStrikePrepared: false,
    gangWarSurpriseDoublePending: false,
    playerWarHp: state.playerWarMaxHp,
    rivals: { ...state.rivals, [rivalId]: successor },
    rivalAttackFlashNonce: state.rivalAttackFlashNonce + 1,
    rivalIncomeMult: Math.min(1.12, state.rivalIncomeMult + 0.004),
    achievementStats: {
      ...state.achievementStats,
      rivalEliminations: (state.achievementStats.rivalEliminations ?? 0) + 1,
    },
    eventOutcomeBanner: {
      title: `${rivalAfterHit.name} folded`,
      detail: `You broke their line and took ~${Math.round(
        RIVAL_WAR_VICTORY_LOOT_FRACTION * 100,
      )}% as spoils: +$${moneyGain.toLocaleString()} · +${powerGain.toLocaleString()} power.`,
      variant: 'success',
    },
  }
  // Successor counts as a "new" rival — reset relationship sub-bar a touch.
  next = bumpRelationshipPoints(next, rivalId, RELATIONSHIP_DELTA_BIG_WIN)
  return setNarratorFromKey(next, 'rival_war_eliminated')
}

/** Branch on small/big war. Both attack and surge call this. */
function applyWarVictory(
  state: GameState,
  rivalId: string,
  rivalAfterHit: RivalState,
  powerAfter: number,
): GameState {
  if (state.gangWarSmallWar && state.gangWarTargetTerritoryId) {
    return applySmallWarVictory(state, rivalId, rivalAfterHit, powerAfter)
  }
  return applyBigWarVictory(state, rivalId, rivalAfterHit, powerAfter)
}

/**
 * Spend a chunk of power for a guaranteed big hit + skip one incoming strike.
 * Cost is 25% of current power; damage is roughly 2× a normal attack’s damage.
 */
export function rivalWarSurgePowerCost(state: GameState): number {
  const uses = state.gangWarAttackUses ?? 0
  const threat = playerThreatScore(state)
  const base = Math.max(720, Math.floor(threat * 0.17), Math.floor(state.power * 0.34))
  return Math.max(680, Math.floor(base * WAR_ACTION_ESCALATION_MULT ** uses))
}

export function tryRivalWarAttack(state: GameState, rivalId: string): GameState {
  if (isGameplayModalBlocking(state)) return state
  if (!state.gangWarRivalId || rivalId !== state.gangWarRivalId) return state
  const r = state.rivals[rivalId]
  if (!r || r.alive === false) return state
  const cost = rivalWarAttackPowerCost(state, r)
  if (state.power < cost) return state
  const dmg = rivalWarDamageToRival(cost, state, r)
  const newHp = Math.max(0, r.warHp - dmg)
  const drain = rivalWarPowerDrainOnAttack(state, r)
  const newPowerHp = Math.max(0, r.warPowerHp - drain)
  const wasBroken = r.warPowerHp <= 0
  const becameBroken = !wasBroken && newPowerHp <= 0
  const nextRival: RivalState = { ...r, warHp: newHp, warPowerHp: newPowerHp }
  const powerAfter = state.power - cost

  if (newHp <= 0) {
    return applyWarVictory(state, rivalId, nextRival, powerAfter)
  }
  return setNarratorFromKey(
    {
      ...state,
      power: powerAfter,
      rivals: { ...state.rivals, [rivalId]: nextRival },
      rivalAttackFlashNonce: state.rivalAttackFlashNonce + 1,
      gangWarAttackUses: (state.gangWarAttackUses ?? 0) + 1,
    },
    becameBroken ? 'rival_war_broken' : 'rival_war_hit',
  )
}

/**
 * War Surge — spend a big lump of power for a guaranteed heavy hit + skip the next incoming strike.
 * Cost scales with threat, current power pool, and per-arc escalation (same mult as attacks).
 */
export function tryRivalWarSurge(state: GameState, rivalId: string): GameState {
  if (isGameplayModalBlocking(state)) return state
  if (!state.gangWarRivalId || rivalId !== state.gangWarRivalId) return state
  const r = state.rivals[rivalId]
  if (!r || r.alive === false) return state
  const cost = rivalWarSurgePowerCost(state)
  if (state.power < cost) return state
  // Surge damage shaped from cost (so spending more does scale up — within reason).
  const baseDmg = rivalWarDamageToRival(rivalWarAttackPowerCostCore(state, r) * 2, state, r)
  const dmg = Math.max(baseDmg, 24)
  const drain = Math.min(r.warPowerHp, 28 + Math.floor(Math.random() * 14))
  const newHp = Math.max(0, r.warHp - dmg)
  const newPowerHp = Math.max(0, r.warPowerHp - drain)
  const nextRival: RivalState = { ...r, warHp: newHp, warPowerHp: newPowerHp }
  const powerAfter = state.power - cost

  if (newHp <= 0) {
    return applyWarVictory(state, rivalId, nextRival, powerAfter)
  }
  return setNarratorFromKey(
    {
      ...state,
      power: powerAfter,
      rivals: { ...state.rivals, [rivalId]: nextRival },
      rivalAttackFlashNonce: state.rivalAttackFlashNonce + 1,
      gangWarStrikePrepared: true,
      gangWarAttackUses: (state.gangWarAttackUses ?? 0) + 1,
    },
    'rival_war_surge',
  )
}

/**
 * Surrender to a rival to exit the war. Random tribute (money OR power, picked at random)
 * + revenge flag for later payback. War ends; rival’s relationship escalates one tier.
 *
 * Tribute size scales with player wealth so it always stings appropriately.
 */
export function tryRivalSurrender(state: GameState, rivalId: string): GameState {
  if (isGameplayModalBlocking(state)) return state
  if (!state.gangWarRivalId || rivalId !== state.gangWarRivalId) return state
  const r = state.rivals[rivalId]
  if (!r || r.alive === false) return state

  // Pick money OR power tribute, randomly. (User-requested mechanic.)
  const tributeMoney = Math.random() < 0.5
  let moneyLost = 0
  let powerLost = 0
  let detail: string
  if (tributeMoney) {
    moneyLost = Math.max(120, Math.floor(state.money * (0.18 + Math.random() * 0.1)))
    detail = `They take $${moneyLost.toLocaleString()} as tribute and back off — for now.`
  } else {
    powerLost = Math.max(200, Math.floor(state.power * (0.32 + Math.random() * 0.12)))
    detail = `They press your crew for ${powerLost.toLocaleString()}⚡ as tribute and back off — for now.`
  }

  const rel: RivalRelationship = 'nemesis'
  let next: GameState = {
    ...state,
    money: Math.max(0, state.money - moneyLost),
    power: Math.max(0, state.power - powerLost),
    gangWarRivalId: null,
    gangWarTargetTerritoryId: null,
    gangWarSmallWar: false,
    ...WAR_ARC_COST_RESET,
    gangIntelRivalId: null,
    gangWarStrikePrepared: false,
    gangWarSurpriseDoublePending: false,
    pendingWarStrike: null,
    playerWarHp: state.playerWarMaxHp,
    revengeTargetId: rivalId,
    rivals: {
      ...state.rivals,
      [rivalId]: {
        ...r,
        relationship: rel,
        warHp: r.warMaxHp,
        warPowerHp: r.warPowerHpMax,
      },
    },
    rivalAttackFlashNonce: state.rivalAttackFlashNonce + 1,
    eventOutcomeBanner: {
      title: `Surrendered to ${r.name}`,
      detail: `${detail} Revenge is now open against them.`,
      variant: 'rival-fail',
    },
  }
  next = bumpRelationshipPoints(next, rivalId, 30)
  return setNarratorFromKey(next, 'rival_war_surrender')
}

/**
 * Estimated cash tribute the broken rival pays the player on Truce.
 * Used by the HUD button label so the player sees a payout, not a cost.
 * The actual amount in `tryRivalTruce` adds ±10% jitter on top.
 */
export function rivalTruceTributeEstimate(rival: RivalState): number {
  return Math.max(120, Math.floor(rival.wealth * 0.45))
}

/**
 * Truce — only available when the rival's war-power pool is broken (≤0).
 * The rival is on their knees; the player extracts tribute (money + small power gesture),
 * ends the war cleanly with no revenge flag, and cools the relationship one tier.
 */
export function tryRivalTruce(state: GameState, rivalId: string): GameState {
  if (isGameplayModalBlocking(state)) return state
  if (!state.gangWarRivalId || rivalId !== state.gangWarRivalId) return state
  const r = state.rivals[rivalId]
  if (!r || r.alive === false) return state
  if (r.warPowerHp > 0) return state

  // 35–55% of the rival's wealth pile, minimum floor so it always feels like a real win.
  const fraction = 0.35 + Math.random() * 0.2
  const moneyGained = Math.max(120, Math.floor(r.wealth * fraction))
  // Small power gesture — siphon a slice of their crew strength.
  const powerGained = Math.max(8, Math.floor(r.powerLevel * 0.35))
  const rel: RivalRelationship =
    r.relationship === 'nemesis' ? 'enemy' : r.relationship === 'enemy' ? 'rival' : 'neutral'

  let next: GameState = {
    ...state,
    money: state.money + moneyGained,
    power: state.power + powerGained,
    gangWarRivalId: null,
    gangWarTargetTerritoryId: null,
    gangWarSmallWar: false,
    ...WAR_ARC_COST_RESET,
    gangIntelRivalId: null,
    gangWarStrikePrepared: false,
    gangWarSurpriseDoublePending: false,
    pendingWarStrike: null,
    playerWarHp: state.playerWarMaxHp,
    rivals: {
      ...state.rivals,
      [rivalId]: {
        ...r,
        relationship: rel,
        warHp: r.warMaxHp,
        warPowerHp: r.warPowerHpMax,
        wealth: Math.max(0, Math.floor(r.wealth - moneyGained)),
        powerLevel: Math.max(12, Math.floor(r.powerLevel * 0.78)),
        territoryPressure: Math.max(0, r.territoryPressure - 12),
      },
    },
    heat: Math.max(0, state.heat - 6),
    eventOutcomeBanner: {
      title: `Truce with ${r.name}`,
      detail: `They folded and paid: +$${moneyGained.toLocaleString()} · +${powerGained.toLocaleString()}⚡. Relationship cools to ${rel}.`,
      variant: 'success',
    },
  }
  // Truce cools the relationship — push sub-bar down toward neutral.
  next = bumpRelationshipPoints(next, rivalId, -40)
  return setNarratorFromKey(next, 'rival_war_truce')
}

/**
 * Resolve a reactive incoming-strike popup.
 *  - 'defend': pay the defend cost (capped at the player's current power) and block the hit.
 *  - 'take_hit': absorb the full damage to playerWarHp. Hitting 0 triggers collapsePlayerWar.
 */
export type WarStrikeChoice = 'defend' | 'take_hit'

export function resolveWarStrike(state: GameState, choice: WarStrikeChoice): GameState {
  const pending = state.pendingWarStrike
  if (!pending) return state
  const rival = state.rivals[pending.rivalId]

  if (choice === 'defend') {
    // Pay the defend cost; if the player can't fully afford it, drain to 0 but still block once.
    const paid = Math.min(state.power, pending.defendPowerCost)
    return {
      ...state,
      power: state.power - paid,
      pendingWarStrike: null,
      rivalWarningNonce: state.rivalWarningNonce + 1,
      gangWarDefendUses: (state.gangWarDefendUses ?? 0) + 1,
    }
  }

  // take_hit
  const mult = state.gangWarSurpriseDoublePending ? 2 : 1
  // Broken rivals hit at half strength.
  const brokenMult = rival && rival.warPowerHp <= 0 ? 0.5 : 1
  const rawDamage = Math.max(1, Math.round(pending.incomingDamage * mult * brokenMult))
  const playerWarHp = Math.max(0, state.playerWarHp - rawDamage)
  let nextRivals = state.rivals
  if (rival) {
    const recover = rivalWarRivalRecoverPerStrike(rival)
    if (recover > 0) {
      nextRivals = {
        ...state.rivals,
        [pending.rivalId]: {
          ...rival,
          warPowerHp: Math.min(rival.warPowerHpMax, rival.warPowerHp + recover),
        },
      }
    }
  }
  let next: GameState = {
    ...state,
    rivals: nextRivals,
    playerWarHp,
    pendingWarStrike: null,
    rivalAttackFlashNonce: state.rivalAttackFlashNonce + 1,
    gangWarSurpriseDoublePending: false,
  }
  if (playerWarHp <= 0) {
    next = collapsePlayerWar(next)
  } else if (rival) {
    next = setNarratorFromKey(next, 'rival_war_hit_taken')
  }
  return next
}

/** Highest-tension living rival id for HUD war row. */
export function topTensionRivalId(state: GameState): string | null {
  let best: { id: string; rank: number } | null = null
  for (const id of Object.keys(state.rivals)) {
    const rv = state.rivals[id]
    if (!rv || rv.alive === false) continue
    const rank = relRank(rv.relationship)
    if (rank < 1) continue
    if (!best || rank > best.rank) best = { id, rank }
  }
  return best?.id ?? null
}

function ownedTerritoryIds(state: GameState): string[] {
  return Object.keys(state.territoriesOwned).filter((id) => state.territoriesOwned[id])
}

function stripRandomTerritories(state: GameState, count: number): GameState {
  const ids = ownedTerritoryIds(state)
  if (ids.length === 0) return state
  const n = Math.min(count, ids.length)
  const shuffled = [...ids].sort(() => Math.random() - 0.5)
  const territoriesOwned = { ...state.territoriesOwned }
  for (let i = 0; i < n; i++) territoriesOwned[shuffled[i]!] = false
  return { ...state, territoriesOwned }
}

function collapsePlayerWar(state: GameState): GameState {
  const rivalId = state.gangWarRivalId
  // SMALL-WAR loss: lighter — no territory stripping, but bump the target territory's fail cost.
  if (state.gangWarSmallWar && state.gangWarTargetTerritoryId) {
    const tid = state.gangWarTargetTerritoryId
    const lostPow = Math.max(200, Math.floor(state.power * (0.08 + Math.random() * 0.06)))
    const lostMoney = Math.max(40, Math.floor(state.money * (0.04 + Math.random() * 0.04)))
    const failMult = { ...(state.territoryFailMult ?? {}) }
    failMult[tid] = bumpedFailMultiplier(state, tid)
    const td = territoryDefById(tid)
    let next: GameState = {
      ...state,
      money: Math.max(0, state.money - lostMoney),
      power: Math.max(0, state.power - lostPow),
      playerWarHp: state.playerWarMaxHp,
      heat: Math.min(100, state.heat + 6),
      gangWarRivalId: null,
      gangWarTargetTerritoryId: null,
      gangWarSmallWar: false,
      ...WAR_ARC_COST_RESET,
      pendingWarStrike: null,
      lifeEventForcedId: null,
      gangIntelRivalId: null,
      gangWarStrikePrepared: false,
      gangWarSurpriseDoublePending: false,
      territoryFailMult: failMult,
      eventOutcomeBanner: {
        title: `${td?.name ?? 'Territory'} held against you`,
        detail: `They beat you back. −$${lostMoney.toLocaleString()} · −${lostPow.toLocaleString()}⚡. Next takeover attempt on ${td?.name ?? 'this turf'} costs +15% more power.`,
        variant: 'rival-fail',
      },
    }
    if (rivalId) next = bumpRelationshipPoints(next, rivalId, RELATIONSHIP_DELTA_SMALL_LOSS)
    return setNarratorFromKey(next, 'rival_war_territory_lost')
  }

  // BIG-WAR loss: existing harsh collapse path.
  const lostPow = Math.max(400, Math.floor(state.power * (0.18 + Math.random() * 0.12)))
  let next = stripRandomTerritories(state, 1 + (Math.random() < 0.35 ? 1 : 0))
  next = {
    ...next,
    power: Math.max(0, next.power - lostPow),
    playerWarHp: next.playerWarMaxHp,
    heat: Math.min(100, next.heat + 14),
    gangWarRivalId: null,
    gangWarTargetTerritoryId: null,
    gangWarSmallWar: false,
    ...WAR_ARC_COST_RESET,
    pendingWarStrike: null,
    lifeEventForcedId: null,
    gangIntelRivalId: null,
    gangWarStrikePrepared: false,
    gangWarSurpriseDoublePending: false,
    achievementStats: {
      ...next.achievementStats,
      playerWarMeltdowns: (next.achievementStats.playerWarMeltdowns ?? 0) + 1,
    },
  }
  if (rivalId) next = bumpRelationshipPoints(next, rivalId, RELATIONSHIP_DELTA_BIG_LOSS)
  return setNarratorFromKey(next, 'rival_war_collapse')
}

/** Per-tick chance the active war rival queues an incoming strike popup. Bumped so the enemy stays active. */
const WAR_HIT_CHANCE = 0.055

export function tickRivalWar(state: GameState): GameState {
  if (!state.gangWarRivalId) return state
  // Never queue a new strike while another popup is already open.
  if (state.pendingWarStrike) return state
  if (isGameplayModalBlocking(state)) return state

  const rid = state.gangWarRivalId
  const r = state.rivals[rid]
  if (!r || r.alive === false) {
    return { ...state, gangWarRivalId: null, pendingWarStrike: null, ...WAR_ARC_COST_RESET }
  }

  // Broken rivals strike less often. Small (territory) wars double the strike rate so the gang fights harder for their turf.
  const brokenMult = r.warPowerHp <= 0 ? 0.45 : 1
  const smallWarMult = state.gangWarSmallWar ? 2 : 1
  const chance = WAR_HIT_CHANCE * brokenMult * smallWarMult
  if (Math.random() >= chance) return state

  if (state.gangWarStrikePrepared) {
    return setNarratorFromKey(
      { ...state, gangWarStrikePrepared: false },
      'rival_war_first_strike_blocked',
    )
  }

  // Incoming damage also respects the power gap — bullies hit harder when you are weaker than them.
  // Broken rivals deal soft hits.
  const baseInc = 5 + Math.floor(Math.random() * 12) + relRank(r.relationship) * 2
  const edge = powerEdgeFactor(state, r)
  const dmgBrokenMult = r.warPowerHp <= 0 ? 0.55 : 1
  const incomingDamage = Math.max(2, Math.round(baseInc * (2 - edge) * dmgBrokenMult))
  const defendPowerCost = rivalWarDefendPowerCost(state, r)

  return {
    ...state,
    pendingWarStrike: {
      rivalId: rid,
      incomingDamage,
      defendPowerCost,
    },
    rivalWarningNonce: state.rivalWarningNonce + 1,
  }
}

export function migrateAllRivalsWar(state: GameState): GameState {
  const threat = playerThreatScore(state)
  const rivals: Record<string, RivalState> = {}
  for (const id of Object.keys(state.rivals)) {
    rivals[id] = migrateRivalWarFields(state.rivals[id]!, threat)
  }
  return { ...state, rivals }
}

/**
 * Begin a SMALL territory war: a war the player initiates against a specific rival to
 * take a specific territory. Refreshes both sides' HP/power pool, sets the small-war flag,
 * remembers which territory is the prize. Doesn't escalate relationship by itself — that
 * happens on win/loss outcomes.
 */
export function beginSmallTerritoryWar(
  state: GameState,
  rivalId: string,
  territoryId: string,
): GameState {
  const r = state.rivals[rivalId]
  if (!r || r.alive === false) return state
  const tDef = territoryDefById(territoryId)
  const req = tDef ? effectiveTerritoryPowerRequired(state, tDef) : 14_000
  const hpScale = Math.min(2.45, Math.max(0.82, req / 13_500))
  const warMaxHp = Math.round(Math.min(275, Math.max(92, 100 * hpScale)))
  const refreshed: RivalState = {
    ...r,
    warMaxHp,
    warHp: warMaxHp,
    warPowerHp: r.warPowerHpMax,
    warPowerHpMax: r.warPowerHpMax,
  }
  return {
    ...state,
    gangWarRivalId: rivalId,
    gangWarTargetTerritoryId: territoryId,
    gangWarSmallWar: true,
    ...WAR_ARC_COST_RESET,
    gangIntelRivalId: null,
    gangWarStrikePrepared: false,
    gangWarSurpriseDoublePending: false,
    pendingWarStrike: null,
    playerWarHp: state.playerWarMaxHp,
    rivals: { ...state.rivals, [rivalId]: refreshed },
    rivalStoryEventNonce: state.rivalStoryEventNonce + 1,
  }
}
