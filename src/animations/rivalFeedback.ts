import gsap from 'gsap'

function reducedMotion(): boolean {
  return (
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )
}

/** Warning: red pulse + subtle shake (stronger than ambient danger). */
export function playRivalWarning(
  overlayEl: HTMLElement | null,
  shakeRootEl: HTMLElement | null,
): void {
  if (reducedMotion()) return

  if (overlayEl) {
    gsap.killTweensOf(overlayEl)
    gsap.fromTo(
      overlayEl,
      { opacity: 0 },
      {
        opacity: 0.22,
        duration: 0.14,
        ease: 'power1.inOut',
        yoyo: true,
        repeat: 2,
        onComplete: () => {
          gsap.set(overlayEl, { opacity: 0 })
        },
      },
    )
  }

  if (shakeRootEl) {
    gsap.killTweensOf(shakeRootEl, 'x,y')
    gsap.to(shakeRootEl, {
      x: 4,
      duration: 0.035,
      ease: 'power1.inOut',
      yoyo: true,
      repeat: 7,
      onComplete: () => {
        gsap.set(shakeRootEl, { clearProps: 'x,y' })
      },
    })
  }
}

/** Attack: quick flash across the screen. */
export function playRivalAttackFlash(flashEl: HTMLElement | null): void {
  if (!flashEl || reducedMotion()) return
  gsap.killTweensOf(flashEl)
  gsap.fromTo(
    flashEl,
    { opacity: 0 },
    {
      opacity: 0.55,
      duration: 0.06,
      ease: 'power1.out',
      yoyo: true,
      repeat: 1,
      onComplete: () => {
        gsap.set(flashEl, { opacity: 0 })
      },
    },
  )
}

/** Revenge: dramatic shake + overlay punch. */
export function playRivalRevengeDramatic(
  overlayEl: HTMLElement | null,
  shakeRootEl: HTMLElement | null,
): void {
  if (reducedMotion()) return

  if (overlayEl) {
    gsap.killTweensOf(overlayEl)
    gsap
      .timeline()
      .fromTo(overlayEl, { opacity: 0 }, { opacity: 0.28, duration: 0.1, ease: 'power2.out' })
      .to(overlayEl, {
        opacity: 0,
        duration: 0.55,
        ease: 'power2.inOut',
      })
  }

  if (shakeRootEl) {
    gsap.killTweensOf(shakeRootEl, 'x,y,scale')
    gsap
      .timeline()
      .to(shakeRootEl, {
        scale: 1.012,
        duration: 0.12,
        ease: 'power2.out',
      })
      .to(shakeRootEl, {
        x: 6,
        duration: 0.04,
        ease: 'none',
        yoyo: true,
        repeat: 9,
      })
      .to(
        shakeRootEl,
        {
          scale: 1,
          duration: 0.35,
          ease: 'power3.inOut',
          clearProps: 'x,y,scale',
        },
        '<0.1',
      )
  }
}
