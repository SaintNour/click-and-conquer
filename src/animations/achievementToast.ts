import gsap from 'gsap'

function reduceMotion(): boolean {
  return (
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )
}

export function playAchievementToastEnter(
  el: HTMLElement | null,
  opts?: { stackIndex?: number },
): gsap.core.Timeline {
  if (!el) return gsap.timeline()
  gsap.killTweensOf(el)
  if (reduceMotion()) {
    return gsap.timeline().set(el, { x: 0, opacity: 1, filter: 'none', scale: 1 })
  }
  const stack = Math.min(2, opts?.stackIndex ?? 0)
  const x0 = 28 + stack * 10
  const s0 = 0.92 - stack * 0.02
  const o0 = stack > 0 ? 0.5 : 0
  return gsap
    .timeline()
    .fromTo(
      el,
      { x: x0, opacity: o0, filter: 'blur(8px)', scale: s0 },
      {
        x: 0,
        opacity: stack > 0 ? 0.94 : 1,
        filter: 'blur(0px)',
        scale: stack > 0 ? 0.98 : 1,
        duration: 0.38,
        ease: 'power3.out',
      },
    )
    .to(el, {
      boxShadow:
        '0 0 0 1px rgba(212, 160, 23, 0.35), 0 0 28px 6px rgba(168, 85, 247, 0.4), 0 0 40px rgba(52, 211, 153, 0.12)',
      duration: 0.2,
      ease: 'power2.out',
      yoyo: true,
      repeat: 1,
      clearProps: 'boxShadow',
    })
}

export function playAchievementToastExit(el: HTMLElement | null, onComplete: () => void): void {
  if (!el) {
    onComplete()
    return
  }
  if (reduceMotion()) {
    gsap.to(el, { opacity: 0, duration: 0.15, onComplete })
    return
  }
  gsap.to(el, {
    x: 36,
    opacity: 0,
    filter: 'blur(5px)',
    scale: 0.94,
    duration: 0.32,
    ease: 'power2.in',
    onComplete,
  })
}
