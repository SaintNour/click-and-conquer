export type HouseItemCategory = 'luxury' | 'security' | 'power' | 'utility'

export type HomeDefenseContribution = {
  security?: number
  detection?: number
  intimidation?: number
  durability?: number
}

export type HouseItemEffect = {
  /** Multiplies money income (click + passive) — stacks multiplicatively. */
  incomeMult?: number
  /** Multiplies power (click + passive). */
  powerMult?: number
  /** Multiplies heat gain (lower = better). */
  heatMitigation?: number
  /** Multiplies money/power lost on failed rival defense (lower = better). */
  rivalLossMitigation?: number
  /** Placed HQ items add to home defense rolls (security, detection, intimidation, durability). */
  defense?: HomeDefenseContribution
}

export type HouseItemDef = {
  id: string
  name: string
  category: HouseItemCategory
  /** 1 = entry, higher = grindier catalog ladder (UI / future art pipeline). */
  tier?: number
  description: string
  /** Purchase with money (exclusive with costPower) */
  costMoney?: number
  costPower?: number
  effect: HouseItemEffect
  /** Shown in UI (emoji); replace with thumbnail path when assets exist. */
  icon: string
}

export const HOUSE_ITEMS: HouseItemDef[] = [
  {
    id: 'velvet_sofa',
    name: 'Velvet Sofa',
    category: 'luxury',
    description: 'Looks expensive. The IRS agrees.',
    costMoney: 32_000,
    effect: { incomeMult: 1.006, defense: { intimidation: 3 } },
    icon: '🛋️',
  },
  {
    id: 'ledger_shrine',
    name: 'Ledger Shrine',
    category: 'luxury',
    description: 'A desk that implies you read numbers for fun.',
    costMoney: 68_000,
    effect: { incomeMult: 1.012, defense: { intimidation: 5 } },
    icon: '📒',
  },
  {
    id: 'steel_door',
    name: 'Steel Door',
    category: 'security',
    description: 'Knock first. Then wait.',
    costMoney: 95_000,
    effect: {
      heatMitigation: 0.985,
      rivalLossMitigation: 0.96,
      defense: { durability: 10, security: 4 },
    },
    icon: '🚪',
  },
  {
    id: 'cctv_rig',
    name: 'CCTV Rig',
    category: 'security',
    description: 'Paranoia with a warranty.',
    costMoney: 165_000,
    effect: {
      heatMitigation: 0.972,
      rivalLossMitigation: 0.93,
      defense: { detection: 12, security: 6 },
    },
    icon: '📹',
  },
  {
    id: 'weight_corner',
    name: 'Weight Corner',
    category: 'power',
    description: 'Reps for the ego and the intimidation factor.',
    costMoney: 52_000,
    effect: { powerMult: 1.008, defense: { intimidation: 6 } },
    icon: '🏋️',
  },
  {
    id: 'server_hum',
    name: 'Server Hum',
    category: 'power',
    description: 'Fans that sound like money leaving someone else.',
    costPower: 420,
    effect: { powerMult: 1.014, incomeMult: 1.004, defense: { detection: 5, security: 3 } },
    icon: '🖥️',
  },
  {
    id: 'coffee_altar',
    name: 'Coffee Altar',
    category: 'utility',
    description: 'Fuel for the grind, literally.',
    costMoney: 26_000,
    effect: { incomeMult: 1.005, powerMult: 1.004, defense: { security: 2 } },
    icon: '☕',
  },
  {
    id: 'quiet_generator',
    name: 'Quiet Generator',
    category: 'utility',
    description: 'When the grid blinks, you do not.',
    costMoney: 145_000,
    effect: { powerMult: 1.01, heatMitigation: 0.99, defense: { durability: 6 } },
    icon: '🔌',
  },
  // —— Expanded catalog (tiered ladders) ——
  {
    id: 'chair_plastic',
    name: 'Plastic Chair',
    category: 'utility',
    tier: 1,
    description: 'It wobbles. It exists.',
    costMoney: 14_000,
    effect: { defense: { durability: 2 } },
    icon: '🪑',
  },
  {
    id: 'chair_office',
    name: 'Office Chair',
    category: 'utility',
    tier: 2,
    description: 'Spinning away accountability.',
    costMoney: 42_000,
    effect: { incomeMult: 1.003, defense: { intimidation: 2 } },
    icon: '🪑',
  },
  {
    id: 'chair_fancy',
    name: 'Fancy Chair',
    category: 'luxury',
    tier: 3,
    description: 'Leather that judges your posture.',
    costMoney: 195_000,
    effect: { incomeMult: 1.008, defense: { intimidation: 5 } },
    icon: '🛋️',
  },
  {
    id: 'chair_luxury',
    name: 'Luxury Chair',
    category: 'luxury',
    tier: 4,
    description: 'You could host a deposition.',
    costMoney: 720_000,
    effect: { incomeMult: 1.014, defense: { intimidation: 8 } },
    icon: '🛋️',
  },
  {
    id: 'chair_aunt',
    name: 'The One Your Aunts Have',
    category: 'luxury',
    tier: 5,
    description: 'Velvet. Doilies. Dominance.',
    costMoney: 2_400_000,
    effect: { incomeMult: 1.02, defense: { intimidation: 12 } },
    icon: '🪑',
  },
  {
    id: 'table_cheap',
    name: 'Folding Table',
    category: 'utility',
    tier: 1,
    description: 'Business meetings at 2am.',
    costMoney: 19_000,
    effect: { powerMult: 1.002 },
    icon: '🪵',
  },
  {
    id: 'table_dining',
    name: 'Dining Table',
    category: 'luxury',
    tier: 3,
    description: 'Where deals become dinner.',
    costMoney: 265_000,
    effect: { incomeMult: 1.006, defense: { intimidation: 3 } },
    icon: '🪑',
  },
  {
    id: 'rug_basic',
    name: 'Basic Rug',
    category: 'utility',
    tier: 1,
    description: 'Hides stains. Adds denial.',
    costMoney: 22_000,
    effect: { heatMitigation: 0.995 },
    icon: '🟫',
  },
  {
    id: 'rug_persian',
    name: 'Persian Rug',
    category: 'luxury',
    tier: 4,
    description: 'You walk softer on money.',
    costMoney: 980_000,
    effect: { incomeMult: 1.01, heatMitigation: 0.99 },
    icon: '🟫',
  },
  {
    id: 'lamp_floor',
    name: 'Floor Lamp',
    category: 'utility',
    tier: 2,
    description: 'Mood lighting for bad ideas.',
    costMoney: 33_000,
    effect: { defense: { detection: 3 } },
    icon: '🔆',
  },
  {
    id: 'lamp_neon',
    name: 'Neon Tube',
    category: 'luxury',
    tier: 3,
    description: 'Open late. Always.',
    costMoney: 148_000,
    effect: { incomeMult: 1.005, defense: { intimidation: 4 } },
    icon: '💡',
  },
  {
    id: 'tv_small',
    name: 'Small TV',
    category: 'utility',
    tier: 2,
    description: 'News for the paranoid.',
    costMoney: 72_000,
    effect: { defense: { detection: 4 } },
    icon: '📺',
  },
  {
    id: 'tv_oled',
    name: 'OLED Wall',
    category: 'luxury',
    tier: 5,
    description: 'You can see the lie in 4K.',
    costMoney: 1_850_000,
    effect: { incomeMult: 1.012, defense: { detection: 5 } },
    icon: '📺',
  },
  {
    id: 'plant_sad',
    name: 'Sad Plant',
    category: 'utility',
    tier: 1,
    description: 'Still alive. Barely.',
    costMoney: 10_000,
    effect: { defense: { durability: 1 } },
    icon: '🪴',
  },
  {
    id: 'plant_jungle',
    name: 'Jungle Corner',
    category: 'luxury',
    tier: 4,
    description: 'Photosynthesis of guilt.',
    costMoney: 540_000,
    effect: { incomeMult: 1.008, heatMitigation: 0.992 },
    icon: '🌿',
  },
  {
    id: 'cam_toy',
    name: 'Toy Camera',
    category: 'utility',
    tier: 1,
    description: 'For aesthetic only.',
    costMoney: 16_000,
    effect: { defense: { detection: 2 } },
    icon: '📷',
  },
  {
    id: 'cam_security',
    name: 'Security Camera',
    category: 'security',
    tier: 3,
    description: 'Evidence is a vibe.',
    costMoney: 198_000,
    effect: { heatMitigation: 0.98, defense: { detection: 10 } },
    icon: '📹',
  },
  {
    id: 'cam_smart',
    name: 'Smart Camera',
    category: 'security',
    tier: 4,
    description: 'Cloud-backed paranoia.',
    costMoney: 750_000,
    effect: { heatMitigation: 0.975, rivalLossMitigation: 0.94, defense: { detection: 14 } },
    icon: '📹',
  },
  {
    id: 'cam_luxury',
    name: 'Luxury Surveillance',
    category: 'security',
    tier: 5,
    description: 'You see everything. Including yourself.',
    costMoney: 2_900_000,
    effect: {
      heatMitigation: 0.965,
      rivalLossMitigation: 0.9,
      defense: { detection: 18, security: 8 },
    },
    icon: '🎥',
  },
  {
    id: 'shelf_ikea',
    name: 'Flatpack Shelf',
    category: 'utility',
    tier: 2,
    description: 'Instructions optional.',
    costMoney: 39_000,
    effect: { powerMult: 1.002 },
    icon: '📚',
  },
  {
    id: 'shelf_mahogany',
    name: 'Mahogany Shelf',
    category: 'luxury',
    tier: 4,
    description: 'Heavy books. Heavier implications.',
    costMoney: 920_000,
    effect: { incomeMult: 1.009, defense: { intimidation: 3 } },
    icon: '📚',
  },
  {
    id: 'wall_art',
    name: 'Dubious Art',
    category: 'luxury',
    tier: 3,
    description: 'Explains your tax situation.',
    costMoney: 132_000,
    effect: { incomeMult: 1.004, defense: { intimidation: 3 } },
    icon: '🖼️',
  },
  {
    id: 'wall_safe',
    name: 'Wall Safe',
    category: 'security',
    tier: 4,
    description: 'Cash-adjacent storage.',
    costMoney: 620_000,
    effect: { rivalLossMitigation: 0.92, defense: { durability: 14, security: 6 } },
    icon: '🔒',
  },
  {
    id: 'comfort_throw',
    name: 'Cashmere Throw',
    category: 'luxury',
    tier: 3,
    description: 'Soft enough to bribe.',
    costMoney: 98_000,
    effect: { incomeMult: 1.005 },
    icon: '🧣',
  },
  {
    id: 'weird_gnome',
    name: 'Suspicious Gnome',
    category: 'utility',
    tier: 2,
    description: 'Knows too much.',
    costMoney: 28_000,
    effect: { defense: { intimidation: 3 } },
    icon: '🪆',
  },
]

const byId: Record<string, HouseItemDef> = Object.fromEntries(HOUSE_ITEMS.map((x) => [x.id, x]))

export function houseItemById(id: string): HouseItemDef | undefined {
  return byId[id]
}
