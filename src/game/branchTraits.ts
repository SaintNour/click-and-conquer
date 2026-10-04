import type { GameState } from '../data/types'

/**
 * Street reputation traits: persistent effects tied to `lifeBranchFlags` set by
 * event choices. Each trait is a small permanent multiplier so decisions echo
 * through the rest of the run — shown to the player in the Street Rep card.
 */
export type BranchTrait = {
  /** Flag key in `state.lifeBranchFlags`. */
  flag: string
  name: string
  /** One-line flavor for the UI. */
  blurb: string
  /** Multiplier on money gained per click and per second. */
  moneyMult?: number
  /** Multiplier on power gained per click and per second. */
  powerMult?: number
  /** Multiplier on heat gained from income ticks. */
  heatGainMult?: number
  /** Multiplier on rival skirmish / pressure chance. */
  rivalPressureMult?: number
}

export const BRANCH_TRAITS: BranchTrait[] = [
  {
    flag: 'street_kind',
    name: 'Block favorite',
    blurb: 'The block remembers who helped.',
    moneyMult: 1.015,
  },
  {
    flag: 'street_cold',
    name: 'Cold shoulders',
    blurb: 'You walk past trouble — people notice.',
    powerMult: 1.01,
    heatGainMult: 1.04,
  },
  {
    flag: 'feared_rep',
    name: 'Feared',
    blurb: 'Rivals talk about you before they move.',
    powerMult: 1.02,
    rivalPressureMult: 1.08,
  },
  {
    flag: 'hired_eyes',
    name: 'Wired in',
    blurb: 'Your eyes on the street spot trouble early.',
    rivalPressureMult: 0.94,
  },
  {
    flag: 'marked_payer',
    name: 'Soft mark',
    blurb: 'Word got out that you pay when pressed.',
    rivalPressureMult: 1.1,
  },
  {
    flag: 'public_face',
    name: 'Public face',
    blurb: 'Cameras know your name — so does everyone else.',
    moneyMult: 1.015,
    heatGainMult: 1.04,
  },
  {
    flag: 'negotiator',
    name: 'Dealmaker',
    blurb: 'You talk first; that travels.',
    rivalPressureMult: 0.96,
    moneyMult: 1.01,
  },
  {
    flag: 'convoy_raider',
    name: 'Ambusher',
    blurb: 'Crews double-check their routes now.',
    powerMult: 1.015,
  },
  {
    flag: 'ceded_turf',
    name: 'Seen as soft',
    blurb: 'Giving up ground taught them to push.',
    rivalPressureMult: 1.06,
  },
  {
    flag: 'patron',
    name: 'Neighborhood patron',
    blurb: 'Generosity buys quiet goodwill.',
    moneyMult: 1.01,
    heatGainMult: 0.96,
  },
  {
    flag: 'kept_real',
    name: 'Straight shooter',
    blurb: 'You tell it straight — people believe you.',
    heatGainMult: 0.97,
  },
  {
    flag: 'absorbed_clone',
    name: 'Consolidator',
    blurb: 'You turn imitators into assets.',
    moneyMult: 1.015,
  },
  {
    flag: 'honest_kid',
    name: 'Clean rep',
    blurb: 'People remember you kept your word.',
    heatGainMult: 0.96,
  },
  {
    flag: 'ex_fingers',
    name: 'Sticky roots',
    blurb: 'Old hands remember small lifts.',
    moneyMult: 1.015,
  },
  {
    flag: 'fence_line',
    name: 'Grey pipeline',
    blurb: 'Flea-market money finds your pocket.',
    moneyMult: 1.02,
    heatGainMult: 1.05,
  },
  {
    flag: 'burned_by_friend',
    name: 'Trust issues',
    blurb: 'You vet harder now — fewer surprises.',
    rivalPressureMult: 0.97,
  },
  {
    flag: 'court_strings',
    name: 'Pulled strings',
    blurb: 'A clerk somewhere owes you. Paperwork forgets you.',
    heatGainMult: 0.94,
  },
  {
    flag: 'night_school',
    name: 'Night-class head',
    blurb: 'Tuesday evenings compound.',
    moneyMult: 1.02,
  },
  {
    flag: 'kid_scout',
    name: 'Little eyes',
    blurb: 'Tay sees the block before the block sees you.',
    rivalPressureMult: 0.95,
  },
  {
    flag: 'kid_made',
    name: 'Raised a soldier',
    blurb: 'The stoop kid works your colors now.',
    powerMult: 1.02,
  },
  {
    flag: 'family_close',
    name: 'Family net',
    blurb: 'You showed up when it mattered.',
    moneyMult: 1.01,
  },
  {
    flag: 'lies_caught',
    name: 'Two-phone energy',
    blurb: 'A crack in the story echoes.',
    heatGainMult: 1.03,
  },
  {
    flag: 'friend_forgiven',
    name: 'Second chances',
    blurb: 'DeShawn owes you — he pays.',
    moneyMult: 1.008,
  },
  {
    flag: 'kid_schooled',
    name: 'Paid forward',
    blurb: 'One kid got the good version of the story.',
    heatGainMult: 0.97,
  },
]

export function activeBranchTraits(state: GameState): BranchTrait[] {
  const flags = state.lifeBranchFlags ?? {}
  return BRANCH_TRAITS.filter((t) => flags[t.flag])
}

function traitProduct(state: GameState, key: keyof BranchTrait): number {
  const flags = state.lifeBranchFlags ?? {}
  let m = 1
  for (const t of BRANCH_TRAITS) {
    const v = t[key]
    if (typeof v === 'number' && flags[t.flag]) m *= v
  }
  return m
}

export function branchMoneyMultiplier(state: GameState): number {
  return traitProduct(state, 'moneyMult')
}

export function branchPowerMultiplier(state: GameState): number {
  return traitProduct(state, 'powerMult')
}

export function branchHeatGainMultiplier(state: GameState): number {
  return traitProduct(state, 'heatGainMult')
}

export function branchRivalPressureMultiplier(state: GameState): number {
  return traitProduct(state, 'rivalPressureMult')
}
