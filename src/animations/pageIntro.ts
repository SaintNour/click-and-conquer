import gsap from 'gsap'

/** One-time staggered reveal for main UI + background (UI-only). */
export function playPageIntro(rootEl: HTMLElement | null, streetBgSelector = '.street-bg'): void {
  if (!rootEl || typeof window === 'undefined') return

  const ui = rootEl

  const run = (street: HTMLElement | null) => {
    gsap.set(ui, { opacity: 0, y: 22, filter: 'blur(10px)' })
    if (street) {
      gsap.set(street, { opacity: 0, scale: 1.07 })
    }

    const tl = gsap.timeline({ defaults: { ease: 'power4.out' } })
    if (street) {
      tl.to(street, { opacity: 1, scale: 1, duration: 1.35, ease: 'power2.out' }, 0)
    }
    tl.to(
      ui,
      { opacity: 1, y: 0, filter: 'blur(0px)', duration: 0.85, ease: 'power3.out' },
      street ? 0.08 : 0,
    )

    const staggerTargets = ui.querySelectorAll('.intro-stagger')
    if (staggerTargets.length) {
      gsap.set(staggerTargets, { opacity: 0, y: 26, rotateX: -6 })
      tl.to(
        staggerTargets,
        {
          opacity: 1,
          y: 0,
          rotateX: 0,
          duration: 0.58,
          stagger: { each: 0.065, from: 'start' },
          ease: 'back.out(1.15)',
        },
        street ? 0.18 : 0.06,
      )
    }
  }

  const findStreet = () => document.querySelector(streetBgSelector) as HTMLElement | null
  let street = findStreet()
  if (!street) {
    requestAnimationFrame(() => {
      street = findStreet()
      if (!street) {
        window.setTimeout(() => run(findStreet()), 120)
        return
      }
      run(street)
    })
    return
  }
  run(street)
}
