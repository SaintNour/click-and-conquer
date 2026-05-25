import type { RecruitDef } from './types'

/**
 * CONTENT — Recruits (troops)
 * ===========================
 * Count: 8. Visuals: higher tiers reuse Pixi “fixer” silhouette with more glow in `empireScene`.
 * Shop visibility: chain unlocks in `shopVisibility.ts` / `balanceConfig.RECRUIT_UNLOCK_AT_PREV_LEVEL`.
 */
export const RECRUITS: RecruitDef[] = [
  {
    id: 'lookout',
    name: 'Lookout',
    description: 'Sees trouble before it sees you.',
    baseCost: 28,
    costMult: 1.16,
    powerPerClick: 0.5,
    powerPerSecond: 0.09,
    passivePowerPersonaMult: 1.03,
    clickPowerPersonaMult: 1.02,
  },
  {
    id: 'runner',
    name: 'Runner',
    description: 'Fast legs, loose morals.',
    baseCost: 220,
    costMult: 1.17,
    powerPerClick: 2,
    powerPerSecond: 0.35,
    passivePowerPersonaMult: 1.05,
    clickPowerPersonaMult: 1.06,
  },
  {
    id: 'muscle',
    name: 'Muscle',
    description: 'Negotiates with gravity.',
    baseCost: 1_850,
    costMult: 1.175,
    powerPerClick: 6,
    powerPerSecond: 1.35,
    passivePowerPersonaMult: 0.98,
    clickPowerPersonaMult: 1.04,
  },
  {
    id: 'fixer',
    name: 'Fixer',
    description: 'Knows a guy who knows a guy.',
    baseCost: 16_500,
    costMult: 1.185,
    powerPerClick: 17,
    powerPerSecond: 4.2,
    passivePowerPersonaMult: 1.02,
    clickPowerPersonaMult: 1.03,
  },
  {
    id: 'enforcer',
    name: 'Enforcer',
    description: 'Policy is whatever they say through a locked door.',
    baseCost: 620_000,
    costMult: 1.195,
    powerPerClick: 44,
    powerPerSecond: 11,
    passivePowerPersonaMult: 0.98,
    clickPowerPersonaMult: 1.05,
  },
  {
    id: 'lieutenant',
    name: 'Lieutenant',
    description: 'Runs crews, counts heads, forgets names on purpose.',
    baseCost: 5_200_000,
    costMult: 1.205,
    powerPerClick: 105,
    powerPerSecond: 26,
    passivePowerPersonaMult: 1.03,
    clickPowerPersonaMult: 1.02,
  },
  {
    id: 'captain',
    name: 'Captain',
    description: 'Owns blocks without owning deeds.',
    baseCost: 42_000_000,
    costMult: 1.215,
    powerPerClick: 240,
    powerPerSecond: 60,
    passivePowerPersonaMult: 1.02,
    clickPowerPersonaMult: 1.04,
  },
  {
    id: 'underboss',
    name: 'Underboss',
    description: 'Too close to the throne to pretend it is casual.',
    baseCost: 320_000_000,
    costMult: 1.225,
    powerPerClick: 550,
    powerPerSecond: 138,
    passivePowerPersonaMult: 1.01,
    clickPowerPersonaMult: 1.03,
  },
]

export function recruitById(id: string): RecruitDef | undefined {
  return RECRUITS.find((r) => r.id === id)
}
