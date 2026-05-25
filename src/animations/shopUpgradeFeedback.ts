import gsap from 'gsap'
import type { ShopUpgradeDef } from '../data/shopUpgrades'
import { animateUpgradePurchase } from './upgradeRow'
import { maxEffectMultiplier, purchaseCelebrationTier } from '../game/shopUpgradePresentation'

/**
 * Newly available upgrade slides into attention (unlock wave).
 */
export function animateShopUpgradeUnlock(rowEl: HTMLElement | null, def: ShopUpgradeDef): void {
  if (!rowEl) return
  gsap.killTweensOf(rowEl)
  const spike = def.tier >= 4 || maxEffectMultiplier(def) >= 3
  gsap
    .timeline()
    .fromTo(
      rowEl,
      { x: 22, opacity: 0.55, filter: 'brightness(0.88) saturate(0.9)' },
      {
        x: 0,
        opacity: 1,
        filter: 'brightness(1) saturate(1)',
        duration: spike ? 0.58 : 0.42,
        ease: 'power3.out',
      },
    )
    .to(
      rowEl,
      {
        scale: 1.02,
        duration: 0.14,
        yoyo: true,
        repeat: 1,
        ease: 'sine.inOut',
      },
      '-=0.12',
    )

  const glow =
    def.tier >= 5
      ? '0 0 0 1px rgba(250, 204, 21, 0.45), 0 0 36px 8px rgba(168, 85, 247, 0.55)'
      : spike
        ? '0 0 0 1px rgba(168, 85, 247, 0.4), 0 0 28px 6px rgba(52, 211, 153, 0.35)'
        : '0 0 0 1px rgba(139, 92, 246, 0.25), 0 0 18px 2px rgba(88, 28, 135, 0.35)'

  gsap.fromTo(
    rowEl,
    { boxShadow: '0 0 0 0 rgba(0,0,0,0)' },
    {
      boxShadow: glow,
      duration: 0.22,
      ease: 'power2.out',
      yoyo: true,
      repeat: 1,
      clearProps: 'boxShadow',
    },
  )
}

function spawnFloatBurstInto(
  host: HTMLElement,
  lines: string[],
  strong: boolean,
  offsetMode: 'row' | 'viewport',
): void {
  const wrap = document.createElement('div')
  wrap.className = 'shop-upgrade-float-burst'
  wrap.setAttribute('aria-hidden', 'true')
  host.appendChild(wrap)
  lines.forEach((text, i) => {
    const span = document.createElement('span')
    span.className = `shop-upgrade-float shop-upgrade-float--burst${strong ? ' shop-upgrade-float--burst-strong' : ''}`
    span.textContent = text
    if (offsetMode === 'row') {
      span.style.left = `${12 + i * 26}px`
      span.style.top = `${4 + (i % 2) * 8}px`
    } else {
      span.style.left = `${-20 + i * 28}px`
      span.style.top = `${-6 + (i % 2) * 10}px`
    }
    wrap.appendChild(span)
    gsap.fromTo(
      span,
      { opacity: 0, y: 10, scale: 0.6, rotation: -4 + i * 3 },
      {
        opacity: 1,
        y: -6,
        scale: 1,
        rotation: 0,
        duration: 0.2,
        delay: i * 0.05,
        ease: 'back.out(2)',
      },
    )
    gsap.to(span, {
      opacity: 0,
      y: -36 - i * 6,
      duration: strong ? 0.75 : 0.55,
      delay: 0.28 + i * 0.06,
      ease: 'power2.in',
      onComplete: () => {
        span.remove()
        if (!wrap.children.length) wrap.remove()
      },
    })
  })
}

function spawnFloatBurst(rowEl: HTMLElement, lines: string[], strong: boolean): void {
  rowEl.style.position = 'relative'
  spawnFloatBurstInto(rowEl, lines, strong, 'row')
}

