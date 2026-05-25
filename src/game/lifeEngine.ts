import { houseTierAtLevel, MAX_HOUSE_LEVEL_INDEX } from '../data/lifeContent'
import {
  houseItemHeatMitigation,
  houseItemIncomeMult,
  houseItemPowerMult,
} from './houseCustomizationEngine'
import type { EventChoiceDef, GameState } from '../data/types'
import { EVENT_COOLDOWN_MAX, EVENT_COOLDOWN_MIN } from './constants'
import {
  DATE_COST,
  DATE_COST_CAP,
  DATE_COST_PASSIVE_SECONDS,
  DATE_COST_WEALTH_FRAC,
  GIFT_COST,
  GIFT_COST_CAP,
  GIFT_COST_PASSIVE_SECONDS,
  GIFT_COST_WEALTH_FRAC,
  LIFE_GRIEF_DURATION_TICKS,
  LIFE_GRIEF_INCOME_POWER_MULT,
  LIFE_NEGLECT_AFFECTION_DELTA,
  LIFE_NEGLECT_DECAY_INTERVAL,
  LIFE_NEGLECT_GRACE_TICKS,
  LIFE_NEGLECT_HAPPINESS_DELTA,
  MARRIAGE_COST,
  MARRIAGE_COST_CAP,
  MARRIAGE_COST_PASSIVE_SECONDS,
  MARRIAGE_COST_WEALTH_FRAC,
  PRESTIGE_FAMILY_MIN_TICKS,
  PRESTIGE_SOLO_MIN_TICKS,
  lifeEventFullCooldownAfterResolveSeconds,
  nextLifeEventCooldownSeconds,
} from './balanceConfig'
import { computePlayerTitle, passiveMoneyPerSecond } from './compute'
import { calculateDynamicMoneyCost } from './economyScaling'
import { setNarratorFromKey } from './narrator'
import { sumBusinessLevels, sumRecruitLevels, territoriesOwnedCount } from './progressionMomentum'

const META_INCOME_CAP = 1.28
const META_POWER_CAP = 1.24
const MARRIAGE_INCOME = 1.028
const MARRIAGE_POWER = 1.024

const SOCIAL_COOLDOWN = 7

const PARTNER_NAMES = [
  'Jordan',
  'Riley',
  'Casey',
  'Avery',
  'Quinn',
  'Reese',
  'Skyler',
  'Jamie',
  'Morgan',
  'Drew',
]

function randPartnerName(): string {
  return PARTNER_NAMES[Math.floor(Math.random() * PARTNER_NAMES.length)]!
}

export function randomPartnerNameForMeet(): string {
  return randPartnerName()
}

export function effectiveDateCost(state: GameState): number {
  return calculateDynamicMoneyCost(
    state,
    DATE_COST,
    DATE_COST_WEALTH_FRAC,
    DATE_COST_CAP,
    passiveMoneyPerSecond(state),
    DATE_COST_PASSIVE_SECONDS,
  )
}

export function effectiveGiftCost(state: GameState): number {
  return calculateDynamicMoneyCost(
    state,
    GIFT_COST,
    GIFT_COST_WEALTH_FRAC,
    GIFT_COST_CAP,
    passiveMoneyPerSecond(state),
    GIFT_COST_PASSIVE_SECONDS,
  )
}

export function effectiveMarriageCost(state: GameState): number {
  return calculateDynamicMoneyCost(
    state,
    MARRIAGE_COST,
    MARRIAGE_COST_WEALTH_FRAC,
    MARRIAGE_COST_CAP,
    passiveMoneyPerSecond(state),
    MARRIAGE_COST_PASSIVE_SECONDS,
  )
}

function clamp(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)))
}

function randomEventCooldown(): number {
  return (
    Math.floor(Math.random() * (EVENT_COOLDOWN_MAX - EVENT_COOLDOWN_MIN + 1)) + EVENT_COOLDOWN_MIN
  )
}

function randomLifeCooldown(): number {
  return nextLifeEventCooldownSeconds()
}

export function lifeMetaIncomeMult(state: GameState): number {
  const m = state.lifePrestigeMarried * 0.014 + state.lifePrestigeSolo * 0.006
  return Math.min(META_INCOME_CAP, 1 + m)
}

export function lifeMetaPowerMult(state: GameState): number {
  const m = state.lifePrestigeMarried * 0.011 + state.lifePrestigeSolo * 0.005
  return Math.min(META_POWER_CAP, 1 + m)
}

export function lifeMoneyMultiplier(state: GameState): number {
  const tier = houseTierAtLevel(state.houseLevel)
  const marriage = state.married ? MARRIAGE_INCOME : 1
  return (
    tier.incomeMult *
    marriage *
    lifeMetaIncomeMult(state) *
    houseItemIncomeMult(state) *
    lifeGriefDebuffMult(state)
  )
}

