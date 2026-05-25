export type AchievementCategory =
  | 'economy'
  | 'power'
  | 'units'
  | 'businesses'
  | 'territories'
  | 'rivals'
  | 'special'

/** Small permanent multipliers; stack multiplicatively. */
export type AchievementReward = {
  allMoneyMult?: number
  allPowerMult?: number
  clickMoneyMult?: number
  clickPowerMult?: number
  passiveMoneyMult?: number
  passivePowerMult?: number
  /** Applies to business-derived income (click + passive from businesses). */
  businessIncomeMult?: number
}

export type AchievementDef = {
  id: string
  category: AchievementCategory
  name: string
  description: string
  hidden: boolean
  predicateId: string
  predicateArg: number | { recruitId: string; n: number } | { businessId: string; n: number } | null
  reward: AchievementReward
}
