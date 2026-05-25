import gsap from 'gsap'

export type NarratorMotion = 'bar' | 'card'

/**
 * Fade + slide when narrator copy changes (UI-only).
 */
export function animateNarratorLineChange(
  textEl: HTMLElement | null,
  motion: NarratorMotion = 'bar',
): void {
  if (!textEl) return
  const dy = motion === 'bar' ? 10 : 6
  gsap.killTweensOf(textEl)
  gsap.fromTo(
    textEl,
    { opacity: 0, y: dy },
    {
      opacity: 1,
      y: 0,
      duration: motion === 'bar' ? 0.5 : 0.38,
      ease: 'power3.out',
    },
  )
}
