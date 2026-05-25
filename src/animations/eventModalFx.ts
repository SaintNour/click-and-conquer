import gsap from 'gsap'

function reducedMotion(): boolean {
  return (
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )
}

export function playEventBackdropDim(backdropEl: HTMLElement | null): gsap.core.Tween | void {
  if (!backdropEl || reducedMotion()) return
  gsap.killTweensOf(backdropEl)
  return gsap.fromTo(backdropEl, { opacity: 0 }, { opacity: 1, duration: 0.35, ease: 'power2.out' })
}

export function playEventCardEnter(cardEl: HTMLElement | null): gsap.core.Timeline {
  if (!cardEl || reducedMotion()) return gsap.timeline()
  gsap.killTweensOf(cardEl)
  return gsap
    .timeline()
    .fromTo(
      cardEl,
      { opacity: 0, y: 40, x: -16, scale: 0.9, filter: 'blur(10px)' },
      {
        opacity: 1,
        y: 0,
        x: 0,
        scale: 1,
        filter: 'blur(0px)',
        duration: 0.52,
        ease: 'power3.out',
      },
    )
    .to(cardEl, { scale: 1.012, duration: 0.12, ease: 'sine.out' }, '-=0.14')
    .to(cardEl, { scale: 1, duration: 0.2, ease: 'power2.inOut' })
}

/** Darker backdrop + sharper card entrance for rival / revenge street events. */
export function playRivalStreetEventOpen(
  backdropEl: HTMLElement | null,
  cardEl: HTMLElement | null,
  opts: { isRevenge: boolean; isHomeThreat?: boolean },
): gsap.core.Timeline {
  if (!cardEl) return gsap.timeline()
  if (reducedMotion()) {
    if (backdropEl) gsap.set(backdropEl, { opacity: 1 })
    return gsap.timeline()
  }
  if (backdropEl) {
    gsap.killTweensOf(backdropEl)
    gsap.fromTo(
      backdropEl,
      { opacity: 0 },
      { opacity: 1, duration: opts.isRevenge ? 0.4 : 0.34, ease: 'power2.out' },
    )
    if (opts.isHomeThreat) {
      gsap.fromTo(
        backdropEl,
        { boxShadow: 'inset 0 0 0 rgba(220,38,38,0)' },
        {
          boxShadow: 'inset 0 0 140px rgba(220, 38, 38, 0.2)',
          duration: 0.58,
          ease: 'sine.out',
          yoyo: true,
          repeat: 1,
          onComplete: () => {
            void gsap.set(backdropEl, { clearProps: 'boxShadow' })
          },
        },
      )
    }
  }
  gsap.killTweensOf(cardEl)
  const y0 = opts.isRevenge ? 44 : opts.isHomeThreat ? 38 : 34
  const s0 = opts.isRevenge ? 0.88 : opts.isHomeThreat ? 0.91 : 0.92
  const x0 = opts.isRevenge ? -18 : opts.isHomeThreat ? -14 : -12
  const tl = gsap.timeline()
  tl.fromTo(
    cardEl,
    { opacity: 0, y: y0, x: x0, scale: s0, filter: 'blur(10px)' },
    {
      opacity: 1,
      y: 0,
      x: 0,
      scale: 1,
      filter: 'blur(0px)',
      duration: opts.isRevenge ? 0.58 : opts.isHomeThreat ? 0.54 : 0.52,
      ease: 'power3.out',
    },
  )
  if (opts.isRevenge) {
    tl.to(cardEl, { scale: 1.025, duration: 0.14, ease: 'sine.out' }, '-=0.12')
    tl.to(cardEl, { scale: 1, duration: 0.2, ease: 'sine.inOut' })
  } else if (opts.isHomeThreat) {
    tl.to(
      cardEl,
      {
        boxShadow: '0 0 0 1px rgba(220, 38, 38, 0.42), 0 0 56px -6px rgba(220, 38, 38, 0.32)',
        duration: 0.36,
        ease: 'sine.out',
        yoyo: true,
        repeat: 1,
        onComplete: () => {
          void gsap.set(cardEl, { clearProps: 'boxShadow' })
        },
      },
      '-=0.1',
    )
  }
  return tl
}

export function playEventChoicePress(btn: HTMLElement | null): Promise<void> {
  if (!btn || reducedMotion()) return Promise.resolve()
  return new Promise((resolve) => {
    gsap.killTweensOf(btn, 'scale')
    gsap
      .timeline({
        onComplete: () => resolve(),
      })
      .to(btn, { scale: 0.97, duration: 0.06, ease: 'power2.in' })
      .to(btn, { scale: 1, duration: 0.2, ease: 'power2.out' })
  })
}

