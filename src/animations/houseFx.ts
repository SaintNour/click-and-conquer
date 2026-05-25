import gsap from 'gsap'

function reducedMotion(): boolean {
  return (
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )
}

/** HQ panel pulse when a home-targeted rival event is queued. */
export function playHomeThreatPulse(panelEl: HTMLElement | null): void {
  if (!panelEl || reducedMotion()) return
  gsap.killTweensOf(panelEl, 'boxShadow,x')
  const tl = gsap.timeline({
    onComplete: () => {
      void gsap.set(panelEl, { clearProps: 'boxShadow,x' })
    },
  })
  tl.fromTo(
    panelEl,
    { boxShadow: '0 0 0 rgba(220,38,38,0)' },
    {
      boxShadow: '0 0 0 1px rgba(220, 38, 38, 0.5), 0 0 36px rgba(220, 38, 38, 0.28)',
      duration: 0.38,
      ease: 'sine.out',
      yoyo: true,
      repeat: 1,
    },
  )
  tl.to(panelEl, { x: -4, duration: 0.04, ease: 'power1.inOut' }, 0.06)
  tl.to(panelEl, { x: 4, duration: 0.06, ease: 'power1.inOut' })
  tl.to(panelEl, { x: -2, duration: 0.05, ease: 'power1.inOut' })
  tl.to(panelEl, { x: 0, duration: 0.08, ease: 'power2.out' })
}

export function playHouseSlotPlaceAnim(slotEl: HTMLElement | null): void {
  if (!slotEl) return
  gsap.killTweensOf(slotEl)
  gsap.fromTo(
    slotEl,
    { scale: 0.88, boxShadow: '0 0 0 rgba(212,160,23,0)' },
    {
      scale: 1,
      boxShadow: '0 0 18px 2px rgba(212, 160, 23, 0.35)',
      duration: 0.32,
      ease: 'back.out(2)',
      yoyo: true,
      repeat: 1,
      onComplete: () => {
        gsap.set(slotEl, { clearProps: 'boxShadow' })
      },
    },
  )
}

export function startHouseItemIdle(iconEl: HTMLElement | null): () => void {
  if (!iconEl || reducedMotion()) return () => {}
  gsap.killTweensOf(iconEl, 'y,scale')
  const tween = gsap.to(iconEl, {
    y: -2.5,
    scale: 1.06,
    duration: 2.1,
    ease: 'sine.inOut',
    yoyo: true,
    repeat: -1,
  })
  return () => {
    tween.kill()
    gsap.set(iconEl, { clearProps: 'y,scale' })
  }
}
