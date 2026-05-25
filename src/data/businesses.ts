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
    moneyPerClick: 1,
    moneyPerSecond: 0.2,
  },
  {
    id: 'laundry',
    name: 'Laundromat',
    description: 'Surprisingly good at washing money too.',
    baseCost: 340,
    costMult: 1.17,
    moneyPerClick: 4,
    moneyPerSecond: 0.9,
    unlockTerritoryId: 'block',
  },
  {
    id: 'club',
    name: 'Nightclub',
    description: 'Loud music, louder receipts.',
    baseCost: 2_800,
    costMult: 1.175,
    moneyPerClick: 11,
    moneyPerSecond: 3.2,
    unlockTerritoryId: 'district',
  },
  {
    id: 'tower',
    name: 'Mini Tower',
    description: 'Tiny skyline, big ego.',
    baseCost: 24_000,
    costMult: 1.18,
    moneyPerClick: 28,
    moneyPerSecond: 9,
    unlockTerritoryId: 'downtown',
  },
  {
    id: 'garage',
    name: 'Garage Front',
    description: 'Lift bays, off-books tune-ups, on-the-books denials.',
    baseCost: 520_000,
    costMult: 1.195,
    moneyPerClick: 52,
    moneyPerSecond: 17,
    unlockTerritoryId: 'industrial_zone',
  },
  {
    id: 'warehouse',
    name: 'Warehouse',
    description: 'Pallets, manifests, and a second set of both.',
    baseCost: 3_600_000,
    costMult: 1.205,
    moneyPerClick: 100,
    moneyPerSecond: 34,
    unlockTerritoryId: 'market_street',
  },
  {
    id: 'casino',
    name: 'Backroom Casino',
    description: 'The house always wins—you just lease the house.',
    baseCost: 22_000_000,
    costMult: 1.215,
    moneyPerClick: 205,
    moneyPerSecond: 68,
    unlockTerritoryId: 'financial_district',
  },
  {
    id: 'logistics_hub',
    name: 'Logistics Hub',
    description: 'Containers in, narratives out.',
    baseCost: 95_000_000,
    costMult: 1.22,
    moneyPerClick: 400,
    moneyPerSecond: 128,
    unlockTerritoryId: 'harbor',
  },
  {
    id: 'skylot_plaza',
    name: 'Skylot Plaza',
    description: 'Retail temples where rent is a religion.',
    baseCost: 118_000_000,
    costMult: 1.225,
    moneyPerClick: 780,
    moneyPerSecond: 248,
    unlockTerritoryId: 'airport',
  },
  {
    id: 'charter_row',
    name: 'Charter Row',
    description: 'Paper empires, real deposits.',
    baseCost: 465_000_000,
    costMult: 1.24,
    moneyPerClick: 1550,
    moneyPerSecond: 480,
    unlockTerritoryId: 'metro_arc',
  },
]

export function businessById(id: string): BusinessDef | undefined {
  return BUSINESSES.find((b) => b.id === id)
}
