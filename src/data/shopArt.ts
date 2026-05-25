/**
 * Visual identity for shop rows — emoji placeholders until you drop PNG/SVG into `/public/shop/`.
 * Replace values with paths like `/shop/lookout.png` when assets exist; UI uses `isEmojiArt`.
 */
export const RECRUIT_ART: Record<string, string> = {
  lookout: '👁️',
  runner: '🏃',
  muscle: '💪',
  fixer: '🎩',
  enforcer: '🛡️',
  lieutenant: '⭐',
  captain: '🎖️',
  underboss: '👑',
}

export const BUSINESS_ART: Record<string, string> = {
  stall: '🥡',
  laundry: '🧺',
  club: '🎵',
  tower: '🏢',
  garage: '🔧',
  warehouse: '📦',
  casino: '🎰',
  logistics_hub: '🚛',
  skylot_plaza: '🏬',
  charter_row: '📜',
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
