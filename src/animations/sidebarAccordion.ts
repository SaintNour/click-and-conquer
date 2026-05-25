import gsap from 'gsap'

function reducedMotion(): boolean {
  return (
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )
}

export function setAccordionContentInstant(wrapEl: HTMLElement | null, open: boolean): void {
  if (!wrapEl) return
  gsap.killTweensOf(wrapEl)
  if (open) {
    gsap.set(wrapEl, { height: 'auto', opacity: 1, overflow: 'visible' })
  } else {
    gsap.set(wrapEl, { height: 0, opacity: 0, overflow: 'hidden' })
  }
}

export function animateAccordionContent(
  wrapEl: HTMLElement | null,
  innerEl: HTMLElement | null,
  open: boolean,
  skipAnimation: boolean,
): void {
  if (!wrapEl || !innerEl) return
  gsap.killTweensOf(wrapEl)

  if (reducedMotion() || skipAnimation) {
    setAccordionContentInstant(wrapEl, open)
    return
  }

  if (open) {
    const h = innerEl.scrollHeight
    gsap.fromTo(
      wrapEl,
      { height: 0, opacity: 0, overflow: 'hidden' },
      {
        height: h,
        opacity: 1,
        duration: 0.32,
        ease: 'power2.out',
        onComplete: () => {
          gsap.set(wrapEl, { height: 'auto', overflow: 'visible' })
        },
      },
    )
  } else {
    const h = innerEl.offsetHeight
    gsap.set(wrapEl, { height: h, overflow: 'hidden' })
    gsap.to(wrapEl, {
      height: 0,
      opacity: 0,
      duration: 0.26,
      ease: 'power2.in',
    })
  }
}
