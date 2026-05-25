import gsap from 'gsap'
import type { NarratorBubbleTone } from '../game/narratorTone'

export const bossBubbleToneClass = (t: NarratorBubbleTone): string => {
  switch (t) {
    case 'danger':
      return 'boss-card__bubble--danger'
    case 'rival':
      return 'boss-card__bubble--rival'
    case 'fail':
      return 'boss-card__bubble--fail'
    case 'victory':
      return 'boss-card__bubble--victory'
    case 'hustle':
      return 'boss-card__bubble--hustle'
    case 'upgrade':
      return 'boss-card__bubble--upgrade'
    case 'milestone':
      return 'boss-card__bubble--milestone'
    case 'idle':
      return 'boss-card__bubble--idle'
    default:
      return 'boss-card__bubble--neutral'
  }
}

/** Apply tone modifier classes without running entrance animation. */
export function setBossBubbleTone(bubbleEl: HTMLElement | null, tone: NarratorBubbleTone): void {
  if (!bubbleEl) return
  for (const c of bubbleEl.classList) {
    if (c.startsWith('boss-card__bubble--') && c !== 'boss-card__bubble') {
      bubbleEl.classList.remove(c)
    }
  }
  bubbleEl.classList.add(bossBubbleToneClass(tone))
}

export type BossBubbleAnimateOpts = {
  /** Character reveal; off for very long lines. Default: on when line length ≤ 100. */
  typing?: boolean
}

/** Animate boss speech bubble when copy or tone changes (UI-only). */
export function animateBossNarratorBubble(
  bubbleEl: HTMLElement | null,
  textEl: HTMLElement | null,
  line: string,
  tone: NarratorBubbleTone,
  opts?: BossBubbleAnimateOpts,
): void {
  if (!bubbleEl || !textEl) return

  for (const c of bubbleEl.classList) {
    if (c.startsWith('boss-card__bubble--') && c !== 'boss-card__bubble') {
      bubbleEl.classList.remove(c)
    }
  }
  bubbleEl.classList.add(bossBubbleToneClass(tone))

  gsap.killTweensOf([bubbleEl, textEl])
  const useTyping =
    (opts?.typing ?? true) && line.length > 0 && line.length <= 100 && !line.includes('\n')
  if (!useTyping) {
    textEl.textContent = line
  } else {
    textEl.textContent = ''
  }

  const tl = gsap.timeline()
  tl.fromTo(
    bubbleEl,
    {
      opacity: 0,
      y: 16,
      scale: 0.92,
      transformOrigin: '18% 0%',
      filter: 'blur(8px) brightness(0.94)',
    },
    {
      opacity: 1,
      y: 0,
      scale: 1,
      filter: 'blur(0px) brightness(1) drop-shadow(0 0 0px rgba(168, 85, 247, 0))',
      duration: 0.48,
      ease: 'back.out(1.42)',
    },
    0,
  ).to(
    bubbleEl,
    {
      filter: 'blur(0px) brightness(1) drop-shadow(0 0 18px rgba(168, 85, 247, 0.48))',
      duration: 0.44,
      ease: 'sine.out',
      yoyo: true,
      repeat: 1,
    },
    '-=0.1',
  )

  if (useTyping) {
    const proxy = { len: 0 }
    tl.to(
      proxy,
      {
        len: line.length,
        duration: Math.min(1.05, 0.12 + line.length * 0.017),
        ease: 'none',
        onUpdate: () => {
          textEl.textContent = line.slice(0, Math.floor(proxy.len))
        },
      },
      0.1,
    ).fromTo(textEl, { opacity: 0.35 }, { opacity: 1, duration: 0.2, ease: 'power2.out' }, 0.1)
  } else {
    tl.fromTo(
      textEl,
      { opacity: 0, y: 6 },
      { opacity: 1, y: 0, duration: 0.36, ease: 'power3.out' },
      0.08,
    )
  }

  tl.eventCallback('onComplete', () => {
    gsap.set(bubbleEl, { clearProps: 'filter' })
  })
}

/** Subtle “boss presence” pulse on avatar when tone is victory or milestone. */
export function pulseBossAvatar(avatarEl: HTMLElement | null, tone: NarratorBubbleTone): void {
  if (!avatarEl) return
  if (tone !== 'victory' && tone !== 'milestone' && tone !== 'upgrade' && tone !== 'rival') return
  gsap.killTweensOf(avatarEl)
  const glow =
    tone === 'rival'
      ? '0 0 26px 3px rgba(220, 38, 38, 0.42), 0 0 18px 2px rgba(88, 28, 135, 0.35)'
      : '0 0 24px 2px rgba(168, 85, 247, 0.45)'
  gsap.fromTo(
    avatarEl,
    { boxShadow: '0 0 0 0 rgba(212, 160, 23, 0)' },
    {
      boxShadow: glow,
      duration: tone === 'rival' ? 0.32 : 0.25,
      yoyo: true,
      repeat: 1,
      ease: 'sine.inOut',
      onComplete: () => {
        gsap.set(avatarEl, { clearProps: 'boxShadow' })
      },
    },
  )
}
