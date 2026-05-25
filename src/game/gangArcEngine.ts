import type { GameState } from '../data/types'
import type { EventChoiceDef } from '../data/types'
import {
  pickRivalForGangWarTarget,
  ensureRivals,
  escalateRelationship,
  isRivalEliminationEligible,
} from './rivalsEngine'
import type { RivalRelationship } from '../data/rivalTypes'
import { setNarratorFromKey } from './narrator'

export const GANG_RUMOR_EVENT_ID = 'life_gang_rumor'
export const GANG_DEMAND_EVENT_ID = 'life_gang_leader_demand'
/** Ticks until the follow-up demand event fires (sequence pacing). */
export const GANG_CHAIN_LIFE_DELAY_TICKS = 14

function scheduleGangDemand(state: GameState): GameState {
  return {
    ...state,
    lifeEventForcedId: GANG_DEMAND_EVENT_ID,
    secondsUntilLifeEvent: Math.min(state.secondsUntilLifeEvent, GANG_CHAIN_LIFE_DELAY_TICKS),
  }
}

function escalateTwice(rel: RivalRelationship): RivalRelationship {
  let r = rel
  for (let i = 0; i < 2; i++) {
    const n = escalateRelationship(r)
    if (n === r) break
    r = n
  }
  return r
}

/** After rumor life event resolves (spy / prepare / ignore). */
export function applyGangRumorAftermath(state: GameState, choice: EventChoiceDef): GameState {
  if (choice.id === 'spy') {
    const intel = Math.random() < 0.52
    let s = ensureRivals(state)
    if (intel) {
      const id = pickRivalForGangWarTarget(s)
      s = id
        ? setNarratorFromKey({ ...s, gangIntelRivalId: id }, 'life_gang_spy_win')
        : setNarratorFromKey({ ...s, gangIntelRivalId: null }, 'life_gang_spy_fail')
    } else {
      s = setNarratorFromKey({ ...s, gangIntelRivalId: null }, 'life_gang_spy_fail')
    }
    return scheduleGangDemand(s)
  }
  if (choice.id === 'prepare') {
    return scheduleGangDemand(
      setNarratorFromKey(
        { ...state, gangWarStrikePrepared: true, gangWarSurpriseDoublePending: false },
        'life_gang_prepare',
      ),
    )
  }
  if (choice.id === 'ignore') {
    return scheduleGangDemand(
      setNarratorFromKey(
        { ...state, gangWarSurpriseDoublePending: true, gangWarStrikePrepared: false },
        'life_gang_ignore',
      ),
    )
  }
  return scheduleGangDemand(state)
}

export function beginGangWarArc(state: GameState, preferredId: string | null): GameState {
  const s = ensureRivals(state)
  const id =
    preferredId && s.rivals[preferredId] && s.rivals[preferredId]!.alive !== false
      ? preferredId
      : pickRivalForGangWarTarget(s)
  if (!id) return s
  const r = s.rivals[id]!
  const rel = escalateTwice(r.relationship)
  // Each new war resets HP + power pool on both sides so it feels like a fresh fight.
  const refreshedRival = {
    ...r,
    relationship: rel,
    warHp: r.warMaxHp,
    warPowerHp: r.warPowerHpMax,
  }
  return {
    ...s,
    gangWarRivalId: id,
    gangWarTargetTerritoryId: null,
    gangWarSmallWar: false,
    gangWarAttackUses: 0,
    gangWarDefendUses: 0,
    gangIntelRivalId: null,
    playerWarHp: s.playerWarMaxHp,
    pendingWarStrike: null,
    rivals: { ...s.rivals, [id]: refreshedRival },
    rivalStoryEventNonce: s.rivalStoryEventNonce + 1,
  }
}

/** Big war (elimination) from the map when the rival is nemesis with no turf and a drained sub-bar. */
export function beginEliminationWar(state: GameState, rivalId: string): GameState {
  const s = ensureRivals(state)
  if (!isRivalEliminationEligible(s, rivalId)) return s
  if (s.gangWarRivalId) return s
  if (s.pendingRivalEncounter) return s
  const r = s.rivals[rivalId]
  if (!r || r.alive === false) return s
  const refreshedRival = {
    ...r,
    warHp: r.warMaxHp,
    warPowerHp: r.warPowerHpMax,
  }
  return {
    ...s,
    gangWarRivalId: rivalId,
    gangWarTargetTerritoryId: null,
    gangWarSmallWar: false,
    gangWarAttackUses: 0,
    gangWarDefendUses: 0,
    gangIntelRivalId: null,
    playerWarHp: s.playerWarMaxHp,
    pendingWarStrike: null,
    rivals: { ...s.rivals, [rivalId]: refreshedRival },
    rivalStoryEventNonce: s.rivalStoryEventNonce + 1,
  }
}

function ownedTerritoryIds(state: GameState): string[] {
  return Object.keys(state.territoriesOwned).filter((id) => state.territoriesOwned[id])
}

/** After leader demand life event resolves. */
export function applyGangDemandAftermath(state: GameState, choice: EventChoiceDef): GameState {
  const next = { ...state, lifeEventForcedId: null }
  const pref = state.gangIntelRivalId

  if (choice.id === 'pay_tribute') {
    return setNarratorFromKey(
      {
        ...next,
        gangIntelRivalId: null,
        gangWarRivalId: null,
        gangWarAttackUses: 0,
        gangWarDefendUses: 0,
        gangWarStrikePrepared: false,
        gangWarSurpriseDoublePending: false,
      },
      'life_gang_tribute_paid',
    )
  }
  if (choice.id === 'pay_power') {
    return setNarratorFromKey(
      {
        ...next,
        gangIntelRivalId: null,
        gangWarRivalId: null,
        gangWarAttackUses: 0,
        gangWarDefendUses: 0,
        gangWarStrikePrepared: false,
        gangWarSurpriseDoublePending: false,
      },
      'life_gang_power_tribute',
    )
  }
  if (choice.id === 'cede_turf') {
    const ids = ownedTerritoryIds(next)
    if (ids.length === 0) {
      return setNarratorFromKey(
        {
          ...next,
          gangIntelRivalId: null,
          gangWarRivalId: null,
          gangWarAttackUses: 0,
          gangWarDefendUses: 0,
          gangWarStrikePrepared: false,
          gangWarSurpriseDoublePending: false,
        },
        'life_gang_cede_none',
      )
    }
    const pick = ids[Math.floor(Math.random() * ids.length)]!
    const territoriesOwned = { ...next.territoriesOwned, [pick]: false }
    return setNarratorFromKey(
      {
        ...next,
        territoriesOwned,
        gangIntelRivalId: null,
        gangWarRivalId: null,
        gangWarAttackUses: 0,
        gangWarDefendUses: 0,
        gangWarStrikePrepared: false,
        gangWarSurpriseDoublePending: false,
      },
      'life_gang_cede_turf',
    )
  }
  if (choice.id === 'prepare_war') {
    const s = beginGangWarArc(next, pref)
    return setNarratorFromKey(s, 'life_gang_prepare_war')
  }
  if (choice.id === 'strike_first') {
    const s = beginGangWarArc(next, pref)
    return setNarratorFromKey({ ...s, heat: Math.min(100, s.heat + 6) }, 'life_gang_strike_first')
  }
  return next
}
