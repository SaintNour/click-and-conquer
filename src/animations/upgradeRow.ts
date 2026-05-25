import gsap from 'gsap'

/**
 * Short press feedback when activating a shop card (scale down, release).
 */
export function animateShopCardPress(rowEl: HTMLElement | null): void {
  if (!rowEl) return
  const reduce =
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  if (reduce) return
  gsap.killTweensOf(rowEl, 'scale')
  gsap
    .timeline()
    .to(rowEl, { scale: 0.98, duration: 0.07, ease: 'power2.in' })
    .to(rowEl, { scale: 1, duration: 0.16, ease: 'power2.out' })
}

/**
 * Quick pop on an upgrade row after a successful purchase.
 */
export function animateUpgradePurchase(rowEl: HTMLElement | null): void {
  if (!rowEl) return
  gsap.killTweensOf(rowEl)
  gsap
    .timeline()
    .to(rowEl, {
      scale: 1.045,
      duration: 0.08,
      ease: 'power3.out',
    })
    .to(rowEl, {
      scale: 1,
      duration: 0.48,
      ease: 'elastic.out(1, 0.48)',
    })
}
