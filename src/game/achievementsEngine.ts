import { ACHIEVEMENTS, achievementById } from '../data/achievements'
import { MEET_GIRLFRIEND_LIFE_EVENT_ID } from '../data/lifeEvents'
import type { AchievementDef } from '../data/achievementTypes'
import { BUSINESSES } from '../data/businesses'
import { RECRUITS } from '../data/recruits'
import { countTerritoriesOwned } from '../data/territories'
import type { AchievementStats, GameState } from '../data/types'
import { setNarratorFromKey } from './narrator'

export function createDefaultAchievementStats(): AchievementStats {
  return {
    totalClicks: 0,
    clickMsRing: [],
    clicksSincePurchase: 0,
    totalPurchases: 0,
    lastClickMs: Date.now(),
    consecutiveIdleSeconds: 0,
    peakIdleSeconds: 0,
    territoryFailCount: 0,
    eventsResolved: 0,
    rainUmbrellasTaken: false,
    influencerYesTaken: false,
    rivalEliminations: 0,
    relationshipBreakups: 0,
    eggMidnightTrain: false,
    eggTrustLedger: false,
    eggRomanceChaos: false,
    eggStreetWhisper: false,
    playerWarMeltdowns: 0,
  }
}

export type AchievementBonusMultipliers = {
  allMoney: number
  allPower: number
  clickMoney: number
  clickPower: number
  passiveMoney: number
  passivePower: number
  /** Applied to business-sourced money (click + passive from businesses). */
  businessIncome: number
}

export function getAchievementBonusMultipliers(state: GameState): AchievementBonusMultipliers {
  const z: AchievementBonusMultipliers = {
    allMoney: 1,
    allPower: 1,
    clickMoney: 1,
    clickPower: 1,
    passiveMoney: 1,
    passivePower: 1,
    businessIncome: 1,
  }
  for (const a of ACHIEVEMENTS) {
    if (!state.achievementsUnlocked[a.id]) continue
    const r = a.reward
    if (r.allMoneyMult) z.allMoney *= r.allMoneyMult
    if (r.allPowerMult) z.allPower *= r.allPowerMult
    if (r.clickMoneyMult) z.clickMoney *= r.clickMoneyMult
    if (r.clickPowerMult) z.clickPower *= r.clickPowerMult
    if (r.passiveMoneyMult) z.passiveMoney *= r.passiveMoneyMult
    if (r.passivePowerMult) z.passivePower *= r.passivePowerMult
    if (r.businessIncomeMult) z.businessIncome *= r.businessIncomeMult
  }
  return z
}

function sumRecruitLevels(state: GameState): number {
  return RECRUITS.reduce((s, r) => s + (state.recruitLevels[r.id] ?? 0), 0)
}

function sumBusinessLevels(state: GameState): number {
  return BUSINESSES.reduce((s, b) => s + (state.businessLevels[b.id] ?? 0), 0)
}

function territoriesCaptured(state: GameState): number {
  return countTerritoriesOwned(state.territoriesOwned)
}

function shopUpgradePurchaseCount(state: GameState): number {
  return Object.values(state.shopUpgradesPurchased).filter(Boolean).length
}

function evaluateAchievement(def: AchievementDef, state: GameState): boolean {
  const st = state.achievementStats
  const arg = def.predicateArg
  const now = Date.now()

  switch (def.predicateId) {
    case 'money_gte':
      return state.money >= (arg as number)
    case 'power_gte':
      return state.power >= (arg as number)
    case 'total_recruit_levels_gte':
      return sumRecruitLevels(state) >= (arg as number)
    case 'sum_business_levels_gte':
      return sumBusinessLevels(state) >= (arg as number)
    case 'recruit_gte': {
      const { recruitId, n } = arg as { recruitId: string; n: number }
      return (state.recruitLevels[recruitId] ?? 0) >= n
    }
    case 'business_gte': {
      const { businessId, n } = arg as { businessId: string; n: number }
      return (state.businessLevels[businessId] ?? 0) >= n
    }
    case 'territories_captured_gte':
      return territoriesCaptured(state) >= (arg as number)
    case 'total_clicks_gte':
      return st.totalClicks >= (arg as number)
    case 'shop_upgrades_purchased_gte':
      return shopUpgradePurchaseCount(state) >= (arg as number)
    case 'events_resolved_gte':
      return st.eventsResolved >= (arg as number)
    case 'territory_fail_gte':
      return st.territoryFailCount >= (arg as number)
    case 'danger_nonce_gte':
      return state.dangerPulseNonce >= (arg as number)
    case 'flag_rain_umbrellas':
      return st.rainUmbrellasTaken
    case 'flag_influencer_yes':
      return st.influencerYesTaken
    case 'hidden_click_frenzy': {
      const windowMs = 8000
      const need = 22
      const recent = st.clickMsRing.filter((t) => t > now - windowMs)
      return recent.length >= need
    }
    case 'hidden_obsessed': {
      const windowMs = 15000
      const need = 40
      const recent = st.clickMsRing.filter((t) => t > now - windowMs)
      return recent.length >= need
    }
    case 'hidden_no_strategy':
      return st.totalClicks >= 450 && st.totalPurchases <= 1
    case 'hidden_patience':
      return st.consecutiveIdleSeconds >= 72
    case 'rival_eliminations_gte':
      return (st.rivalEliminations ?? 0) >= (arg as number)
    case 'relationship_breakups_gte':
      return (st.relationshipBreakups ?? 0) >= (arg as number)
    case 'player_war_meltdowns_gte':
      return (st.playerWarMeltdowns ?? 0) >= (arg as number)
    case 'house_level_gte':
      return state.houseLevel >= (arg as number)
    case 'flag_egg_midnight_train':
      return st.eggMidnightTrain === true
    case 'flag_egg_trust_ledger':
      return st.eggTrustLedger === true
    case 'flag_egg_romance_chaos':
      return st.eggRomanceChaos === true
    case 'flag_egg_street_whisper':
      return st.eggStreetWhisper === true
    case 'sum_units_gte':
      return sumRecruitLevels(state) + sumBusinessLevels(state) >= (arg as number)
    default:
      return false
  }
}

