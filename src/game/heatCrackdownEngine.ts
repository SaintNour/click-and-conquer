import type { GameState, HeatMaxDebuffKind } from '../data/types'
import {
  HEAT_CAP,
  HEAT_CRACKDOWN_INCOME_MULT,
  HEAT_CRACKDOWN_INCOME_WEALTH_PINCH,
  HEAT_CRACKDOWN_MONEY_LOSS_MAX,
  HEAT_CRACKDOWN_MONEY_LOSS_MIN,
  HEAT_CRACKDOWN_POWER_LOSS_MAX,
  HEAT_CRACKDOWN_POWER_LOSS_MIN,
  HEAT_CRACKDOWN_WEALTH_MONEY_STRESS,
  HEAT_CRACKDOWN_WEALTH_POWER_STRESS,
  HEAT_DEBUFF_DURATION_MAX_TICKS,
  HEAT_DEBUFF_DURATION_MIN_TICKS,
  HEAT_RESET_AFTER_TRIGGER,
  HEAT_RIVAL_ATTACK_MULT_DURING_CRACKDOWN,
} from './balanceConfig'
import { economyWealthPressure01 } from './economyScaling'

export function isHeatCapGraceActive(state: GameState): boolean {
  return state.heatCapGraceEndTick > state.tickCount
}

/** True while heat is at cap and the grace countdown runs before the random crackdown roll. */
export function isHeatGracePeriod(state: GameState): boolean {
  return isHeatCapGraceActive(state) && state.heat >= HEAT_CAP - 0.001
}

const DEBUFF_KINDS: HeatMaxDebuffKind[] = ['police', 'surveillance', 'freeze', 'shakedown', 'audit']

function effectiveDebuffKind(state: GameState): HeatMaxDebuffKind | null {
  if (state.heatCrackdownEndTick <= state.tickCount) return null
  return state.heatMaxDebuffKind ?? 'police'
}

function incomeMultForKind(state: GameState, kind: HeatMaxDebuffKind): number {
  const w = economyWealthPressure01(state)
  const pinch = 1 - w * HEAT_CRACKDOWN_INCOME_WEALTH_PINCH
  switch (kind) {
    case 'police':
      return Math.max(0.38, HEAT_CRACKDOWN_INCOME_MULT * pinch)
    case 'surveillance':
      return Math.max(0.36, 0.72 * pinch)
    case 'freeze':
      return Math.max(0.42, 0.78 * pinch)
    case 'shakedown':
      return Math.max(0.38, 0.74 * pinch)
    case 'audit':
      return Math.max(0.44, 0.8 * pinch)
    default:
      return Math.max(0.38, HEAT_CRACKDOWN_INCOME_MULT * pinch)
  }
}

function rivalMultForKind(state: GameState, kind: HeatMaxDebuffKind): number {
  const w = economyWealthPressure01(state)
  const bump = 1 + w * 0.35
  switch (kind) {
    case 'police':
      return HEAT_RIVAL_ATTACK_MULT_DURING_CRACKDOWN * bump
    case 'surveillance':
      return 1.72 * bump
    case 'freeze':
      return 1.28 * bump
    case 'shakedown':
      return 1.42 * bump
    case 'audit':
      return 1.22 * bump
    default:
      return HEAT_RIVAL_ATTACK_MULT_DURING_CRACKDOWN * bump
  }
}

function powerGainMultForKind(kind: HeatMaxDebuffKind): number {
  return kind === 'freeze' ? 0.78 : 1
}

/** Pegged at max heat during the grace window — same economic bite as asset-freeze debuff. */
function maxHeatGracePenaltyActive(state: GameState): boolean {
  return isHeatGracePeriod(state)
}