/** Celebration after empire card is removed — fixed at viewport point (mirrors row purchase tiers). */
function spawnViewportPurchaseBurst(
  cx: number,
  cy: number,
  def: ShopUpgradeDef,
  label: string,
): void {
  const tier = purchaseCelebrationTier(def)
  const mx = Math.round(maxEffectMultiplier(def))
  const strong = tier === 'legendary'
  const lines = strong ? [label, `×${mx}`, 'SURGE'] : [label, `×${mx}`]

  const root = document.createElement('div')
  root.className = 'empire-upgrade-burst-root'
  root.setAttribute('aria-hidden', 'true')
  root.style.cssText = `position:fixed;left:${cx}px;top:${cy}px;width:220px;height:160px;transform:translate(-50%,-50%);pointer-events:none;z-index:200;overflow:visible;`
  document.body.appendChild(root)

  const mountCenteredFloat = (
    className: string,
    text: string,
    anim: { from: gsap.TweenVars; mid: gsap.TweenVars; out: gsap.TweenVars; midAt?: string },
  ): void => {
    const anchor = document.createElement('div')
    anchor.className = 'empire-upgrade-burst-anchor'
    anchor.setAttribute('aria-hidden', 'true')
    const float = document.createElement('span')
    float.className = className
    float.textContent = text
    anchor.appendChild(float)
    root.appendChild(anchor)
    gsap.set(anchor, { position: 'absolute', left: '50%', top: '0.35rem', xPercent: -50 })
    gsap
      .timeline({
        onComplete: () => {
          anchor.remove()
        },
      })
      .fromTo(anchor, anim.from, anim.mid)
      .to(anchor, anim.out, anim.midAt ?? '+=0.08')
  }

  if (tier === 'normal') {
    mountCenteredFloat('shop-upgrade-float', label, {
      from: { y: 6, opacity: 0, scale: 0.85 },
      mid: { y: -28, opacity: 1, scale: 1, duration: 0.38, ease: 'power2.out' },
      out: { y: -48, opacity: 0, duration: 0.5, ease: 'power2.in' },
      midAt: '+=0.08',
    })
  } else {
    spawnFloatBurstInto(root, lines, strong, 'viewport')
    mountCenteredFloat('shop-upgrade-float shop-upgrade-float--single', label, {
      from: { y: 10, opacity: 0, scale: 0.85 },
      mid: { y: -32, opacity: 1, scale: 1.05, duration: 0.35, ease: 'power2.out' },
      out: { y: -52, opacity: 0, duration: 0.55, ease: 'power2.in' },
      midAt: '+=0.1',
    })
  }

  gsap.delayedCall(1.45, () => {
    if (root.parentNode) root.remove()
  })
}

/** Card grid: first appearance (fade + rise). */
export function animateShopUpgradeCardEnter(cardEl: HTMLElement | null): void {
  if (!cardEl) return
  gsap.killTweensOf(cardEl)
  gsap.fromTo(
    cardEl,
    { opacity: 0, y: 16, scale: 0.96 },
    { opacity: 1, y: 0, scale: 1, duration: 0.48, ease: 'power3.out' },
  )
}

/**
 * Empire card: pop + fade, then callback (apply purchase), then viewport celebration.
 */
export function animateShopUpgradeCardPurchaseExit(
  cardEl: HTMLElement | null,
  def: ShopUpgradeDef,
  label: string,
  onDone: () => void,
): void {
  if (!cardEl) {
    onDone()
    return
  }
  const rect = cardEl.getBoundingClientRect()
  const cx = rect.left + rect.width / 2
  const cy = rect.top + rect.height / 2

  gsap.killTweensOf(cardEl)
  gsap
    .timeline({
      onComplete: () => {
        onDone()
        spawnViewportPurchaseBurst(cx, cy, def, label)
      },
    })
    .to(cardEl, { scale: 1.15, duration: 0.15, ease: 'power2.out' })
    .to(cardEl, { opacity: 0, scale: 0.88, duration: 0.34, ease: 'power2.in' }, '+=0.02')
}