export function lifePowerMultiplier(state: GameState): number {
  const tier = houseTierAtLevel(state.houseLevel)
  const marriage = state.married ? MARRIAGE_POWER : 1
  return (
    tier.powerMult *
    marriage *
    lifeMetaPowerMult(state) *
    houseItemPowerMult(state) *
    lifeGriefDebuffMult(state)
  )
}

export function lifeSecurityLevel(state: GameState): number {
  return houseTierAtLevel(state.houseLevel).security
}

/** <1 reduces heat gain (house security + HQ décor). */
export function lifeHeatGainMultiplier(state: GameState): number {
  const sec = lifeSecurityLevel(state)
  const base = Math.max(0.58, 1 - sec / 210)
  return base * houseItemHeatMitigation(state)
}

/** While grieving a break-up, income & power from life layer are reduced. */
export function lifeGriefDebuffMult(state: GameState): number {
  if (state.tickCount < state.lifeGriefDebuffEndTick) return LIFE_GRIEF_INCOME_POWER_MULT
  return 1
}

export function tickLifeSocialCooldown(state: GameState): GameState {
  return { ...state, lifeSocialCooldownTicks: Math.max(0, state.lifeSocialCooldownTicks - 1) }
}

export function lifeNextRandomGap(): number {
  return randomLifeCooldown()
}

/** After resolving a life event: cooldown + extra buffer (see balanceConfig). */
export function lifePostResolveDelaySeconds(): number {
  return lifeEventFullCooldownAfterResolveSeconds()
}

function nextHouseUpgradeCost(state: GameState): number {
  const next = state.houseLevel + 1
  if (next > MAX_HOUSE_LEVEL_INDEX) return 0
  return houseTierAtLevel(next).upgradeCost
}

export function tryUpgradeHouse(state: GameState): GameState {
  if (state.houseLevel >= MAX_HOUSE_LEVEL_INDEX) return state
  const cost = nextHouseUpgradeCost(state)
  if (cost <= 0 || state.money < cost) return state
  const narratorKey = state.houseLevel === 0 ? 'life_move_apartment' : 'life_house_upgrade'
  return setNarratorFromKey(
    {
      ...state,
      money: state.money - cost,
      houseLevel: state.houseLevel + 1,
    },
    narratorKey,
  )
}

export type LifeSocialAction = 'date' | 'gift'

export function applyLifeSocialAction(state: GameState, action: LifeSocialAction): GameState {
  if (!state.relationshipUnlocked) return state
  if (state.lifeSocialCooldownTicks > 0) return state

  let next: GameState = { ...state, lifeSocialCooldownTicks: SOCIAL_COOLDOWN }

  if (action === 'date') {
    const cost = effectiveDateCost(state)
    if (state.money < cost) return state
    const affection = state.affection + 9
    const happiness = state.happiness + 6
    const loyalty = state.loyalty + 3
    const hasPartner = true
    const partnerName = state.partnerName || randPartnerName()
    next = {
      ...next,
      money: state.money - cost,
      affection: clamp(affection),
      happiness: clamp(happiness),
      loyalty: clamp(loyalty),
      hasPartner,
      partnerName,
      lastLifePositiveSocialTick: state.tickCount,
    }
    return setNarratorFromKey(next, 'life_date')
  }

  if (action === 'gift') {
    const cost = effectiveGiftCost(state)
    if (state.money < cost) return state
    next = {
      ...next,
      money: state.money - cost,
      affection: clamp(state.affection + 14),
      loyalty: clamp(state.loyalty + 8),
      happiness: clamp(state.happiness + 5),
      hasPartner: true,
      partnerName: state.partnerName || randPartnerName(),
      lastLifePositiveSocialTick: state.tickCount,
    }
    return setNarratorFromKey(next, 'life_gift')
  }

  return state
}

function performRelationshipBreakup(state: GameState): GameState {
  return setNarratorFromKey(
    {
      ...state,
      married: false,
      hasPartner: false,
      partnerName: '',
      affection: 0,
      happiness: 0,
      loyalty: 0,
      lifeGriefDebuffEndTick: state.tickCount + LIFE_GRIEF_DURATION_TICKS,
      achievementStats: {
        ...state.achievementStats,
        relationshipBreakups: (state.achievementStats.relationshipBreakups ?? 0) + 1,
      },
    },
    'life_breakup',
  )
}

