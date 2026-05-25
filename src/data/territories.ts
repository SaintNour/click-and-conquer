import type { TerritoryDef } from './types'

/**
 * CONTENT — Territories (handcrafted)
 * ====================================
 * Total handcrafted: 15 (`STATIC_TERRITORY_COUNT`). After all are owned, infinite `inf_*` ids scale
 * from `INFINITE_TERRITORY_BASE_POWER`. Unlock flow: capture the next unowned id in list order
 * (see `visibleTerritoryDefs` — shows a sliding window of 3 targets).
 *
 * Power requirements use exponential growth by index so mid/late turf gates outpace linear shop
 * curves (see `TERRITORY_POWER_GROWTH` in this file).
 */
export function countTerritoriesOwned(territoriesOwned: Record<string, boolean>): number {
  return Object.values(territoriesOwned).filter(Boolean).length
}

/** Territory capture rewards — tuned below shop economy growth (long-form pacing). */
const REWARD_RATIO = 0.17

function rw(power: number): number {
  return Math.max(1, Math.floor(power * REWARD_RATIO))
}

/** Exponential curve with a gentle mid/late ramp so costs stay meaningful vs crew scaling. */
export const TERRITORY_POWER_BASE = 1100
export const TERRITORY_POWER_GROWTH = 1.832

function territoryPowerRamp(index: number): number {
  if (index < 5) return 1
  return Math.min(1.18, 1 + 0.032 * (index - 5))
}

export function territoryPowerRequiredAtStaticIndex(index: number): number {
  return Math.max(
    1,
    Math.round(
      TERRITORY_POWER_BASE * Math.pow(TERRITORY_POWER_GROWTH, index) * territoryPowerRamp(index),
    ),
  )
}

const TERRITORY_META: readonly Omit<TerritoryDef, 'powerRequired' | 'rewardMoney'>[] = [
  {
    id: 'alley',
    name: 'Scrapyard Alley',
    description: 'Nobody hands you turf—you squeeze in where the city forgets to look.',
  },
  {
    id: 'block',
    name: 'Rowhouse Block',
    description: 'Porches, gossip, and rent that climbs faster than hope.',
  },
  {
    id: 'inner_belt',
    name: 'Inner Belt',
    description: 'A ring of strip malls, chop shops, and side-eye.',
  },
  {
    id: 'district',
    name: 'Canal District',
    description: 'Water smells like money if you stand downwind.',
  },
  {
    id: 'downtown',
    name: 'Glass Downtown',
    description: 'Reflections lie. The ledgers do not.',
  },
  {
    id: 'industrial_zone',
    name: 'Smokestack Works',
    description: 'Grime, cranes, and invoices nobody files.',
  },
  {
    id: 'market_street',
    name: 'Night Market',
    description: 'Cash-only, questions discouraged—at scale.',
  },
  {
    id: 'financial_district',
    name: 'Ledger Heights',
    description: 'The numbers are louder than the sirens.',
  },
  {
    id: 'harbor',
    name: 'Tide Harbor',
    description: 'Salt air, sealed crates, loose lips.',
  },
  {
    id: 'airport',
    name: 'Runway Fringe',
    description: 'Skies, schedules, and exits nobody stamps.',
  },
  {
    id: 'metro_arc',
    name: 'Metro Arc',
    description: 'Subways, buskers, and crews that bill by the station.',
  },
  {
    id: 'tide_basin',
    name: 'Basin Docks',
    description: 'Warehouses full of maybe and manifests full of fiction.',
  },
  {
    id: 'express_hub',
    name: 'Express Hub',
    description: 'Everything moves through here—including your reputation.',
  },
  {
    id: 'capital_ring',
    name: 'Capital Ring',
    description: 'The city’s expensive pulse—hard to hold, harder to keep.',
  },
  {
    id: 'sovereign_grid',
    name: 'Sovereign Grid',
    description: 'Last handcrafted crown before the map becomes math.',
  },
] as const

export const STATIC_TERRITORIES: TerritoryDef[] = TERRITORY_META.map((m, i) => {
  const powerRequired = territoryPowerRequiredAtStaticIndex(i)
  return {
    ...m,
    powerRequired,
    rewardMoney: rw(powerRequired),
  }
})

export const STATIC_TERRITORY_COUNT = STATIC_TERRITORIES.length

export const INFINITE_TERRITORY_BASE_POWER = 6_600_000
export const INFINITE_TERRITORY_POWER_MULT = 1.22
export const INFINITE_TERRITORY_REWARD_RATIO = 0.2

const ORDERED_STATIC_IDS = STATIC_TERRITORIES.map((t) => t.id)

export function buildInfiniteTerritory(index: number): TerritoryDef {
  const power = Math.floor(
    INFINITE_TERRITORY_BASE_POWER * Math.pow(INFINITE_TERRITORY_POWER_MULT, index),
  )
  const rewardMoney = Math.floor(power * INFINITE_TERRITORY_REWARD_RATIO)
  const mod = index % 6
  let name: string
  let description: string
  if (mod === 0) {
    name = `Outer Sector ${index + 1}`
    description = 'Another grid square on the map—same hustle, new coordinates.'
  } else if (mod <= 2) {
    const greek = ['Alpha', 'Beta', 'Gamma', 'Delta'][mod - 1]!
    name = `Metro Zone ${greek}`
    description = 'Labeled sprawl so every crew knows where to send the invoice.'
  } else {
    name = `District X-${index + 1}`
    description = 'Expansion by spreadsheet: power up, receipts out.'
  }
  return {
    id: `inf_${index}`,
    name,
    description,
    powerRequired: Math.max(1, power),
    rewardMoney: Math.max(1, rewardMoney),
  }
}

export function getTerritoryDefinition(id: string): TerritoryDef | undefined {
  const s = STATIC_TERRITORIES.find((t) => t.id === id)
  if (s) return s
  const m = /^inf_(\d+)$/.exec(id)
  if (!m) return undefined
  return buildInfiniteTerritory(parseInt(m[1]!, 10))
}

export function parseInfiniteTerritoryIndex(id: string): number | null {
  const m = /^inf_(\d+)$/.exec(id)
  return m ? parseInt(m[1]!, 10) : null
}

function firstUnownedInfiniteIndex(territoriesOwned: Record<string, boolean>): number {
  for (let k = 0; k < 10_000; k++) {
    const id = `inf_${k}`
    if (!territoriesOwned[id]) return k
  }
  return 0
}

export function visibleTerritoryDefs(territoriesOwned: Record<string, boolean>): TerritoryDef[] {
  const focus = ORDERED_STATIC_IDS.findIndex((id) => !territoriesOwned[id])
  if (focus === -1) {
    const k = firstUnownedInfiniteIndex(territoriesOwned)
    return [k, k + 1, k + 2].map((i) => buildInfiniteTerritory(i))
  }
  const tierStart = Math.floor(focus / 3) * 3
  return ORDERED_STATIC_IDS.slice(tierStart, tierStart + 3).map(
    (id) => STATIC_TERRITORIES.find((t) => t.id === id)!,
  )
}

/** @deprecated Use STATIC_TERRITORIES */
export const TERRITORIES = STATIC_TERRITORIES
