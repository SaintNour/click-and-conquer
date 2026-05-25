import { BUSINESSES } from '../data/businesses'
import { RECRUITS } from '../data/recruits'
import { countTerritoriesOwned } from '../data/territories'
import type { GameState } from '../data/types'
import {
  AUTO_HUSTLE_CAP,
  AUTO_HUSTLE_MIN_RECRUIT_LEVELS,
  AUTO_HUSTLE_PER_SQRT_CREW,
} from './balanceConfig'
import { passiveEconomyDragMultiplier } from './economyScaling'
import { PASSIVE_SCALE_CAP } from './constants'
import { getAchievementBonusMultipliers } from './achievementsEngine'
import { lifeMoneyMultiplier, lifePowerMultiplier } from './lifeEngine'
import {
  earlySessionClickMoneyMult,
  earlySessionClickPowerMult,
  hiddenMoneyMomentum,
  hiddenPowerMomentum,
} from './progressionMomentum'
import {
  heatCrackdownIncomeMultiplier,
  heatCrackdownPowerGainMultiplier,
} from './heatCrackdownEngine'
import { heatIncomeBonusMultiplier, heatRecruitPowerEfficiency } from './heatSynergy'
import {
  territoryEmpireSynergyMoneyMult,
  territoryEmpireSynergyPowerMult,
} from './synergyModifiers'
import {
  businessMoneyMultiplier,
  globalIncomeMultipliers,
  recruitPowerMultiplier,
} from './shopUpgradeEngine'
import { totalEmpireScaleMultiplier } from './empireMultiplierSources'
import { sumRecruitLevels } from './progressionMomentum'

const RIVAL_INCOME_MULT_CAP = 1.12

/** Temporary cash surge (Cookie-style); 1 when inactive. */
export function streetLuckMoneyMultiplier(state: GameState): number {
  if (state.streetLuckEndTick <= 0) return 1
  return state.tickCount < state.streetLuckEndTick ? state.streetLuckMoneyMult : 1
}

/** Automatic Hustle presses per second from crew depth (does not increment click achievements). */
export function autoHustleClicksPerSecond(state: GameState): number {
  const crew = sumRecruitLevels(state)
  if (crew < AUTO_HUSTLE_MIN_RECRUIT_LEVELS) return 0
  return Math.min(AUTO_HUSTLE_CAP, AUTO_HUSTLE_PER_SQRT_CREW * Math.sqrt(crew))
}

function rivalIncomeMultiplier(state: GameState): number {
  return Math.min(RIVAL_INCOME_MULT_CAP, Math.max(1, state.rivalIncomeMult))
}

export function clampPassiveScale(scale: number): number {
  return Math.min(PASSIVE_SCALE_CAP, Math.max(1, scale))
}

export function totalPowerFromRecruits(state: GameState): number {
  return RECRUITS.reduce((sum, r) => {
    const lv = state.recruitLevels[r.id] ?? 0
    const m = recruitPowerMultiplier(state, r.id)
    const persona = r.clickPowerPersonaMult ?? 1
    return sum + lv * r.powerPerClick * m * persona
  }, 0)
}

export function totalMoneyFromBusinesses(state: GameState): number {
  return BUSINESSES.reduce((sum, b) => {
    const lv = state.businessLevels[b.id] ?? 0
    const m = businessMoneyMultiplier(state, b.id)
    return sum + lv * b.moneyPerClick * m
  }, 0)
}

export function passivePowerPerSecond(state: GameState): number {
  const base = RECRUITS.reduce((sum, r) => {
    const lv = state.recruitLevels[r.id] ?? 0
    const m = recruitPowerMultiplier(state, r.id)
    const persona = r.passivePowerPersonaMult ?? 1
    return sum + lv * r.powerPerSecond * m * persona
  }, 0)
  const g = globalIncomeMultipliers(state)
  const ach = getAchievementBonusMultipliers(state)
  return (
    base *
    totalEmpireScaleMultiplier(state) *
    g.passivePower *
    g.allPower *
    hiddenPowerMomentum(state) *
    ach.allPower *
    ach.passivePower *
    lifePowerMultiplier(state) *
    territoryEmpireSynergyPowerMult(state) *
    heatCrackdownPowerGainMultiplier(state) *
    heatRecruitPowerEfficiency(state.heat) *
    passiveEconomyDragMultiplier(state)
  )
}

