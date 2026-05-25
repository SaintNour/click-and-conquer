import gsap from 'gsap'

function reducedMotion(): boolean {
  return (
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )
}

/** Subtle idle loop on avatar face (scale “breathing”). */
export function startAvatarIdle(faceEl: HTMLElement | null): () => void {
  if (!faceEl || reducedMotion()) return () => {}
  gsap.killTweensOf(faceEl, 'scale')
  const t = gsap.to(faceEl, {
    scale: 1.035,
    duration: 2.4,
    ease: 'sine.inOut',
    yoyo: true,
    repeat: -1,
  })
  return () => {
    t.kill()
    gsap.set(faceEl, { clearProps: 'scale' })
  }
}

export type AvatarReactionKind = 'success' | 'fail' | 'danger' | 'rival' | 'revenge'

export function playAvatarReaction(
  avatarBtnEl: HTMLElement | null,
  faceEl: HTMLElement | null,
  kind: AvatarReactionKind,
): void {
  if (!avatarBtnEl || reducedMotion()) return
  gsap.killTweensOf([avatarBtnEl, faceEl].filter(Boolean), 'scale,x,opacity,boxShadow,filter')

  if (kind === 'success') {
    gsap.fromTo(
      avatarBtnEl,
      { boxShadow: '0 0 0 rgba(52,211,153,0)' },
      {
        boxShadow:
          '0 0 0 1px rgba(52, 211, 153, 0.55), 0 0 42px rgba(52, 211, 153, 0.42), 0 0 20px rgba(167, 243, 208, 0.25)',
        duration: 0.24,
        ease: 'sine.out',
        yoyo: true,
        repeat: 1,
        onComplete: () => void gsap.set(avatarBtnEl, { clearProps: 'boxShadow' }),
      },
    )
    if (faceEl) {
      gsap.fromTo(
        faceEl,
        { filter: 'brightness(1)' },
        {
          filter: 'brightness(1.28) saturate(1.08)',
          duration: 0.2,
          yoyo: true,
          repeat: 1,
          onComplete: () => void gsap.set(faceEl, { clearProps: 'filter' }),
        },
      )
    }
    return
  }

  if (kind === 'fail') {
    const tl = gsap.timeline()
    tl.to(avatarBtnEl, { filter: 'brightness(0.78)', duration: 0.06, ease: 'power1.in' }, 0)
    tl.to(avatarBtnEl, { x: -5, duration: 0.04, ease: 'power1.inOut' })
    tl.to(avatarBtnEl, { x: 5, duration: 0.06, ease: 'power1.inOut' })
    tl.to(avatarBtnEl, { x: -3, duration: 0.05, ease: 'power1.inOut' })
    tl.to(avatarBtnEl, { x: 0, duration: 0.08, ease: 'power2.out' })
    tl.to(avatarBtnEl, { filter: 'brightness(1)', duration: 0.18, ease: 'power2.out' })
    tl.eventCallback('onComplete', () => {
      void gsap.set(avatarBtnEl, { clearProps: 'x,filter' })
    })
    return
  }

  if (kind === 'danger' || kind === 'rival') {
    const glow =
      kind === 'rival'
        ? '0 0 0 1px rgba(220, 38, 38, 0.48), 0 0 40px rgba(88, 28, 135, 0.42), 0 0 28px rgba(220, 38, 38, 0.25)'
        : '0 0 0 1px rgba(220, 38, 38, 0.42), 0 0 36px rgba(220, 38, 38, 0.38)'
    gsap.fromTo(
      avatarBtnEl,
      { boxShadow: '0 0 0 rgba(220,38,38,0)' },
      {
        boxShadow: glow,
        duration: kind === 'rival' ? 0.26 : 0.32,
        ease: 'sine.out',
        yoyo: true,
        repeat: 1,
        onComplete: () => void gsap.set(avatarBtnEl, { clearProps: 'boxShadow' }),
      },
    )
    return
  }

  // revenge
  gsap.fromTo(
    avatarBtnEl,
    { boxShadow: '0 0 0 rgba(212,160,23,0)' },
    {
      boxShadow: '0 0 0 1px rgba(212, 160, 23, 0.45), 0 0 36px rgba(168, 85, 247, 0.35)',
      duration: 0.3,
      ease: 'sine.out',
      yoyo: true,
      repeat: 1,
      onComplete: () => void gsap.set(avatarBtnEl, { clearProps: 'boxShadow' }),
    },
  )
}

export function playAvatarHover(avatarBtnEl: HTMLElement | null): void {
  if (!avatarBtnEl || reducedMotion()) return
  gsap.killTweensOf(avatarBtnEl, 'scale')
  gsap.to(avatarBtnEl, { scale: 1.04, duration: 0.18, ease: 'power2.out' })
}

export function playAvatarHoverOut(avatarBtnEl: HTMLElement | null): void {
  if (!avatarBtnEl || reducedMotion()) return
  gsap.to(avatarBtnEl, { scale: 1, duration: 0.22, ease: 'power2.inOut' })
}

export function playAvatarClick(avatarBtnEl: HTMLElement | null): void {
  if (!avatarBtnEl || reducedMotion()) return
  gsap.killTweensOf(avatarBtnEl, 'scale')
  gsap
    .timeline()
    .to(avatarBtnEl, { scale: 0.94, duration: 0.07, ease: 'power2.in' })
    .to(avatarBtnEl, { scale: 1.03, duration: 0.2, ease: 'back.out(2)' })
    .to(avatarBtnEl, { scale: 1, duration: 0.12, ease: 'power2.out' })
}

export function playTitleRankUp(titleEl: HTMLElement | null): void {
  if (!titleEl || reducedMotion()) return
  gsap.killTweensOf(titleEl, 'opacity,scale,filter,textShadow')
  gsap
    .timeline({
      onComplete: () => {
        void gsap.set(titleEl, { clearProps: 'filter,textShadow' })
      },
    })
    .fromTo(
      titleEl,
      { opacity: 0.72, scale: 0.94 },
      {
        opacity: 1,
        scale: 1.06,
        duration: 0.34,
        ease: 'power2.out',
      },
    )
    .to(titleEl, { scale: 1, duration: 0.3, ease: 'sine.out' })
    .to(
      titleEl,
      {
        textShadow: '0 0 22px rgba(212, 160, 23, 0.55), 0 0 36px rgba(168, 85, 247, 0.22)',
        duration: 0.38,
        yoyo: true,
        repeat: 1,
        ease: 'sine.out',
      },
      '-=0.12',
    )
}
