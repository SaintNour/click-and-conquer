/** Structured unlock rules (evaluated in `shopUpgradeEngine`). */
export type UnlockCondition =
  | { type: 'recruit_min'; recruitId: string; min: number }
  | { type: 'business_min'; businessId: string; min: number }
  | { type: 'power_min'; min: number }
  | { type: 'territories_min'; min: number }
  | { type: 'total_recruit_levels_min'; min: number }
  | { type: 'sum_business_levels_min'; min: number }
  | { type: 'all'; conditions: UnlockCondition[] }

/**
 * Multiplier effects — stack multiplicatively.
 * `tier` gates waves (1 early → 5 endgame); not shown in UI.
 */
export type ShopEffect =
  | {
      kind: 'global'
      scope: 'clickMoney' | 'passiveMoney' | 'clickPower' | 'passivePower' | 'allMoney' | 'allPower'
      mult: number
    }
  | { kind: 'recruit'; recruitId: string; mult: number }
  | { kind: 'business'; businessId: string; mult: number }
  | {
      kind: 'synergy_power'
      fromRecruit: string
      toRecruit: string
      perFromLevel: number
      capMult: number
    }
  | {
      kind: 'synergy_business_recruit_power'
      perBusinessLevel: number
      capMult: number
    }

export type ShopUpgradeDef = {
  id: string
  tier: 1 | 2 | 3 | 4 | 5
  name: string
  description: string
  cost: number
  effects: ShopEffect[]
  unlock: UnlockCondition
}

/**
 * Cookie-like momentum: cheap early tiers, mid plateau, tier-4 spikes (×3/×5), tier-5 ×10.
 * Original ids preserved for save compatibility.
 */
