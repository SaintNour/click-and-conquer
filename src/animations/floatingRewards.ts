import gsap from 'gsap'

const MAX_ANCHORS = 9
const STACK_STEP = 9
const STACK_MAX = 6

const spawnSeqByContainer = new WeakMap<HTMLElement, number>()

function nextSpawnIndex(container: HTMLElement): number {
  const n = (spawnSeqByContainer.get(container) ?? 0) + 1
  spawnSeqByContainer.set(container, n)
  return n
}

function pruneOldAnchors(container: HTMLElement): void {
  while (container.querySelectorAll('.float-reward-anchor').length >= MAX_ANCHORS) {
    const first = container.querySelector('.float-reward-anchor')
    if (!first) break
    first.querySelectorAll('.float-reward').forEach((n) => gsap.killTweensOf(n))
    gsap.killTweensOf(first)
    first.remove()
  }
}

function makeLabel(text: string, className: string): HTMLSpanElement {
  const el = document.createElement('span')
  el.className = className
  el.textContent = text
  el.setAttribute('aria-hidden', 'true')
  return el
}

function nearInteger(n: number): boolean {
  return Math.abs(n - Math.round(n)) < 0.051
}

/** Matches `applyClick` gains: not floored (avoids showing +$1 when +2.7 was applied). */
function formatMoneyFloater(raw: number): string | null {
  if (raw <= 0) return null
  if (nearInteger(raw)) return `+$${Math.round(raw).toLocaleString()}`
  if (raw < 40) return `+$${raw.toFixed(1)}`
  return `+$${Math.round(raw).toLocaleString()}`
}

function formatPowerFloater(raw: number): string | null {
  if (raw <= 0) return null
  if (nearInteger(raw)) return `+${Math.round(raw).toLocaleString()} ⚡`
  if (raw < 40) return `+${raw.toFixed(1)} ⚡`
  return `+${Math.round(raw).toLocaleString()} ⚡`
}

export type FloatAnchor = { kind: 'point'; x: number; y: number } | { kind: 'aboveCenter' }

export type SpawnFloatingRewardsOptions = {
  /** Pinned to viewport (document.body); avoids overflow:hidden on game columns. */
  viewportClient?: { x: number; y: number }
}

function runFloat(
  el: HTMLElement,
  rise: number,
  onDone: () => void,
  delay = 0,
  tilt = 0,
  xBias = 0,
): void {
  gsap.killTweensOf(el)
  const drift = xBias + (Math.random() - 0.5) * 22
  const wobble = tilt * 0.35 + (Math.random() - 0.5) * 6
  gsap
    .timeline({ onComplete: onDone, delay })
    .fromTo(
      el,
      { y: 20, opacity: 0, scale: 0.62, rotation: tilt, x: drift * 0.2 },
      {
        y: 0,
        opacity: 1,
        scale: 1.18,
        rotation: 0,
        x: 0,
        duration: 0.14,
        ease: 'back.out(2.8)',
      },
    )
    .to(el, {
      scale: 1,
      duration: 0.08,
      ease: 'power2.out',
    })
    .to(el, {
      y: -rise,
      x: drift,
      opacity: 0,
      scale: 0.88,
      rotation: wobble,
      duration: 0.82,
      ease: 'power3.inOut',
    })
}

/**
 * Money + power floaters: separated lanes, punchy pop, smooth exit.
 * Use `viewportClient` so rewards render above the full UI (not clipped by panels).
 */
export function spawnFloatingClickRewards(
  container: HTMLElement | null,
  moneyGain: number,
  powerGain: number,
  anchor?: FloatAnchor,
  options?: SpawnFloatingRewardsOptions,
): void {
  const vp = options?.viewportClient
  const useViewport = vp != null && typeof document !== 'undefined'
  const parent: HTMLElement | null = useViewport ? document.body : container
  if (!parent) return

  const moneyText = formatMoneyFloater(moneyGain)
  const powerText = formatPowerFloater(powerGain)
  if (!moneyText && !powerText) return

  pruneOldAnchors(parent)

  const rect = !useViewport && container ? container.getBoundingClientRect() : null
  const w = rect?.width || 1
  const h = rect?.height || 1

  let baseX: number
  let baseY: number
  if (useViewport && vp) {
    const jitterX = (Math.random() - 0.5) * 30
    const jitterY = (Math.random() - 0.5) * 20
    baseX = vp.x + jitterX
    baseY = vp.y + jitterY
  } else if (anchor?.kind === 'point') {
    baseX = anchor.x
    baseY = anchor.y + 10
  } else {
    baseX = w * 0.5
    baseY = h * 0.72
  }

  const seq = nextSpawnIndex(parent)
  const stackLift = Math.min(STACK_MAX, Math.floor((seq - 1) / 2) % (STACK_MAX + 1)) * STACK_STEP

  const spreadY = (Math.random() - 0.5) * 8

  const root = document.createElement('div')
  root.className = 'float-reward-anchor'
  if (useViewport && vp) {
    root.style.position = 'fixed'
    root.style.left = `${baseX}px`
    root.style.top = `${baseY - stackLift + spreadY}px`
    root.style.transform = 'translate(-50%, -50%)'
    root.style.zIndex = '48'
  } else {
    root.style.position = 'absolute'
    root.style.left = `${baseX}px`
    root.style.top = `${baseY - stackLift + spreadY}px`
    root.style.zIndex = String(12 + (seq % 50))
  }

  const moneyEl = moneyText ? makeLabel(moneyText, 'float-reward float-reward--money') : null
  const powerEl = powerText ? makeLabel(powerText, 'float-reward float-reward--power') : null

  if (moneyEl) root.appendChild(moneyEl)
  if (powerEl) root.appendChild(powerEl)
  parent.appendChild(root)

  let remaining = (moneyEl ? 1 : 0) + (powerEl ? 1 : 0)
  const finishPart = () => {
    remaining -= 1
    if (remaining <= 0) {
      gsap.killTweensOf(root)
      root.remove()
    }
  }

  const riseM = 52 + Math.random() * 18
  const riseP = 50 + Math.random() * 18

  if (moneyEl) {
    runFloat(
      moneyEl,
      riseM,
      () => {
        moneyEl.remove()
        finishPart()
      },
      0,
      -5,
      -12,
    )
  }

  if (powerEl) {
    runFloat(
      powerEl,
      riseP,
      () => {
        powerEl.remove()
        finishPart()
      },
      moneyEl ? 0.09 : 0,
      5,
      12,
    )
  }
}
