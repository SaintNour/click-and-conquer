import { BUSINESSES } from '../data/businesses'
import { RECRUITS } from '../data/recruits'
import type { GameState } from '../data/types'
import { BUSINESS_UNLOCK_AT_PREV_LEVEL, RECRUIT_UNLOCK_AT_PREV_LEVEL } from './balanceConfig'
import { businessUnlockRequirementLabel, isBusinessUnlocked } from './businessUnlocks'

export type ShopRowMode = 'hidden' | 'locked' | 'open'

/** Recruit row: R1 always visible (locked until prior levels); R2+ hidden until previous recruit hits threshold. */
export function recruitShopMode(state: GameState, index: number): ShopRowMode {
  const r = RECRUITS[index]
  if (!r) return 'hidden'
  const lv = (id: string) => state.recruitLevels[id] ?? 0
  const T = RECRUIT_UNLOCK_AT_PREV_LEVEL

  if (index === 0) return 'open'
  if (index === 1) {
    return lv(RECRUITS[0]!.id) >= T[0]! ? 'open' : 'locked'
  }
  if (lv(RECRUITS[index - 1]!.id) < T[index - 1]!) return 'hidden'
  return 'open'
}

export function recruitLockHint(state: GameState, index: number): string | null {
  if (recruitShopMode(state, index) !== 'locked') return null
  if (index === 1) {
    return `Unlock at ${RECRUITS[0]!.name} level ${RECRUIT_UNLOCK_AT_PREV_LEVEL[0]}`
  }
  return 'Unlocks later'
}

/** Business row: B1 always in list (locked); deeper rows hidden until prior business hits threshold. */
export function businessShopMode(state: GameState, index: number): ShopRowMode {
  const b = BUSINESSES[index]
  if (!b) return 'hidden'
  const lv = (id: string) => state.businessLevels[id] ?? 0
  const B = BUSINESS_UNLOCK_AT_PREV_LEVEL

  if (index >= 2) {
    const prev = BUSINESSES[index - 1]!
    if (lv(prev.id) < B[index - 2]!) return 'hidden'
  }
  if (index === 1 && lv(BUSINESSES[0]!.id) < B[0]!) return 'locked'
  if (!isBusinessUnlocked(state, b.id)) return 'locked'
  return 'open'
}

export function businessLockHint(state: GameState, index: number): string | null {
  const mode = businessShopMode(state, index)
  if (mode !== 'locked') return null
  const b = BUSINESSES[index]!
  const req = businessUnlockRequirementLabel(b)
  if (
    index === 1 &&
    (state.businessLevels[BUSINESSES[0]!.id] ?? 0) < BUSINESS_UNLOCK_AT_PREV_LEVEL[0]!
  ) {
    return `Unlock at ${BUSINESSES[0]!.name} level ${BUSINESS_UNLOCK_AT_PREV_LEVEL[0]}`
  }
  if (req) return req
  return 'Unlocks later'
}

/** First recruit row still in the “hidden” chain — show as locked preview. */
export function recruitPeekHiddenIndex(state: GameState): number | null {
  for (let i = 0; i < RECRUITS.length; i++) {
    if (recruitShopMode(state, i) === 'hidden') return i
  }
  return null
}

export function recruitPeekRequirementLine(state: GameState, index: number): string {
  if (index <= 0) return ''
  const prev = RECRUITS[index - 1]!
  const need = RECRUIT_UNLOCK_AT_PREV_LEVEL[index - 1] ?? 0
  const cur = state.recruitLevels[prev.id] ?? 0
  return `Unlocks when ${prev.name} reaches level ${need} (yours: ${cur}).`
}

/** First business row still hidden by the prior-business level gate. */
export function businessPeekHiddenIndex(state: GameState): number | null {
  for (let i = 0; i < BUSINESSES.length; i++) {
    if (businessShopMode(state, i) === 'hidden') return i
  }
  return null
}

export function businessPeekRequirementLine(state: GameState, index: number): string {
  if (index < 2) return ''
  const prev = BUSINESSES[index - 1]!
  const need = BUSINESS_UNLOCK_AT_PREV_LEVEL[index - 2] ?? 0
  const cur = state.businessLevels[prev.id] ?? 0
  return `Unlocks when ${prev.name} reaches level ${need} (yours: ${cur}).`
}
