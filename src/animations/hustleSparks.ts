import gsap from 'gsap'

/** Split emerald + violet sparks; staggered for density without noise. */
export function spawnHustleSparks(
  host: HTMLElement | null,
  clientX: number,
  clientY: number,
): void {
  if (!host) return
  const rect = host.getBoundingClientRect()
  const cx = clientX - rect.left
  const cy = clientY - rect.top
  const n = 18
  for (let i = 0; i < n; i++) {
    const el = document.createElement('span')
    const isCash = i % 2 === 0
    el.className = `hustle-spark ${isCash ? 'hustle-spark--cash' : 'hustle-spark--juice'}`
    el.setAttribute('aria-hidden', 'true')
    const angle = (Math.PI * 2 * i) / n + Math.random() * 0.4
    const dist = 44 + Math.random() * 40
    el.style.left = `${cx}px`
    el.style.top = `${cy}px`
    host.appendChild(el)
    gsap.fromTo(
      el,
      { x: 0, y: 0, opacity: 0.95, scale: 0.25 },
      {
        x: Math.cos(angle) * dist,
        y: Math.sin(angle) * dist,
        opacity: 0,
        scale: 1.15,
        duration: 0.34 + Math.random() * 0.12,
        delay: i * 0.01,
        ease: 'power3.out',
        onComplete: () => el.remove(),
      },
    )
  }
}
