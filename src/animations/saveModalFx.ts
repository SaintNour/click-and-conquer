import gsap from 'gsap'

function reducedMotion(): boolean {
  return (
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )
}

export function playSaveModalOpen(
  backdropEl: HTMLElement | null,
  cardEl: HTMLElement | null,
): gsap.core.Timeline {
  if (!backdropEl || !cardEl || reducedMotion()) {
    if (backdropEl) gsap.set(backdropEl, { opacity: 1 })
    if (cardEl) gsap.set(cardEl, { opacity: 1, scale: 1, y: 0 })
    return gsap.timeline()
  }
  gsap.killTweensOf([backdropEl, cardEl])
  const tl = gsap.timeline()
  tl.fromTo(backdropEl, { opacity: 0 }, { opacity: 1, duration: 0.22, ease: 'power2.out' })
  tl.fromTo(
    cardEl,
    { opacity: 0, y: 18, scale: 0.96 },
    { opacity: 1, y: 0, scale: 1, duration: 0.34, ease: 'power3.out' },
    '-=0.12',
  )
  return tl
}

export function playSaveModalClose(
  backdropEl: HTMLElement | null,
  cardEl: HTMLElement | null,
  onDone: () => void,
): void {
  if (!backdropEl || !cardEl || reducedMotion()) {
    onDone()
    return
  }
  gsap.killTweensOf([backdropEl, cardEl])
  gsap
    .timeline({
      onComplete: onDone,
    })
    .to(cardEl, { opacity: 0, y: 10, scale: 0.98, duration: 0.22, ease: 'power2.in' })
    .to(backdropEl, { opacity: 0, duration: 0.18, ease: 'power2.in' }, '-=0.1')
}

export function playResetConfirmShake(cardEl: HTMLElement | null): void {
  if (!cardEl || reducedMotion()) return
  gsap.killTweensOf(cardEl, 'x')
  const tl = gsap.timeline()
  tl.to(cardEl, { x: -5, duration: 0.05, ease: 'power1.inOut' })
  tl.to(cardEl, { x: 5, duration: 0.07, ease: 'power1.inOut' })
  tl.to(cardEl, { x: -3, duration: 0.05, ease: 'power1.inOut' })
  tl.to(cardEl, { x: 0, duration: 0.08, ease: 'power2.out' })
}
