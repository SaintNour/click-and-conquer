import gsap from 'gsap'

/** Draw attention when a territory unlocks new business rows in the shop. */
export function animateBusinessUnlockReveal(rowEl: HTMLElement | null): void {
  if (!rowEl) return
  gsap.killTweensOf(rowEl, 'x,scale,filter,boxShadow')
  gsap
    .timeline({
      onComplete: () => {
        gsap.set(rowEl, { clearProps: 'x,scale,filter,boxShadow' })
      },
    })
    .fromTo(
      rowEl,
      { x: 10, scale: 0.98, filter: 'brightness(1)' },
      {
        x: 0,
        scale: 1,
        filter: 'brightness(1.12)',
        boxShadow: '0 0 22px rgba(52, 211, 153, 0.35)',
        duration: 0.28,
        ease: 'power3.out',
      },
    )
    .to(rowEl, {
      filter: 'brightness(1)',
      boxShadow: '0 0 0 rgba(0,0,0,0)',
      duration: 0.45,
      ease: 'sine.out',
    })
}
