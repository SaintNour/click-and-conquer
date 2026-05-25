import gsap from 'gsap'

const BTN_SHADOW_BASE =
  'rgba(0, 0, 0, 0.35) 0 14px 22px -6px, rgba(0, 0, 0, 0.2) 0 6px 10px -4px, inset 0 0 0 1px rgba(255, 255, 255, 0.08)'

/** Snappy punch + elastic settle — click satisfaction. */
export function playHustlePress(buttonEl: HTMLElement | null): void {
  if (!buttonEl) return
  gsap.killTweensOf(buttonEl)
  gsap
    .timeline()
    .to(buttonEl, {
      scale: 0.76,
      duration: 0.032,
      ease: 'power4.in',
    })
    .to(buttonEl, {
      scale: 1.2,
      duration: 0.1,
      ease: 'power3.out',
    })
    .to(buttonEl, {
      scale: 1,
      duration: 0.2,
      ease: 'elastic.out(1, 0.38)',
    })
}

/** Dual halo: cash green core + street purple rim. */
export function pulseHustleGlowAndBorder(
  glowEl: HTMLElement | null,
  buttonEl: HTMLElement | null,
): void {
  if (glowEl) {
    gsap.killTweensOf(glowEl)
    gsap
      .timeline()
      .fromTo(
        glowEl,
        { opacity: 0.26, scale: 1 },
        {
          opacity: 1,
          scale: 1.32,
          duration: 0.09,
          ease: 'power2.out',
        },
      )
      .to(glowEl, {
        opacity: 0.38,
        scale: 1,
        duration: 0.34,
        ease: 'sine.out',
      })
  }

  if (buttonEl) {
    gsap.killTweensOf(buttonEl, 'boxShadow')
    gsap
      .timeline({
        onComplete: () => {
          gsap.set(buttonEl, { clearProps: 'boxShadow' })
        },
      })
      .fromTo(
        buttonEl,
        {
          boxShadow: `${BTN_SHADOW_BASE}, 0 0 0 1px rgba(52, 211, 153, 0.5)`,
        },
        {
          boxShadow: `${BTN_SHADOW_BASE}, 0 0 52px 8px rgba(52, 211, 153, 0.68), 0 0 36px 5px rgba(167, 139, 250, 0.78)`,
          duration: 0.082,
          ease: 'power2.out',
        },
      )
      .to(buttonEl, {
        boxShadow: `${BTN_SHADOW_BASE}, 0 0 28px 4px rgba(167, 139, 250, 0.52)`,
        duration: 0.14,
        ease: 'power2.inOut',
      })
      .to(buttonEl, {
        boxShadow: BTN_SHADOW_BASE,
        duration: 0.18,
        ease: 'sine.out',
      })
  }
}
