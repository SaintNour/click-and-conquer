export type RivalRelationship = 'neutral' | 'rival' | 'enemy' | 'nemesis'

/** Drives weighting for events and AI-ish flavor */
export type RivalArchetype = 'aggressive' | 'greedy' | 'strategic' | 'reckless' | 'defensive'

export type RivalWarDifficulty = 'easy' | 'normal' | 'hard'

export type RivalState = {
  id: string
  name: string
  /** Person who runs the crew (shown under the gang name in war HUD). */
  leaderName: string
  /** Rough strength used for attack costs / outcomes */
  powerLevel: number
  /** 0–1, weights random selection & intensity */
  aggression: number
  /** Flavor + slight scaling */
  territoryCount: number
  relationship: RivalRelationship
  archetype: RivalArchetype
  /** Liquid assets flavor + light scaling */
  wealth: number
  /** Pressure on your turf (0–100) */
  territoryPressure: number
  alive: boolean
  /** CSS hex or token for UI accents */
  colorTag: string
  /** War track HP (elimination spawns successor “Jr”). */
  warHp: number
  warMaxHp: number
  warDifficulty: RivalWarDifficulty
  /**
   * War-track power pool (0–100). Drains every time the rival exchanges blows.
   * When it hits 0, the rival is "broken": incoming hits become weak and the
   * player can Truce out of the war cleanly (no revenge flag).
   */
  warPowerHp: number
  warPowerHpMax: number
  /** Tier (1..N) the gang operates in — drives which territories they own + City Map filter. */
  tier: number
  /**
   * Relationship sub-bar (0–100) inside the current `relationship` tier.
   * Crossing 100 escalates the tier; crossing 0 de-escalates it. Starts at 50 (neutral mid-tier).
   */
  relationshipPoints: number
}

export type PendingRivalEncounter = {
  kind: 'attack' | 'revenge'
  rivalId: string
  defendPowerCost: number
  payMoneyCost: number
  /** Chance that "Ignore" backfires */
  ignoreFailChance: number
  /** Revenge-only */
  revengePowerCost: number
  revengeRewardMoney: number
  revengeRewardPower: number
}

/**
 * Incoming war-line strike from a rival. When a rival "lands a hit" tick fires,
 * we no longer apply damage immediately — instead we surface this popup so the
 * player can choose to spend power to defend, or take the hit and bleed HP.
 */
export type PendingWarStrike = {
  rivalId: string
  /** HP damage the strike will inflict if the player doesn't defend. */
  incomingDamage: number
  /** Power the player must spend to fully block the strike. */
  defendPowerCost: number
}