export const SHOP_UPGRADES: ShopUpgradeDef[] = [
  // —— Tier 1 ——
  {
    id: 'loose_change',
    tier: 1,
    name: 'Loose Change',
    description: 'All cash ×1.18. Quick early win.',
    cost: 40,
    effects: [{ kind: 'global', scope: 'allMoney', mult: 1.18 }],
    unlock: { type: 'total_recruit_levels_min', min: 2 },
  },
  {
    id: 'street_smarts',
    tier: 1,
    name: 'Street Smarts',
    description: 'Click money ×1.45.',
    cost: 150,
    effects: [{ kind: 'global', scope: 'clickMoney', mult: 1.45 }],
    unlock: { type: 'power_min', min: 30 },
  },
  {
    id: 'caffeine',
    tier: 1,
    name: 'Caffeine IV',
    description: 'Passive money ×1.28.',
    cost: 240,
    effects: [{ kind: 'global', scope: 'passiveMoney', mult: 1.28 }],
    unlock: { type: 'business_min', businessId: 'stall', min: 1 },
  },
  {
    id: 'whisper_net',
    tier: 1,
    name: 'Whisper Network',
    description: 'Passive power ×1.25.',
    cost: 290,
    effects: [{ kind: 'global', scope: 'passivePower', mult: 1.25 }],
    unlock: { type: 'recruit_min', recruitId: 'lookout', min: 2 },
  },
  {
    id: 'hot_dog_cart',
    tier: 1,
    name: 'Hot Dog Cart',
    description: 'Stall money ×1.4.',
    cost: 200,
    effects: [{ kind: 'business', businessId: 'stall', mult: 1.4 }],
    unlock: { type: 'business_min', businessId: 'stall', min: 2 },
  },

  // —— Tier 2 — first ×2 spikes ——
  {
    id: 'double_down',
    tier: 2,
    name: 'Double Down',
    description: 'Click money ×2.',
    cost: 2_600,
    effects: [{ kind: 'global', scope: 'clickMoney', mult: 2 }],
    unlock: {
      type: 'all',
      conditions: [
        { type: 'power_min', min: 100 },
        { type: 'total_recruit_levels_min', min: 10 },
      ],
    },
  },
  {
    id: 'twin_engine',
    tier: 2,
    name: 'Twin Engine',
    description: 'Passive money ×2.',
    cost: 3_900,
    effects: [{ kind: 'global', scope: 'passiveMoney', mult: 2 }],
    unlock: {
      type: 'all',
      conditions: [
        { type: 'territories_min', min: 1 },
        { type: 'total_recruit_levels_min', min: 12 },
      ],
    },
  },
  {
    id: 'binoculars',
    tier: 2,
    name: 'Premium Binoculars',
    description: 'Lookout power ×1.6.',
    cost: 3_000,
    effects: [{ kind: 'recruit', recruitId: 'lookout', mult: 1.6 }],
    unlock: { type: 'recruit_min', recruitId: 'lookout', min: 5 },
  },
  {
    id: 'fast_kicks',
    tier: 2,
    name: 'Fast Kicks',
    description: 'Runner power ×1.55.',
    cost: 4_500,
    effects: [{ kind: 'recruit', recruitId: 'runner', mult: 1.55 }],
    unlock: { type: 'recruit_min', recruitId: 'runner', min: 4 },
  },
  {
    id: 'spotter_synergy',
    tier: 2,
    name: 'Spotter Network',
    description: 'Runner power scales with Lookouts (capped).',
    cost: 5_200,
    effects: [
      {
        kind: 'synergy_power',
        fromRecruit: 'lookout',
        toRecruit: 'runner',
        perFromLevel: 0.019,
        capMult: 1.52,
      },
    ],
    unlock: {
      type: 'all',
      conditions: [
        { type: 'recruit_min', recruitId: 'lookout', min: 4 },
        { type: 'recruit_min', recruitId: 'runner', min: 4 },
      ],
    },
  },
  {
    id: 'night_shift',
    tier: 2,
    name: 'Night Shift',
    description: 'Passive money ×1.35.',
    cost: 880,
    effects: [{ kind: 'global', scope: 'passiveMoney', mult: 1.35 }],
    unlock: { type: 'territories_min', min: 1 },
  },
  {
    id: 'loyalty_cards',
    tier: 2,
    name: 'Loyalty Cards',
    description: 'Click power ×1.4.',
    cost: 1_400,
    effects: [{ kind: 'global', scope: 'clickPower', mult: 1.4 }],
    unlock: { type: 'total_recruit_levels_min', min: 14 },
  },

  // —— Tier 3 — plateau (slow → then tier 4 breaks it) ——
  {
    id: 'knife',
    tier: 3,
    name: 'The Knife',
    description: 'Muscle power ×1.4. Small step — the wall is intentional.',
    cost: 20_000,
    effects: [{ kind: 'recruit', recruitId: 'muscle', mult: 1.4 }],
    unlock: { type: 'recruit_min', recruitId: 'muscle', min: 6 },
  },
  {
    id: 'extra_spin',
    tier: 3,
    name: 'Extra Spin Cycle',
    description: 'Laundromat money ×1.45.',
    cost: 12_000,
    effects: [{ kind: 'business', businessId: 'laundry', mult: 1.45 }],
    unlock: { type: 'business_min', businessId: 'laundry', min: 3 },
  },
  {
    id: 'bass_boost',
    tier: 3,
    name: 'Bass Boost',
    description: 'Nightclub money ×1.5.',
    cost: 72_000,
    effects: [{ kind: 'business', businessId: 'club', mult: 1.5 }],
    unlock: { type: 'business_min', businessId: 'club', min: 4 },
  },
  {
    id: 'briefcase',
    tier: 3,
    name: 'Lawyer Briefcase',
    description: 'Fixer power ×1.45.',
    cost: 18_000,
    effects: [{ kind: 'recruit', recruitId: 'fixer', mult: 1.45 }],
    unlock: { type: 'recruit_min', recruitId: 'fixer', min: 4 },
  },
  {
    id: 'compound_growth',
    tier: 3,
    name: 'Compound Growth',
    description: 'Click & passive money ×1.22 each. Incremental crawl.',
    cost: 48_000,
    effects: [
      { kind: 'global', scope: 'clickMoney', mult: 1.22 },
      { kind: 'global', scope: 'passiveMoney', mult: 1.22 },
    ],
    unlock: { type: 'sum_business_levels_min', min: 20 },
  },
  {
    id: 'fear_factor',
    tier: 3,
    name: 'Fear Factor',
    description: 'All power ×1.22. Grind fuel.',
    cost: 36_000,
    effects: [{ kind: 'global', scope: 'allPower', mult: 1.22 }],
    unlock: { type: 'power_min', min: 380 },
  },
  {
    id: 'payroll_pipeline',
    tier: 3,
    name: 'Payroll Pipeline',
    description:
      'Recruit power scales with total business levels (capped). Breaks the “crew vs fronts” deadlock.',
    cost: 62_000,
    effects: [{ kind: 'synergy_business_recruit_power', perBusinessLevel: 0.0055, capMult: 1.42 }],
    unlock: {
      type: 'all',
      conditions: [
        { type: 'sum_business_levels_min', min: 16 },
        { type: 'total_recruit_levels_min', min: 26 },
      ],
    },
  },

  // —— Tier 4 — large jumps ——
  {
    id: 'tax_avoidance',
    tier: 4,
    name: 'Creative Accounting',
    description: 'All money ×3. Opens the floodgates.',
    cost: 220_000,
    effects: [{ kind: 'global', scope: 'allMoney', mult: 3 }],
    unlock: {
      type: 'all',
      conditions: [
        { type: 'territories_min', min: 2 },
        { type: 'power_min', min: 800 },
      ],
    },
  },
  {
    id: 'triplicate',
    tier: 4,
    name: 'Triplicate Ledger',
    description: 'All money ×3 again. Stacked absurdity.',
    cost: 950_000,
    effects: [{ kind: 'global', scope: 'allMoney', mult: 3 }],
    unlock: {
      type: 'all',
      conditions: [
        { type: 'power_min', min: 2800 },
        { type: 'sum_business_levels_min', min: 30 },
      ],
    },
  },
  {
    id: 'five_alarm',
    tier: 4,
    name: 'Five-Alarm Reputation',
    description: 'All power ×5.',
    cost: 480_000,
    effects: [{ kind: 'global', scope: 'allPower', mult: 5 }],
    unlock: {
      type: 'all',
      conditions: [
        { type: 'power_min', min: 2000 },
        { type: 'total_recruit_levels_min', min: 40 },
      ],
    },
  },
  {
    id: 'gun',
    tier: 4,
    name: 'The Gun',
    description: 'Muscle power ×3.',
    cost: 175_000,
    effects: [{ kind: 'recruit', recruitId: 'muscle', mult: 3 }],
    unlock: { type: 'recruit_min', recruitId: 'muscle', min: 15 },
  },
  {
    id: 'penthouse_key',
    tier: 4,
    name: 'Penthouse Key',
    description: 'Mini Tower money ×3.',
    cost: 380_000,
    effects: [{ kind: 'business', businessId: 'tower', mult: 3 }],
    unlock: { type: 'business_min', businessId: 'tower', min: 4 },
  },
  {
    id: 'muscle_escort',
    tier: 4,
    name: 'Muscle Escort',
    description: 'Fixer power scales with Muscle (capped).',
    cost: 340_000,
    effects: [
      {
        kind: 'synergy_power',
        fromRecruit: 'muscle',
        toRecruit: 'fixer',
        perFromLevel: 0.013,
        capMult: 1.62,
      },
    ],
    unlock: {
      type: 'all',
      conditions: [
        { type: 'recruit_min', recruitId: 'muscle', min: 10 },
        { type: 'recruit_min', recruitId: 'fixer', min: 3 },
      ],
    },
  },

  // —— Tier 5 — endgame ×10 ——
  {
    id: 'empire_mandate',
    tier: 5,
    name: 'Empire Mandate',
    description: 'All money ×10 and all power ×10. Crown jewel.',
    cost: 4_200_000,
    effects: [
      { kind: 'global', scope: 'allMoney', mult: 10 },
      { kind: 'global', scope: 'allPower', mult: 10 },
    ],
    unlock: {
      type: 'all',
      conditions: [
        { type: 'territories_min', min: 3 },
        { type: 'power_min', min: 5500 },
        { type: 'total_recruit_levels_min', min: 52 },
        { type: 'sum_business_levels_min', min: 32 },
      ],
    },
  },

  // —— Long-tail (post–mandate grind) — hand-authored infinite-adjacent targets ——
  {
    id: 'legacy_ledger_i',
    tier: 5,
    name: 'Legacy Ledger I',
    description: 'All cash ×1.12. For runs that refuse to end.',
    cost: 12_000_000,
    effects: [{ kind: 'global', scope: 'allMoney', mult: 1.12 }],
    unlock: {
      type: 'all',
      conditions: [
        { type: 'sum_business_levels_min', min: 120 },
        { type: 'total_recruit_levels_min', min: 100 },
      ],
    },
  },
  {
    id: 'legacy_ledger_ii',
    tier: 5,
    name: 'Legacy Ledger II',
    description: 'All power ×1.12.',
    cost: 28_000_000,
    effects: [{ kind: 'global', scope: 'allPower', mult: 1.12 }],
    unlock: {
      type: 'all',
      conditions: [
        { type: 'power_min', min: 25_000 },
        { type: 'territories_min', min: 8 },
      ],
    },
  },
  {
    id: 'turf_inheritance',
    tier: 5,
    name: 'Turf Inheritance',
    description: 'Passive money ×1.18 — rent never sleeps.',
    cost: 55_000_000,
    effects: [{ kind: 'global', scope: 'passiveMoney', mult: 1.18 }],
    unlock: { type: 'territories_min', min: 12 },
  },
  {
    id: 'crew_covenant',
    tier: 5,
    name: 'Crew Covenant',
    description: 'Passive power ×1.18.',
    cost: 62_000_000,
    effects: [{ kind: 'global', scope: 'passivePower', mult: 1.18 }],
    unlock: { type: 'total_recruit_levels_min', min: 280 },
  },
]

export function shopUpgradeById(id: string): ShopUpgradeDef | undefined {
  return SHOP_UPGRADES.find((u) => u.id === id)
}
