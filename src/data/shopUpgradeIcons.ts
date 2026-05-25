/**
 * Visual icon per shop upgrade id (emoji for now; swap for image URLs later).
 */
export const SHOP_UPGRADE_ICON: Record<string, string> = {
  loose_change: '💰',
  street_smarts: '🧠',
  caffeine: '☕',
  whisper_net: '👁️',
  hot_dog_cart: '🌭',
  double_down: '🎰',
  twin_engine: '⚙️',
  binoculars: '🔭',
  fast_kicks: '👟',
  spotter_synergy: '🕸️',
  night_shift: '🌙',
  loyalty_cards: '💳',
  knife: '🗡️',
  extra_spin: '🌀',
  bass_boost: '🔊',
  briefcase: '💼',
  compound_growth: '📈',
  fear_factor: '💀',
  payroll_pipeline: '🧾',
  tax_avoidance: '🧮',
  triplicate: '📚',
  five_alarm: '🔔',
  gun: '🔫',
  penthouse_key: '🗝️',
  muscle_escort: '🛡️',
  empire_mandate: '👑',
}

export function shopUpgradeIcon(id: string): string {
  return SHOP_UPGRADE_ICON[id] ?? '✨'
}
