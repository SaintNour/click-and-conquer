import gsap from 'gsap'

const RIPPLE_SIZE = 96

/**
 * Stacked rings: fast emerald core + slower violet shock — reads at any click rate.
 */
export function spawnHustleRipple(
  rippleHost: HTMLElement | null,
  localX: number,
  localY: number,
): void {
  if (!rippleHost) return

  const half = RIPPLE_SIZE / 2

  const ringCore = document.createElement('span')
  ringCore.className = 'hustle-btn__ripple hustle-btn__ripple--core'
  ringCore.style.left = `${localX - half}px`
  ringCore.style.top = `${localY - half}px`
  rippleHost.appendChild(ringCore)

  gsap.fromTo(
    ringCore,
    { scale: 0.2, opacity: 0.75 },
    {
      scale: 1.65,
      opacity: 0,
      duration: 0.32,
      ease: 'power3.out',
      onComplete: () => ringCore.remove(),
    },
  )

  const ringOuter = document.createElement('span')
  ringOuter.className = 'hustle-btn__ripple hustle-btn__ripple--outer'
  ringOuter.style.left = `${localX - half}px`
  ringOuter.style.top = `${localY - half}px`
  rippleHost.appendChild(ringOuter)

  gsap.fromTo(
    ringOuter,
    { scale: 0.35, opacity: 0.5 },
    {
      scale: 2.35,
      opacity: 0,
      duration: 0.48,
      ease: 'power2.out',
      delay: 0.02,
      onComplete: () => ringOuter.remove(),
    },
  )

  const ringEcho = document.createElement('span')
  ringEcho.className = 'hustle-btn__ripple hustle-btn__ripple--echo'
  ringEcho.style.left = `${localX - half}px`
  ringEcho.style.top = `${localY - half}px`
  rippleHost.appendChild(ringEcho)

  gsap.fromTo(
    ringEcho,
    { scale: 0.15, opacity: 0.35 },
    {
      scale: 2.85,
      opacity: 0,
      duration: 0.55,
      ease: 'power1.out',
      delay: 0.04,
      onComplete: () => ringEcho.remove(),
    },
  )
}