/** Affection/happiness decay when date & gift neglected; break-up at 0. */
export function tickRelationshipNeglect(state: GameState): GameState {
  if (!state.relationshipUnlocked) return state
  if (!state.hasPartner && !state.married) return state

  const last = state.lastLifePositiveSocialTick
  if (last <= 0) {
    return { ...state, lastLifePositiveSocialTick: state.tickCount }
  }

  const idle = state.tickCount - last
  if (idle <= LIFE_NEGLECT_GRACE_TICKS) return state
  if (idle % LIFE_NEGLECT_DECAY_INTERVAL !== 0) return state

  const aff = clamp(state.affection + LIFE_NEGLECT_AFFECTION_DELTA)
  const hap = clamp(state.happiness + LIFE_NEGLECT_HAPPINESS_DELTA)
  const next: GameState = { ...state, affection: aff, happiness: hap }
  if (aff <= 0 || hap <= 0) {
    return performRelationshipBreakup(next)
  }
  return next
}

export function tryMarry(state: GameState): GameState {
  if (!state.relationshipUnlocked) return state
  if (state.married || !state.hasPartner) return state
  if (state.affection < 80) return state
  const cost = effectiveMarriageCost(state)
  if (state.money < cost) return state
  return setNarratorFromKey(
    {
      ...state,
      money: state.money - cost,
      married: true,
      happiness: clamp(state.happiness + 12),
      loyalty: clamp(state.loyalty + 10),
      lastLifePositiveSocialTick: state.tickCount,
    },
    'life_marry',
  )
}

function startingCashAfterPrestige(state: GameState): number {
  return 650 + state.lifePrestigeMarried * 1200 + state.lifePrestigeSolo * 450
}

/** Solo prestige: ~18–24h+ target — minimum time gate + real empire traction. */
export function soloPrestigeProgressMet(state: GameState): boolean {
  if (state.married) return false
  if (state.tickCount < PRESTIGE_SOLO_MIN_TICKS) return false
  const terr = territoriesOwnedCount(state)
  const units = sumRecruitLevels(state) + sumBusinessLevels(state)
  if (state.power >= 42_000) return true
  if (state.money >= 4_500_000) return true
  if (terr >= 6) return true
  if (terr >= 4 && units >= 420) return true
  if (terr >= 3 && units >= 550) return true
  return false
}

/** Family prestige: heir path — long run + marriage + home + traction. */
export function familyPrestigeProgressMet(state: GameState): boolean {
  if (!state.married || !state.hasPartner) return false
  if (state.houseLevel < 2) return false
  if (state.tickCount < PRESTIGE_FAMILY_MIN_TICKS) return false
  const terr = territoriesOwnedCount(state)
  const units = sumRecruitLevels(state) + sumBusinessLevels(state)
  if (state.power >= 38_000) return true
  if (terr >= 5) return true
  if (terr >= 3 && units >= 480) return true
  return false
}

/** When the Life panel should show the Prestige block at all (avoid spoiling it day one). */
export function lifePanelShowsPrestige(state: GameState): boolean {
  if (state.lifePrestigeMarried + state.lifePrestigeSolo > 0) return true
  if (state.married) return true
  if (state.houseLevel >= 1) return true
  if (state.tickCount >= 10_800) return true
  if (territoriesOwnedCount(state) >= 2) return true
  return false
}

/** Full prestige reset after marriage — strongest permanent boost. */
export function performLifePrestigeChild(state: GameState): GameState {
  if (!familyPrestigeProgressMet(state)) return state

  const lifePrestigeMarried = state.lifePrestigeMarried + 1
  const next: GameState = {
    ...state,
    lifePrestigeMarried,
    achievementToastQueue: [],
    money: startingCashAfterPrestige({ ...state, lifePrestigeMarried }),
    power: 0,
    recruitLevels: {},
    businessLevels: {},
    territoriesOwned: {},
    passiveScale: 1,
    tickCount: 0,
    heat: 0,
    heatCrackdownEndTick: 0,
    heatCrackdownNonce: 0,
    heatCapGraceEndTick: 0,
    heatGracePeriodActive: false,
    heatMaxDebuffKind: null,
    heatWarningLatch: false,
    heatWarningSfxNonce: 0,
    lastManualHustleTick: 0,
    rivals: {},
    revengeTargetId: null,
    pendingRivalEncounter: null,
    rivalAttackCooldownTicks: 16,
    pendingEventId: null,
    pendingMinorStreetEventId: null,
    pausedMinorStreetEventId: null,
    pendingLifeEventId: null,
    pausedMinorLifeEventId: null,
    lifeEventHistory: [],
    secondsUntilEvent: randomEventCooldown(),
    secondsUntilLifeEvent: randomLifeCooldown(),
    age: 18,
    ageProgressPoints: 0,
    married: false,
    hasPartner: false,
    partnerName: '',
    affection: 0,
    loyalty: 0,
    happiness: 35,
    relationshipUnlocked: true,
    lifeSocialCooldownTicks: 0,
    lastLifePositiveSocialTick: 0,
    lifeGriefDebuffEndTick: 0,
    playerWarHp: 100,
    playerWarMaxHp: 100,
    warIncomingBlocks: 0,
    pendingWarStrike: null,
    gangWarRivalId: null,
    gangWarTargetTerritoryId: null,
    gangWarSmallWar: false,
    gangWarAttackUses: 0,
    gangWarDefendUses: 0,
    lifeEventForcedId: null,
    gangIntelRivalId: null,
    gangWarStrikePrepared: false,
    gangWarSurpriseDoublePending: false,
    housePlacements: {},
    housePlacementNonce: 0,
    dangerPulseNonce: 0,
    dangerCooldownRemaining: 0,
    titlePulseNonce: 0,
    businessUnlockHighlightNonce: 0,
    businessUnlockHighlightIds: [],
    streetLuckEndTick: 0,
    streetLuckMoneyMult: 2,
  }
  const nextWithTitle: GameState = { ...next, title: computePlayerTitle(next) }
  return setNarratorFromKey(nextWithTitle, 'life_prestige_child')
}

