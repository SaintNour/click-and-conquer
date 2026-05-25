import { LIFE_EVENTS } from '../data/lifeEvents'
import { getLifeEventTier } from './balanceConfig'
import { effectiveLifeMoneyCost, effectiveLifePowerCost } from './lifeChoiceCosts'
import type { EventChoiceDef, GameState, RandomEventDef } from '../data/types'
import { GANG_DEMAND_EVENT_ID, GANG_RUMOR_EVENT_ID } from './gangArcEngine'

/** Affordability uses `effectiveLifeMoneyCost` / `effectiveLifePowerCost` (dynamic wealth + passive scaling). */
/** Selection is priority-agnostic; blocking vs embedded is enforced by girlfriend ID set + UI (`lifeEventFlow`). */

const WEIGHT: Record<'small' | 'medium' | 'major', number> = {
  small: 5,
  medium: 2,
  major: 1,
}

function lifeBranchOk(state: GameState, ev: RandomEventDef): boolean {
  const req = ev.requiresLifeBranchKeys
  if (!req?.length) return true
  const flags = state.lifeBranchFlags ?? {}
  return req.every((k) => flags[k])
}

function tierWeight(ev: RandomEventDef): number {
  const t = ev.lifeTier ?? 'medium'
  return WEIGHT[t]
}

function recentIds(history: string[] | undefined): Set<string> {
  return new Set((history ?? []).slice(-4))
}

function recentVariationGroups(history: string[] | undefined): Set<string> {
  const set = new Set<string>()
  const h = history ?? []
  const tail = h.slice(-5)
  for (const id of tail) {
    const ev = LIFE_EVENTS.find((e) => e.id === id)
    const g = ev?.variationGroup
    if (g) set.add(g)
  }
  return set
}

function lifeProgressTierOk(ev: RandomEventDef, playerTier: number): boolean {
  const lo = ev.lifeTierMin ?? 1
  const hi = ev.lifeTierMax ?? 5
  return playerTier >= lo && playerTier <= hi
}

function hasLivingRivals(state: GameState): boolean {
  return Object.keys(state.rivals).some((id) => state.rivals[id]?.alive !== false)
}

function eventOffersGangWar(ev: RandomEventDef): boolean {
  return ev.choices.some((c) => c.startsGangWar)
}

function eventIsGangArc(ev: RandomEventDef): boolean {
  return ev.id === GANG_RUMOR_EVENT_ID || ev.id === GANG_DEMAND_EVENT_ID
}

/** Upfront costs + legacy negative moneyDelta (treated as spend). */
function choiceUpfrontAffordable(state: GameState, c: EventChoiceDef): boolean {
  const cm = effectiveLifeMoneyCost(state, c)
  const cp = effectiveLifePowerCost(state, c)
  const md = c.moneyDelta
  const spend = cm + (md !== undefined && md < 0 ? -md : 0)
  return state.money >= spend && state.power >= cp
}

/** At least one choice can be picked without soft-locking the modal. */
export function lifeEventHasPlayableChoice(state: GameState, ev: RandomEventDef): boolean {
  if (ev.meetConvo) return true
  return ev.choices.some((c) => choiceUpfrontAffordable(state, c))
}

export function pickLifeEvent(state: GameState): RandomEventDef {
  const history = state.lifeEventHistory ?? []
  const blockedIds = recentIds(history)
  const blockedGroups = recentVariationGroups(history)
  const playerTier = getLifeEventTier(state)

  let pool = LIFE_EVENTS.filter((ev) => {
    if (!lifeProgressTierOk(ev, playerTier)) return false
    if (!lifeBranchOk(state, ev)) return false
    if (!lifeEventHasPlayableChoice(state, ev)) return false
    if (ev.requiresLivingRivals && !hasLivingRivals(state)) return false
    if (state.gangWarRivalId && eventOffersGangWar(ev)) return false
    if (state.gangWarRivalId && eventIsGangArc(ev)) return false
    if (
      ev.id === GANG_RUMOR_EVENT_ID &&
      (state.gangIntelRivalId ||
        state.lifeEventForcedId ||
        state.pendingLifeEventId === GANG_DEMAND_EVENT_ID)
    )
      return false
    if (ev.bypassRelationshipLock) {
      if (ev.requiresPartner && (!state.hasPartner || !state.relationshipUnlocked)) return false
      return true
    }
    if (ev.introducesRelationship) {
      if (state.relationshipUnlocked) return false
      return true
    }
    if (state.relationshipUnlocked === false) return false
    if (ev.requiresPartner && (!state.hasPartner || !state.relationshipUnlocked)) return false
    return true
  })

  pool = pool.filter((ev) => {
    if (blockedIds.has(ev.id)) return false
    if (ev.variationGroup && blockedGroups.has(ev.variationGroup)) return false
    return true
  })

  if (pool.length === 0) {
    pool = LIFE_EVENTS.filter((ev) => {
      if (!lifeProgressTierOk(ev, playerTier)) return false
      if (!lifeBranchOk(state, ev)) return false
      if (!lifeEventHasPlayableChoice(state, ev)) return false
      if (ev.requiresLivingRivals && !hasLivingRivals(state)) return false
      if (state.gangWarRivalId && eventOffersGangWar(ev)) return false
      if (state.gangWarRivalId && eventIsGangArc(ev)) return false
      if (
        ev.id === GANG_RUMOR_EVENT_ID &&
        (state.gangIntelRivalId ||
          state.lifeEventForcedId ||
          state.pendingLifeEventId === GANG_DEMAND_EVENT_ID)
      )
        return false
      if (ev.bypassRelationshipLock) {
        if (ev.requiresPartner && (!state.hasPartner || !state.relationshipUnlocked)) return false
        return true
      }
      if (ev.introducesRelationship && state.relationshipUnlocked) return false
      if (!ev.introducesRelationship && !ev.bypassRelationshipLock && !state.relationshipUnlocked)
        return false
      if (ev.requiresPartner && (!state.hasPartner || !state.relationshipUnlocked)) return false
      return true
    })
  }

  if (pool.length === 0) {
    const safe = LIFE_EVENTS.filter(
      (e) =>
        lifeEventHasPlayableChoice(state, e) &&
        e.requiresPartner &&
        state.hasPartner &&
        state.relationshipUnlocked,
    )
    if (safe.length) return safe[0]!
    const fallback = LIFE_EVENTS.find((e) => e.id === 'life_tier1_loose_change')
    if (fallback && lifeEventHasPlayableChoice(state, fallback)) return fallback
    return LIFE_EVENTS.find((e) => e.id === 'life_partner_text') ?? LIFE_EVENTS[0]!
  }

  const total = pool.reduce((s, ev) => s + tierWeight(ev), 0)
  let r = Math.random() * total
  for (const ev of pool) {
    r -= tierWeight(ev)
    if (r <= 0) return ev
  }
  return pool[pool.length - 1]!
}

/** Prefer a queued gang follow-up when `lifeEventForcedId` is set and still playable. */
export function pickLifeEventOrForced(state: GameState): {
  def: RandomEventDef
  clearForced: boolean
} {
  const fid = state.lifeEventForcedId
  if (fid) {
    const fd = LIFE_EVENTS.find((e) => e.id === fid)
    if (fd && lifeEventHasPlayableChoice(state, fd) && lifeBranchOk(state, fd)) {
      return { def: fd, clearForced: true }
    }
  }
  return { def: pickLifeEvent(state), clearForced: false }
}
