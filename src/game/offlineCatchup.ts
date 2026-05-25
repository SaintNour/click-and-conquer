import type { GameState } from '../data/types'
import {
  OFFLINE_INCOME_EFFICIENCY,
  OFFLINE_INCOME_SECONDS_CAP,
  OFFLINE_REPORT_MIN_MONEY,
  OFFLINE_REPORT_MIN_POWER,
} from './balanceConfig'
import { passiveMoneyPerSecond, passivePowerPerSecond } from './compute'

/** Strip temporary luck so offline math matches a “normal” economy slice. */
function stateForOfflineRates(state: GameState): GameState {
  return { ...state, streetLuckEndTick: 0 }
}

/**
 * Credit passive money/power for time away (capped). Sets `lastSessionEndedAtMs` to now.
 * Idempotent per load: call once when hydrating from storage.
 */
export function applyOfflineCatchup(state: GameState): GameState {
  const now = Date.now()
  const prev = state.lastSessionEndedAtMs
  if (prev <= 0) {
    return { ...state, lastSessionEndedAtMs: now }
  }
  const elapsedSec = Math.min(
    OFFLINE_INCOME_SECONDS_CAP,
    Math.max(0, Math.floor((now - prev) / 1000)),
  )
  if (elapsedSec < 12) {
    return { ...state, lastSessionEndedAtMs: now }
  }

  const ghost = stateForOfflineRates(state)
  const mps = passiveMoneyPerSecond(ghost)
  const pps = passivePowerPerSecond(ghost)
  const eff = OFFLINE_INCOME_EFFICIENCY
  const gainM = Math.floor(mps * elapsedSec * eff)
  const gainP = pps * elapsedSec * eff

  let next: GameState = {
    ...state,
    money: state.money + gainM,
    power: state.power + gainP,
    lastSessionEndedAtMs: now,
  }

  const show = gainM >= OFFLINE_REPORT_MIN_MONEY || Math.floor(gainP) >= OFFLINE_REPORT_MIN_POWER
  if (show) {
    const mins = Math.round(elapsedSec / 60)
    const pct = Math.round(eff * 100)
    next = {
      ...next,
      eventOutcomeBanner: {
        title: 'While you were away',
        detail: `About ${mins}m offline · +$${gainM.toLocaleString()} cash · +${gainP >= 10 ? Math.floor(gainP).toLocaleString() : gainP.toFixed(1)} power (${pct}% passive rate).`,
        variant: 'neutral',
      },
    }
  }

  return next
}
