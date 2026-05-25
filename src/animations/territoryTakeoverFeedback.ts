import gsap from 'gsap'

export type TerritoryTakeoverTargets = {
  rowEl: HTMLElement | null
  burstHost: HTMLElement | null
  badgeEl: HTMLElement | null
  rewardMoney: number
  /** Fires when the main row timeline finishes (~0.32s). */
  onComplete?: () => void
}

const GLOW_PEAK =
  '0 0 36px rgba(234, 179, 8, 0.55), 0 0 32px rgba(168, 85, 247, 0.48), inset 0 0 0 1px rgba(255, 255, 255, 0.12)'

/**
 * Territory capture: flash sweep, shake, scale punch, burst, badge pop.
 */
export function playTerritoryTakeoverCelebration(targets: TerritoryTakeoverTargets): void {
  const { rowEl, burstHost, badgeEl, rewardMoney, onComplete } = targets
  if (!rowEl) {
    onComplete?.()
    return
  }

  gsap.killTweensOf(rowEl, 'transform,boxShadow,x')

  const flash = document.createElement('span')
  flash.className = 'territory-row__flash'
  flash.setAttribute('aria-hidden', 'true')
  rowEl.insertBefore(flash, rowEl.firstChild)

  if (burstHost) {
    spawnTerritoryMoneyBurst(burstHost, rewardMoney)
    spawnTerritorySparks(burstHost)
  }

  if (badgeEl) {
    gsap.set(badgeEl, { opacity: 0, scale: 0.6, y: 6 })
  }

  const tl = gsap.timeline({
    onComplete: () => {
      gsap.set(rowEl, { clearProps: 'boxShadow,x' })
      flash.remove()
      onComplete?.()
    },
  })

  tl.fromTo(flash, { opacity: 0.85 }, { opacity: 0, duration: 0.45, ease: 'power2.out' }, 0)

  tl.to(rowEl, { x: -4, duration: 0.04, ease: 'power2.out' }, 0)
  tl.to(rowEl, { x: 5, duration: 0.05, ease: 'power2.inOut' }, 0.04)
  tl.to(rowEl, { x: -2, duration: 0.04, ease: 'power2.inOut' }, 0.09)
  tl.to(rowEl, { x: 0, duration: 0.06, ease: 'power3.out' }, 0.13)

  tl.to(rowEl, { scale: 1.06, duration: 0.12, ease: 'power2.out', transformOrigin: '50% 50%' }, 0)
  tl.to(rowEl, { scale: 1, duration: 0.16, ease: 'elastic.out(1, 0.65)' }, 0.12)

  tl.fromTo(
    rowEl,
    { boxShadow: '0 0 0 rgba(0,0,0,0)' },
    { boxShadow: GLOW_PEAK, duration: 0.14, ease: 'sine.out' },
    0,
  )
  tl.to(rowEl, { boxShadow: '0 0 0 rgba(0,0,0,0)', duration: 0.2, ease: 'sine.in' }, 0.14)

  if (badgeEl) {
    tl.to(badgeEl, { opacity: 1, scale: 1, y: 0, duration: 0.28, ease: 'back.out(2)' }, 0.08)
  }
}

function spawnTerritorySparks(host: HTMLElement): void {
  const cx = host.offsetWidth * 0.75
  const cy = host.offsetHeight * 0.38
  for (let i = 0; i < 8; i++) {
    const s = document.createElement('span')
    s.className = 'territory-spark'
    s.setAttribute('aria-hidden', 'true')
    s.style.left = `${cx}px`
    s.style.top = `${cy}px`
    host.appendChild(s)
    const ang = (Math.PI * 2 * i) / 8
    const d = 28 + (i % 3) * 8
    gsap.fromTo(
      s,
      { x: 0, y: 0, opacity: 1, scale: 0.5 },
      {
        x: Math.cos(ang) * d,
        y: Math.sin(ang) * d,
        opacity: 0,
        scale: 1,
        duration: 0.5,
        ease: 'power2.out',
        delay: i * 0.02,
        onComplete: () => s.remove(),
      },
    )
  }
}

function spawnTerritoryMoneyBurst(host: HTMLElement, rewardMoney: number): void {
  const el = document.createElement('span')
  el.className = 'territory-burst-money'
  el.textContent = `+$${Math.floor(rewardMoney).toLocaleString()}`
  el.setAttribute('aria-hidden', 'true')
  host.appendChild(el)

  gsap
    .timeline({
      onComplete: () => {
        gsap.killTweensOf(el)
        el.remove()
      },
    })
    .fromTo(
      el,
      { y: 18, opacity: 0, scale: 0.65, rotation: -6 },
      {
        y: -6,
        opacity: 1,
        scale: 1.18,
        rotation: 0,
        duration: 0.16,
        ease: 'back.out(2.2)',
      },
    )
    .to(el, {
      y: -48,
      opacity: 0,
      scale: 1,
      duration: 0.34,
      ease: 'power2.in',
    })
}
