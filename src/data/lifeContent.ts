export type HouseTier = {
  id: string
  label: string
  /** Upgrade cost from previous tier; index 0 is starting apartment (free) */
  upgradeCost: number
  incomeMult: number
  powerMult: number
  /** 0–100; trims heat gain from rivals */
  security: number
  /** 0 = no HQ grid; N = N×N placement grid for house customization */
  gridSize: number
}

/** homeless → apartment → house → villa → mansion → fortress */
export const HOUSE_TIERS: HouseTier[] = [
  {
    id: 'homeless',
    label: 'Homeless',
    upgradeCost: 0,
    incomeMult: 0.88,
    powerMult: 0.9,
    security: 0,
    gridSize: 0,
  },
  {
    id: 'apartment',
    label: 'Apartment',
    upgradeCost: 22_000,
    incomeMult: 1,
    powerMult: 1,
    security: 4,
    gridSize: 3,
  },
  {
    id: 'house',
    label: 'House',
    upgradeCost: 285_000,
    incomeMult: 1.04,
    powerMult: 1.03,
    security: 12,
    gridSize: 4,
  },
  {
    id: 'villa',
    label: 'Villa',
    upgradeCost: 920_000,
    incomeMult: 1.09,
    powerMult: 1.06,
    security: 24,
    gridSize: 5,
  },
  {
    id: 'mansion',
    label: 'Mansion',
    upgradeCost: 48_000_000,
    incomeMult: 1.14,
    powerMult: 1.1,
    security: 40,
    gridSize: 5,
  },
  {
    id: 'fortress',
    label: 'Fortress',
    upgradeCost: 1_350_000_000,
    incomeMult: 1.2,
    powerMult: 1.15,
    security: 58,
    gridSize: 5,
  },
]

export const MAX_HOUSE_LEVEL_INDEX = HOUSE_TIERS.length - 1

export function houseTierAtLevel(level: number): HouseTier {
  const i = Math.max(0, Math.min(HOUSE_TIERS.length - 1, level))
  return HOUSE_TIERS[i]!
}