/**
 * Purchase feedback scales with celebration tier (major / legendary spikes).
 */
export function animateShopUpgradePurchase(
  rowEl: HTMLElement | null,
  def: ShopUpgradeDef,
  label: string,
): void {
  if (!rowEl) return
  const tier = purchaseCelebrationTier(def)

  if (tier === 'normal') {
    animateShopUpgradePurchaseNormal(rowEl, label)
    return
  }

  animateUpgradePurchase(rowEl)

  const strong = tier === 'legendary'
  gsap.killTweensOf(rowEl, 'boxShadow,scale')

  const pulseScale = strong ? 1.06 : 1.045
  gsap
    .timeline()
    .to(rowEl, {
      scale: pulseScale,
      duration: 0.09,
      ease: 'power4.out',
    })
    .to(rowEl, {
      scale: 1,
      duration: 0.55,
      ease: 'elastic.out(1, 0.42)',
    })

  const shadowA = strong
    ? '0 0 0 2px rgba(250, 204, 21, 0.55), 0 0 48px 12px rgba(168, 85, 247, 0.65), 0 0 72px 24px rgba(52, 211, 153, 0.35)'
    : '0 0 0 2px rgba(168, 85, 247, 0.5), 0 0 36px 10px rgba(52, 211, 153, 0.45)'

  gsap.timeline().to(rowEl, { boxShadow: shadowA, duration: 0.1, ease: 'power2.out' }).to(rowEl, {
    boxShadow: '0 0 0 0 rgba(0,0,0,0)',
    duration: 0.85,
    ease: 'sine.out',
    clearProps: 'boxShadow',
  })

  const mx = Math.round(maxEffectMultiplier(def))
  const lines = strong ? [label, `×${mx}`, 'SURGE'] : [label, `×${mx}`]

  spawnFloatBurst(rowEl, lines, strong)

  const float = document.createElement('span')
  float.className = 'shop-upgrade-float shop-upgrade-float--single'
  float.textContent = label
  float.setAttribute('aria-hidden', 'true')
  rowEl.appendChild(float)
  gsap
    .timeline({ onComplete: () => float.remove() })
    .fromTo(
      float,
      { y: 10, opacity: 0, scale: 0.85 },
      { y: -32, opacity: 1, scale: 1.05, duration: 0.35, ease: 'power2.out' },
    )
    .to(float, { y: -52, opacity: 0, duration: 0.55, ease: 'power2.in' }, '+=0.1')
}

function animateShopUpgradePurchaseNormal(rowEl: HTMLElement | null, label: string): void {
  animateUpgradePurchase(rowEl)
  if (!rowEl) return

  gsap.killTweensOf(rowEl, 'boxShadow')
  gsap
    .timeline()
    .fromTo(
      rowEl,
      { boxShadow: '0 0 0 0 rgba(168, 85, 247, 0)' },
      {
        boxShadow:
          '0 0 0 1px rgba(212, 160, 23, 0.35), 0 0 28px 4px rgba(168, 85, 247, 0.45), 0 0 40px rgba(74, 222, 128, 0.2)',
        duration: 0.12,
        ease: 'power2.out',
      },
    )
    .to(rowEl, {
      boxShadow: '0 0 0 0 rgba(0,0,0,0)',
      duration: 0.55,
      ease: 'sine.out',
      clearProps: 'boxShadow',
    })

  const float = document.createElement('span')
  float.className = 'shop-upgrade-float'
  float.textContent = label
  float.setAttribute('aria-hidden', 'true')
  rowEl.style.position = 'relative'
  rowEl.appendChild(float)
  gsap
    .timeline({ onComplete: () => float.remove() })
    .fromTo(
      float,
      { y: 6, opacity: 0, scale: 0.85 },
      { y: -28, opacity: 1, scale: 1, duration: 0.38, ease: 'power2.out' },
    )
    .to(float, { y: -48, opacity: 0, duration: 0.5, ease: 'power2.in' }, '+=0.08')
}
