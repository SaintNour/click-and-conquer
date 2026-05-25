import gsap from 'gsap'

/**
 * Subtle red veil pulse + light screen shake. pointer-events never captured.
 */
export function playDangerFeedback(
  overlayEl: HTMLElement | null,
  shakeRootEl: HTMLElement | null,
): void {
  const reduce =
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

  if (overlayEl && !reduce) {
    gsap.killTweensOf(overlayEl)
    gsap.fromTo(
      overlayEl,
      { opacity: 0 },
      {
        opacity: 0.1,
        duration: 0.12,
        ease: 'power1.inOut',
        yoyo: true,
        repeat: 1,
        onComplete: () => {
          gsap.set(overlayEl, { opacity: 0 })
        },
      },
    )
  }

  if (shakeRootEl && !reduce) {
    gsap.killTweensOf(shakeRootEl, 'x,y')
    gsap.to(shakeRootEl, {
      x: 2.5,
      duration: 0.03,
      ease: 'power1.inOut',
      yoyo: true,
      repeat: 5,
      onComplete: () => {
        gsap.set(shakeRootEl, { clearProps: 'x,y' })
      },
    })
  }
}
