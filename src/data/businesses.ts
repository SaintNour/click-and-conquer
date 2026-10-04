import type { BusinessDef } from './types'

/**
 * CONTENT — Businesses
 * =====================
 * Count: 10. First is always available; others need territory control (`unlockTerritoryId`) and/or
 * prior business level milestones (`shopVisibility.ts`).
 */
export const BUSINESSES: BusinessDef[] = [
  {
    id: 'stall',
    name: 'Corner Stall',
    description: 'Cash-only, questions discouraged.',
    baseCost: 48,
    costMult: 1.16,
    moneyPerClick: 0.6,
    moneyPerSecond: 0.12,
  },
  {
    id: 'laundry',
    name: 'Laundromat',
    description: 'Surprisingly good at washing money too.',
    baseCost: 340,
    costMult: 1.17,
    moneyPerClick: 2.4,
    moneyPerSecond: 0.52,
    unlockTerritoryId: 'block',
  },
  {
    id: 'club',
    name: 'Nightclub',
    description: 'Loud music, louder receipts.',
    baseCost: 2_800,
    costMult: 1.175,
    moneyPerClick: 6.6,
    moneyPerSecond: 1.85,
    unlockTerritoryId: 'district',
  },
  {
    id: 'tower',
    name: 'Mini Tower',
    description: 'Tiny skyline, big ego.',
    baseCost: 24_000,
    costMult: 1.18,
    moneyPerClick: 17,
    moneyPerSecond: 5.2,
    unlockTerritoryId: 'downtown',
  },
  {
    id: 'garage',
    name: 'Garage Front',
    description: 'Lift bays, off-books tune-ups, on-the-books denials.',
    baseCost: 520_000,
    costMult: 1.195,
    moneyPerClick: 31,
    moneyPerSecond: 10,
    unlockTerritoryId: 'industrial_zone',
  },
  {
    id: 'warehouse',
    name: 'Warehouse',
    description: 'Pallets, manifests, and a second set of both.',
    baseCost: 3_600_000,
    costMult: 1.205,
    moneyPerClick: 59,
    moneyPerSecond: 19.5,
    unlockTerritoryId: 'market_street',
  },
  {
    id: 'casino',
    name: 'Backroom Casino',
    description: 'The house always wins—you just lease the house.',
    baseCost: 22_000_000,
    costMult: 1.215,
    moneyPerClick: 120,
    moneyPerSecond: 39,
    unlockTerritoryId: 'financial_district',
  },
  {
    id: 'logistics_hub',
    name: 'Logistics Hub',
    description: 'Containers in, narratives out.',
    baseCost: 95_000_000,
    costMult: 1.22,
    moneyPerClick: 232,
    moneyPerSecond: 74,
    unlockTerritoryId: 'harbor',
  },
  {
    id: 'skylot_plaza',
    name: 'Skylot Plaza',
    description: 'Retail temples where rent is a religion.',
    baseCost: 118_000_000,
    costMult: 1.225,
    moneyPerClick: 452,
    moneyPerSecond: 143,
    unlockTerritoryId: 'airport',
  },
  {
    id: 'charter_row',
    name: 'Charter Row',
    description: 'Paper empires, real deposits.',
    baseCost: 465_000_000,
    costMult: 1.24,
    moneyPerClick: 900,
    moneyPerSecond: 276,
    unlockTerritoryId: 'metro_arc',
  },
]

export function businessById(id: string): BusinessDef | undefined {
  return BUSINESSES.find((b) => b.id === id)
}
