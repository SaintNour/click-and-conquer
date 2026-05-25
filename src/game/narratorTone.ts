export type NarratorBubbleTone =
  | 'neutral'
  | 'hustle'
  | 'upgrade'
  | 'victory'
  | 'fail'
  | 'danger'
  | 'rival'
  | 'milestone'
  | 'idle'

/** Map narrator template keys to bubble chrome / motion emphasis (UI-only). */
export function narratorToneFromKey(key: string | null): NarratorBubbleTone {
  if (!key) return 'neutral'
  if (key.startsWith('danger_')) return 'danger'
  if (key.startsWith('rival_evt_')) return 'rival'
  if (key.startsWith('rival_')) return 'danger'
  if (key.startsWith('life_')) return 'milestone'
  if (key.startsWith('story_')) return 'milestone'
  if (key === 'territory_fail') return 'fail'
  if (key === 'territory_success' || key === 'territory_unlock_business') return 'victory'
  if (key === 'click') return 'hustle'
  if (
    key === 'buy_recruit' ||
    key === 'buy_business' ||
    key === 'buy_shop_upgrade' ||
    key === 'shop_purchase_major' ||
    key === 'shop_unlock_notable' ||
    key === 'shop_unlock_new'
  ) {
    return 'upgrade'
  }
  if (key === 'shop_purchase_legendary' || key === 'shop_unlock_spike') return 'milestone'
  if (key.startsWith('progress_')) return 'milestone'
  if (key.startsWith('achievement_')) return 'milestone'
  if (key === 'save') return 'milestone'
  if (key.startsWith('event_')) return 'milestone'
  if (key === 'idle') return 'idle'
  if (key === 'welcome') return 'neutral'
  if (key === 'buy_house_item') return 'upgrade'
  if (key === 'title_promotion') return 'milestone'
  return 'neutral'
}
