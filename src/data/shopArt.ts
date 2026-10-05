/**
 * Visual identity for shop rows — custom neon-noir art in `/public/shop/`.
 * Emoji strings still work as fallbacks (isEmojiArt handles both).
 */
export const RECRUIT_ART: Record<string, string> = {
  lookout: '/shop/lookout.png',
  runner: '/shop/runner.png',
  muscle: '/shop/muscle.png',
  fixer: '/shop/fixer.png',
  enforcer: '/shop/enforcer.png',
  lieutenant: '/shop/lieutenant.png',
  captain: '/shop/captain.png',
  underboss: '/shop/underboss.png',
}

export const BUSINESS_ART: Record<string, string> = {
  stall: '/shop/stall.png',
  laundry: '/shop/laundry.png',
  club: '/shop/club.png',
  tower: '/shop/tower.png',
  garage: '/shop/garage.png',
  warehouse: '/shop/warehouse.png',
  casino: '/shop/casino.png',
  logistics_hub: '/shop/logistics_hub.png',
  skylot_plaza: '/shop/skylot_plaza.png',
  charter_row: '/shop/charter_row.png',
}

export function recruitArt(id: string): string {
  return RECRUIT_ART[id] ?? '✨'
}

export function businessArt(id: string): string {
  return BUSINESS_ART[id] ?? '✨'
}

export function isEmojiArt(s: string): boolean {
  return !s.startsWith('/') && !s.startsWith('http')
}