/** Weaker prestige reset without marriage. */
export function performLifePrestigeSolo(state: GameState): GameState {
  if (state.married) return state
  if (!soloPrestigeProgressMet(state)) return state

  const lifePrestigeSolo = state.lifePrestigeSolo + 1
  const next: GameState = {
    ...state,
    lifePrestigeSolo,
    achievementToastQueue: [],
    money: startingCashAfterPrestige({ ...state, lifePrestigeSolo }),
    power: 0,
    recruitLevels: {},
    businessLevels: {},
    territoriesOwned: {},
    passiveScale: 1,
    tickCount: 0,
    heat: 0,
    heatCrackdownEndTick: 0,
    heatCrackdownNonce: 0,
    heatCapGraceEndTick: 0,
    heatGracePeriodActive: false,
    heatMaxDebuffKind: null,
    heatWarningLatch: false,
    heatWarningSfxNonce: 0,
    lastManualHustleTick: 0,
    rivals: {},
    revengeTargetId: null,
    pendingRivalEncounter: null,
    rivalAttackCooldownTicks: 16,
    pendingEventId: null,
    pendingMinorStreetEventId: null,
    pausedMinorStreetEventId: null,
    pendingLifeEventId: null,
    pausedMinorLifeEventId: null,
    lifeEventHistory: [],
    secondsUntilEvent: randomEventCooldown(),
    secondsUntilLifeEvent: randomLifeCooldown(),
    age: 18,
    ageProgressPoints: 0,
    married: false,
    hasPartner: false,
    partnerName: '',
    affection: 0,
    loyalty: 0,
    happiness: 28,
    relationshipUnlocked: true,
    lifeSocialCooldownTicks: 0,
    lastLifePositiveSocialTick: 0,
    lifeGriefDebuffEndTick: 0,
    playerWarHp: 100,
    playerWarMaxHp: 100,
    warIncomingBlocks: 0,
    pendingWarStrike: null,
    gangWarRivalId: null,
    gangWarTargetTerritoryId: null,
    gangWarSmallWar: false,
    gangWarAttackUses: 0,
    gangWarDefendUses: 0,
    lifeEventForcedId: null,
    gangIntelRivalId: null,
    gangWarStrikePrepared: false,
    gangWarSurpriseDoublePending: false,
    housePlacements: {},
    housePlacementNonce: 0,
    dangerPulseNonce: 0,
    dangerCooldownRemaining: 0,
    titlePulseNonce: 0,
    businessUnlockHighlightNonce: 0,
    businessUnlockHighlightIds: [],
    streetLuckEndTick: 0,
    streetLuckMoneyMult: 2,
  }
  const nextWithTitle: GameState = { ...next, title: computePlayerTitle(next) }
  return setNarratorFromKey(nextWithTitle, 'life_prestige_solo')
}

export function applyLifeStatDeltasFromChoice(state: GameState, choice: EventChoiceDef): GameState {
  let next = state
  if (choice.unlocksRelationship) {
    next = { ...next, relationshipUnlocked: true }
  }
  if (choice.affectionDelta !== undefined) {
    next = { ...next, affection: clamp(next.affection + choice.affectionDelta) }
  }
  if (choice.loyaltyDelta !== undefined) {
    next = { ...next, loyalty: clamp(next.loyalty + choice.loyaltyDelta) }
  }
  if (choice.happinessDelta !== undefined) {
    next = { ...next, happiness: clamp(next.happiness + choice.happinessDelta) }
  }
  if (next.relationshipUnlocked && !next.hasPartner && next.affection >= 32) {
    next = {
      ...next,
      hasPartner: true,
      partnerName: next.partnerName || randPartnerName(),
      lastLifePositiveSocialTick: next.tickCount,
    }
  }
  return next
}