export function playEventOutcomeEnter(
  panelEl: HTMLElement | null,
  variant: string = 'neutral',
): gsap.core.Timeline {
  if (!panelEl || reducedMotion()) return gsap.timeline()
  gsap.killTweensOf(panelEl, 'opacity,y,scale,x,filter,boxShadow')
  const revenge = variant.startsWith('revenge-')
  const rival = variant.startsWith('rival-')
  const home = variant.startsWith('home-')
  const fromY = revenge ? 28 : home ? 22 : rival ? 20 : 18
  const fromScale = revenge ? 0.84 : home ? 0.88 : rival ? 0.9 : 0.92
  const slideX = revenge ? -12 : home ? -8 : rival ? -8 : -6
  const dur = revenge ? 0.54 : home ? 0.5 : rival ? 0.48 : 0.44
  const ease = revenge ? 'back.out(1.35)' : 'power3.out'
  const tl = gsap
    .timeline()
    .fromTo(
      panelEl,
      { opacity: 0, y: fromY, scale: fromScale, x: slideX },
      { opacity: 1, y: 0, scale: 1, x: 0, duration: dur, ease },
    )

  const isFail =
    variant === 'fail' ||
    variant === 'revenge-fail' ||
    variant === 'rival-fail' ||
    variant === 'home-fail'

  if (variant === 'heat-crackdown') {
    const shake = 6
    tl.to(
      panelEl,
      { filter: 'brightness(1.1) saturate(1.28)', duration: 0.07, ease: 'power1.in' },
      '-=0.06',
    )
    tl.to(panelEl, { x: -shake, duration: 0.04, ease: 'power1.inOut' })
    tl.to(panelEl, { x: shake, duration: 0.06, ease: 'power1.inOut' })
    tl.to(panelEl, { x: -shake * 0.5, duration: 0.04, ease: 'power1.inOut' })
    tl.to(panelEl, { x: 0, duration: 0.1, ease: 'power2.out' })
    tl.to(
      panelEl,
      {
        boxShadow:
          '0 0 0 2px rgba(220, 38, 38, 0.52), 0 0 56px rgba(220, 38, 38, 0.36), 0 0 32px rgba(59, 130, 246, 0.14)',
        duration: 0.26,
        ease: 'sine.out',
        yoyo: true,
        repeat: 1,
        onComplete: () => void gsap.set(panelEl, { clearProps: 'filter,boxShadow' }),
      },
      '-=0.06',
    )
  } else if (isFail) {
    const shake =
      variant === 'home-fail'
        ? 7
        : variant === 'revenge-fail'
          ? 6
          : variant === 'rival-fail'
            ? 6
            : 5
    tl.to(
      panelEl,
      { filter: 'brightness(0.76) saturate(0.86)', duration: 0.06, ease: 'power1.in' },
      '-=0.08',
    )
    tl.to(panelEl, { x: -shake, duration: 0.045, ease: 'power1.inOut' })
    tl.to(panelEl, { x: shake, duration: 0.065, ease: 'power1.inOut' })
    tl.to(panelEl, { x: -shake * 0.55, duration: 0.045, ease: 'power1.inOut' })
    tl.to(panelEl, { x: 0, duration: 0.1, ease: 'power2.out' })
    tl.to(panelEl, {
      filter: 'brightness(1) saturate(1)',
      duration: 0.24,
      ease: 'power2.out',
      onComplete: () => void gsap.set(panelEl, { clearProps: 'filter' }),
    })
  } else if (variant === 'success') {
    tl.to(
      panelEl,
      {
        boxShadow:
          '0 0 0 1px rgba(52, 211, 153, 0.55), 0 0 64px rgba(52, 211, 153, 0.45), 0 0 32px rgba(167, 243, 208, 0.22)',
        duration: 0.26,
        ease: 'sine.out',
        yoyo: true,
        repeat: 1,
        onComplete: () => void gsap.set(panelEl, { clearProps: 'boxShadow' }),
      },
      '-=0.1',
    )
  } else if (variant === 'rival-success') {
    tl.to(
      panelEl,
      {
        boxShadow:
          '0 0 0 1px rgba(251, 113, 133, 0.45), 0 0 56px rgba(139, 92, 246, 0.36), 0 0 40px rgba(52, 211, 153, 0.2)',
        duration: 0.28,
        ease: 'sine.out',
        yoyo: true,
        repeat: 1,
        onComplete: () => void gsap.set(panelEl, { clearProps: 'boxShadow' }),
      },
      '-=0.1',
    )
  } else if (variant === 'revenge-success') {
    tl.to(
      panelEl,
      {
        boxShadow:
          '0 0 0 1px rgba(212, 160, 23, 0.42), 0 0 52px rgba(212, 160, 23, 0.28), 0 0 48px rgba(168, 85, 247, 0.38)',
        duration: 0.28,
        ease: 'sine.out',
        yoyo: true,
        repeat: 1,
        onComplete: () => void gsap.set(panelEl, { clearProps: 'boxShadow' }),
      },
      '-=0.08',
    )
  } else if (variant === 'home-success') {
    tl.to(
      panelEl,
      {
        boxShadow: '0 0 0 1px rgba(52, 211, 153, 0.42), 0 0 46px rgba(34, 197, 94, 0.32)',
        duration: 0.3,
        ease: 'sine.out',
        yoyo: true,
        repeat: 1,
        onComplete: () => void gsap.set(panelEl, { clearProps: 'boxShadow' }),
      },
      '-=0.08',
    )
  } else if (variant === 'home-partial') {
    tl.to(
      panelEl,
      {
        boxShadow: '0 0 0 1px rgba(251, 191, 36, 0.35), 0 0 38px rgba(245, 158, 11, 0.22)',
        duration: 0.26,
        ease: 'sine.out',
        yoyo: true,
        repeat: 1,
        onComplete: () => void gsap.set(panelEl, { clearProps: 'boxShadow' }),
      },
      '-=0.06',
    )
  }
  return tl
}

export function playEventOutcomeExit(panelEl: HTMLElement | null, onComplete: () => void): void {
  if (!panelEl || reducedMotion()) {
    onComplete()
    return
  }
  gsap.to(panelEl, {
    opacity: 0,
    y: 12,
    scale: 0.97,
    duration: 0.3,
    ease: 'power2.in',
    onComplete,
  })
}