function narratorKeyForAchievement(def: AchievementDef): string {
  if (def.hidden) return 'achievement_hidden_unlock'
  switch (def.category) {
    case 'economy':
      return 'achievement_economy'
    case 'power':
      return 'achievement_power'
    case 'units':
      return 'achievement_units'
    case 'businesses':
      return 'achievement_businesses'
    case 'territories':
      return 'achievement_territories'
    case 'rivals':
      return 'achievement_rivals'
    default:
      return 'achievement_special'
  }
}

export function processAchievements(state: GameState): GameState {
  const newly: string[] = []
  for (const def of ACHIEVEMENTS) {
    if (state.achievementsUnlocked[def.id]) continue
    if (!evaluateAchievement(def, state)) continue
    newly.push(def.id)
  }
  if (newly.length === 0) return state

  const achievementsUnlocked = { ...state.achievementsUnlocked }
  for (const id of newly) achievementsUnlocked[id] = true

  let next: GameState = {
    ...state,
    achievementsUnlocked,
    achievementToastQueue: [...state.achievementToastQueue, ...newly],
  }

  const first = achievementById(newly[0])
  if (first) {
    next = setNarratorFromKey(next, narratorKeyForAchievement(first))
  }
  return next
}

export function patchAchievementStatsOnClick(state: GameState): GameState {
  const now = Date.now()
  const ring = [...state.achievementStats.clickMsRing, now].slice(-48)
  return {
    ...state,
    achievementStats: {
      ...state.achievementStats,
      totalClicks: state.achievementStats.totalClicks + 1,
      clickMsRing: ring,
      clicksSincePurchase: state.achievementStats.clicksSincePurchase + 1,
      lastClickMs: now,
      consecutiveIdleSeconds: 0,
    },
  }
}

export function patchAchievementStatsOnTick(state: GameState): GameState {
  const now = Date.now()
  const last = state.achievementStats.lastClickMs
  const idleGap = now - last > 1500
  const consec = idleGap ? state.achievementStats.consecutiveIdleSeconds + 1 : 0
  const peak = Math.max(state.achievementStats.peakIdleSeconds, consec)
  return {
    ...state,
    achievementStats: {
      ...state.achievementStats,
      consecutiveIdleSeconds: consec,
      peakIdleSeconds: peak,
    },
  }
}

export function patchAchievementStatsOnPurchase(state: GameState): GameState {
  return {
    ...state,
    achievementStats: {
      ...state.achievementStats,
      totalPurchases: state.achievementStats.totalPurchases + 1,
      clicksSincePurchase: 0,
    },
  }
}

export function patchAchievementStatsTerritoryFail(state: GameState): GameState {
  return {
    ...state,
    achievementStats: {
      ...state.achievementStats,
      territoryFailCount: state.achievementStats.territoryFailCount + 1,
    },
  }
}

export function patchAchievementStatsEventResolved(
  state: GameState,
  eventId: string,
  choiceId: string,
): GameState {
  let rain = state.achievementStats.rainUmbrellasTaken
  let inf = state.achievementStats.influencerYesTaken
  let eggMidnightTrain = state.achievementStats.eggMidnightTrain
  let eggTrustLedger = state.achievementStats.eggTrustLedger
  let eggRomanceChaos = state.achievementStats.eggRomanceChaos
  let eggStreetWhisper = state.achievementStats.eggStreetWhisper
  if (eventId === 'rain' && choiceId === 'umbrellas') rain = true
  if (eventId === 'influencer' && choiceId === 'yes') inf = true
  if (eventId === 'life_tier1_boxes' && choiceId === 'egg_train') eggMidnightTrain = true
  if (eventId === 'life_tier1_loose_change' && choiceId === 'egg_coin') eggTrustLedger = true
  if (
    (eventId === 'life_meet_someone' || eventId === MEET_GIRLFRIEND_LIFE_EVENT_ID) &&
    choiceId === 'egg_smile'
  )
    eggRomanceChaos = true
  if (eventId === 'tip' && choiceId === 'egg_whisper') eggStreetWhisper = true
  return {
    ...state,
    achievementStats: {
      ...state.achievementStats,
      eventsResolved: state.achievementStats.eventsResolved + 1,
      rainUmbrellasTaken: rain,
      influencerYesTaken: inf,
      eggMidnightTrain,
      eggTrustLedger,
      eggRomanceChaos,
      eggStreetWhisper,
    },
  }
}

export function shiftAchievementToastQueue(state: GameState): GameState {
  const [, ...rest] = state.achievementToastQueue
  return { ...state, achievementToastQueue: rest }
}

/** Visible achievements count (non-hidden defs). */
export function visibleAchievementTotal(): number {
  return ACHIEVEMENTS.filter((a) => !a.hidden).length
}

export function unlockedAchievementCount(state: GameState): number {
  return Object.values(state.achievementsUnlocked).filter(Boolean).length
}