export function passiveMoneyPerSecond(state: GameState): number {
  const base = BUSINESSES.reduce((sum, b) => {
    const lv = state.businessLevels[b.id] ?? 0
    const m = businessMoneyMultiplier(state, b.id)
    return sum + lv * b.moneyPerSecond * m
  }, 0)
  const g = globalIncomeMultipliers(state)
  const ach = getAchievementBonusMultipliers(state)
  return (
    base *
    totalEmpireScaleMultiplier(state) *
    g.passiveMoney *
    g.allMoney *
    hiddenMoneyMomentum(state) *
    ach.allMoney *
    ach.passiveMoney *
    ach.businessIncome *
    rivalIncomeMultiplier(state) *
    lifeMoneyMultiplier(state) *
    heatCrackdownIncomeMultiplier(state) *
    heatIncomeBonusMultiplier(state.heat) *
    territoryEmpireSynergyMoneyMult(state) *
    streetLuckMoneyMultiplier(state) *
    passiveEconomyDragMultiplier(state)
  )
}

/** Base + businesses + shop multipliers; empire scale from progression + events (not click spam). */
export function clickMoneyAmount(state: GameState): number {
  const biz = totalMoneyFromBusinesses(state)
  const ach = getAchievementBonusMultipliers(state)
  const base = 1 + biz * ach.businessIncome
  const g = globalIncomeMultipliers(state)
  return (
    base *
    totalEmpireScaleMultiplier(state) *
    g.clickMoney *
    g.allMoney *
    hiddenMoneyMomentum(state) *
    ach.allMoney *
    ach.clickMoney *
    rivalIncomeMultiplier(state) *
    lifeMoneyMultiplier(state) *
    earlySessionClickMoneyMult(state) *
    heatCrackdownIncomeMultiplier(state) *
    heatIncomeBonusMultiplier(state.heat) *
    territoryEmpireSynergyMoneyMult(state) *
    streetLuckMoneyMultiplier(state)
  )
}

export function clickPowerAmount(state: GameState): number {
  const base = 1 + totalPowerFromRecruits(state)
  const g = globalIncomeMultipliers(state)
  const ach = getAchievementBonusMultipliers(state)
  return (
    base *
    totalEmpireScaleMultiplier(state) *
    g.clickPower *
    g.allPower *
    hiddenPowerMomentum(state) *
    ach.allPower *
    ach.clickPower *
    lifePowerMultiplier(state) *
    earlySessionClickPowerMult(state) *
    territoryEmpireSynergyPowerMult(state) *
    heatCrackdownPowerGainMultiplier(state) *
    heatRecruitPowerEfficiency(state.heat)
  )
}

export function territoriesOwnedCount(state: GameState): number {
  return countTerritoriesOwned(state.territoriesOwned)
}

/**
 * Progression title from territories + power (and light passive scale for late game).
 * Tuned so early lifts feel fast; top tiers need real empire scale.
 */
export function computePlayerTitle(state: GameState): string {
  const t = territoriesOwnedCount(state)
  const p = state.power
  const es = totalEmpireScaleMultiplier(state)
  if (t >= 12 || p >= 120_000 || es >= 2.2) return 'Empire'
  if (t >= 8 || p >= 55_000 || (t >= 6 && p >= 40_000)) return 'City King'
  if (t >= 5 || p >= 22_000 || (t >= 4 && p >= 16_000)) return 'District Boss'
  if (t >= 2 || p >= 5_500 || (t >= 1 && p >= 3_200)) return 'Block Controller'
  if (t >= 1 || p >= 450 || es >= 1.12) return 'Small Operator'
  return 'Street Nobody'
}