const PENALTY_COPY: Record<HeatMaxDebuffKind, { title: string; lines: readonly string[] }> = {
  police: {
    title: 'Police crackdown',
    lines: [
      'Too much heat. Authorities and rivals are watching you.',
      'Patrols tighten and your name is on whisper lists.',
      'You pushed visibility past the line—time to cool off before the next score.',
    ],
  },
  surveillance: {
    title: 'Open surveillance',
    lines: [
      'No raid—just eyes. Your corners feel smaller and your phone feels heavier.',
      'They let you breathe on purpose. That is the scary part.',
      'Paper trails multiply when nobody kicks the door—yet.',
    ],
  },
  freeze: {
    title: 'Asset freeze',
    lines: [
      'Accounts wobble; muscle goes shy. The street still wants work—you just pay more friction.',
      'Liquidity pretends to nap. Your crew tightens belts without being asked.',
      'A cold snap on cash flow: not broke—just slowed where it hurts.',
    ],
  },
  shakedown: {
    title: 'Street shakedown',
    lines: [
      'Hands in pockets that are not yours. The tax is rude and immediate.',
      'Protection without the poetry—just invoices written in bruises.',
      'You pay to keep the sidewalk from filing a complaint against you.',
    ],
  },
  audit: {
    title: 'Paper audit',
    lines: [
      'Someone with a stamp decided your math looks “interesting.”',
      'Compliance cosplay with teeth: slow you down and bill you for the lesson.',
      'The boring kind of heat—until the fines land.',
    ],
  },
}

/** True while income / penalty debuff from max heat is active. */
export function isHeatCrackdownActive(state: GameState): boolean {
  return state.heatCrackdownEndTick > state.tickCount
}

/** Multiplier on click + passive money during max-heat penalty. */
export function heatCrackdownIncomeMultiplier(state: GameState): number {
  if (maxHeatGracePenaltyActive(state)) return incomeMultForKind(state, 'freeze')
  const kind = effectiveDebuffKind(state)
  if (!kind) return 1
  return incomeMultForKind(state, kind)
}

/** Extra multiplier on rival pressure rolls during penalty. */
export function heatCrackdownRivalPressureMult(state: GameState): number {
  if (maxHeatGracePenaltyActive(state)) return rivalMultForKind(state, 'freeze')
  const kind = effectiveDebuffKind(state)
  if (!kind) return 1
  return rivalMultForKind(state, kind)
}

/** Multiplier on click + passive power from recruits (freeze penalty). */
export function heatCrackdownPowerGainMultiplier(state: GameState): number {
  if (maxHeatGracePenaltyActive(state)) return powerGainMultForKind('freeze')
  const kind = effectiveDebuffKind(state)
  if (!kind) return 1
  return powerGainMultForKind(kind)
}

const HUD_LABEL: Record<HeatMaxDebuffKind, string> = {
  police: 'Crackdown',
  surveillance: 'Watchers',
  freeze: 'Freeze',
  shakedown: 'Shakedown',
  audit: 'Audit',
}

/** HUD label + tooltip for the active max-heat penalty. */
export function heatMaxDebuffHud(state: GameState): {
  label: string
  title: string
  meta: string
} | null {
  if (isHeatCrackdownActive(state)) {
    const kind = effectiveDebuffKind(state)!
    const sec = Math.max(0, state.heatCrackdownEndTick - state.tickCount)
    const incomeMult = incomeMultForKind(state, kind)
    const incPct = Math.round((1 - incomeMult) * 100)
    const powMult = powerGainMultForKind(kind)
    const powPct = kind === 'freeze' ? Math.round((1 - powMult) * 100) : 0
    const base = PENALTY_COPY[kind]
    const meta =
      kind === 'freeze'
        ? `−${incPct}% income · −${powPct}% crew power · ${sec}s`
        : `−${incPct}% income · ${sec}s`
    return {
      label: HUD_LABEL[kind],
      title: `${base.title} — temporary penalty from max heat.`,
      meta,
    }
  }
  if (maxHeatGracePenaltyActive(state)) {
    const sec = Math.max(0, state.heatCapGraceEndTick - state.tickCount)
    const incPct = Math.round((1 - incomeMultForKind(state, 'freeze')) * 100)
    const powPct = Math.round((1 - powerGainMultForKind('freeze')) * 100)
    return {
      label: 'Max heat',
      title: 'You are pinned at max heat — payouts slow until the crackdown clock finishes.',
      meta: `−${incPct}% income · −${powPct}% crew power · ${sec}s`,
    }
  }
  return null
}

