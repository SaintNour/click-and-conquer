import type { ShopUpgradeDef } from '../data/shopUpgrades'

/** Largest single multiplicative factor in an upgrade (ignores synergy curves). */
export function maxEffectMultiplier(def: ShopUpgradeDef): number {
  let m = 1
  for (const e of def.effects) {
    if (e.kind === 'global' || e.kind === 'recruit' || e.kind === 'business') {
      m = Math.max(m, e.mult)
    }
    if (e.kind === 'synergy_business_recruit_power') {
      m = Math.max(m, e.capMult)
    }
  }
  return m
}

export type CelebrationTier = 'normal' | 'major' | 'legendary'

export function purchaseCelebrationTier(def: ShopUpgradeDef): CelebrationTier {
  const mx = maxEffectMultiplier(def)
  if (def.tier >= 5 || mx >= 10) return 'legendary'
  if (def.tier >= 4 || mx >= 3) return 'major'
  return 'normal'
}

/** Narrator key for successful purchase (used by game logic). */
export function shopPurchaseNarratorKey(def: ShopUpgradeDef): string {
  const c = purchaseCelebrationTier(def)
  if (c === 'legendary') return 'shop_purchase_legendary'
  if (c === 'major') return 'shop_purchase_major'
  return 'buy_shop_upgrade'
}

/** True if row should show “almost there” tease (unlocked, not owned, not affordable yet). */
export function isNearBreakthroughTease(
  def: ShopUpgradeDef,
  owned: boolean,
  unlocked: boolean,
  affordable: boolean,
  money: number,
): boolean {
  if (owned || !unlocked || affordable) return false
  if (def.tier < 3 && maxEffectMultiplier(def) < 2.5) return false
  return money >= def.cost * 0.48
}

export function unlockNarratorKey(def: ShopUpgradeDef): string {
  if (def.tier >= 4) return 'shop_unlock_spike'
  if (def.tier >= 2) return 'shop_unlock_notable'
  return 'shop_unlock_new'
}