/**
 * After heat sat at cap for HEAT_CAP_GRACE_TICKS: apply one random penalty (resource hit + timed debuff + heat drop).
 * Caller should clear heatCapGraceEndTick before calling if grace just ended.
 */
export function applyRandomHeatMaxPenalty(state: GameState): GameState {
  const kind = DEBUFF_KINDS[Math.floor(Math.random() * DEBUFF_KINDS.length)]!
  const w = economyWealthPressure01(state)
  let debuffTicks =
    HEAT_DEBUFF_DURATION_MIN_TICKS +
    Math.floor(
      Math.random() * (HEAT_DEBUFF_DURATION_MAX_TICKS - HEAT_DEBUFF_DURATION_MIN_TICKS + 1),
    )
  debuffTicks += Math.floor(w * 55)

  let money = state.money
  let power = state.power

  const moneyStress = 1 + w * HEAT_CRACKDOWN_WEALTH_MONEY_STRESS
  const powerStress = HEAT_CRACKDOWN_WEALTH_POWER_STRESS * (0.55 + w * 0.45)

  const takeMoney = (min: number, max: number) => {
    const pct = Math.min(0.58, (min + Math.random() * (max - min)) * moneyStress)
    money = Math.max(0, Math.floor(money * (1 - pct)))
  }
  const takePower = (lo: number, hi: number) => {
    const loS = Math.floor(lo * powerStress + w * Math.sqrt(state.money / 140_000))
    const hiS = Math.floor(hi * powerStress + w * Math.sqrt(state.money / 95_000))
    const a = Math.max(0, loS)
    const b = Math.max(a, hiS)
    const n = a + Math.floor(Math.random() * (b - a + 1))
    power = Math.max(0, power - n)
  }

  switch (kind) {
    case 'police':
      takeMoney(HEAT_CRACKDOWN_MONEY_LOSS_MIN, HEAT_CRACKDOWN_MONEY_LOSS_MAX)
      takePower(HEAT_CRACKDOWN_POWER_LOSS_MIN, HEAT_CRACKDOWN_POWER_LOSS_MAX)
      break
    case 'surveillance':
      break
    case 'freeze':
      takeMoney(0.05, 0.1)
      takePower(25, 48)
      break
    case 'shakedown':
      takeMoney(0.18, 0.28)
      takePower(5, 14)
      break
    case 'audit':
      takeMoney(0.12, 0.22)
      break
    default:
      takeMoney(HEAT_CRACKDOWN_MONEY_LOSS_MIN, HEAT_CRACKDOWN_MONEY_LOSS_MAX)
      takePower(HEAT_CRACKDOWN_POWER_LOSS_MIN, HEAT_CRACKDOWN_POWER_LOSS_MAX)
  }

  const copy = PENALTY_COPY[kind]
  const detail = copy.lines[Math.floor(Math.random() * copy.lines.length)]!

  return {
    ...state,
    money,
    power,
    heat: HEAT_RESET_AFTER_TRIGGER,
    heatCapGraceEndTick: 0,
    heatGracePeriodActive: false,
    heatMaxDebuffKind: kind,
    heatCrackdownEndTick: state.tickCount + debuffTicks,
    heatCrackdownNonce: state.heatCrackdownNonce + 1,
    heatWarningLatch: false,
    avatarReactionNonce: state.avatarReactionNonce + 1,
    avatarReactionKind: 'danger',
    eventOutcomeBanner: {
      title: copy.title,
      detail,
      variant: 'heat-crackdown',
    },
  }
}

/** Clear debuff marker once expired (keeps saves tidy). */
export function clearExpiredHeatCrackdown(state: GameState): GameState {
  if (state.heatCrackdownEndTick <= 0) return state
  if (state.tickCount < state.heatCrackdownEndTick) return state
  return { ...state, heatCrackdownEndTick: 0, heatMaxDebuffKind: null }
}
