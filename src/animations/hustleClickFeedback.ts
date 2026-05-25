import { spawnFloatingClickRewards } from './floatingRewards'
import { pulseHustleGlowAndBorder, playHustlePress } from './hustleButton'
import { spawnHustleRipple } from './hustleRipple'
import { spawnHustleSparks } from './hustleSparks'

export type HustleClickFeedbackOpts = {
  button: HTMLElement | null
  glow: HTMLElement | null
  floatLayer: HTMLElement | null
  rippleHost: HTMLElement | null
  /** Optional host for radial sparks (e.g. button wrap). */
  sparkHost: HTMLElement | null
  clientX: number
  clientY: number
  moneyGain: number
  powerGain: number
}

/**
 * All GSAP feedback for one Hustle click (UI-only). Game logic runs separately.
 */
export function playHustleClickFeedback(opts: HustleClickFeedbackOpts): void {
  const { button, glow, rippleHost, sparkHost, clientX, clientY, moneyGain, powerGain } = opts

  playHustlePress(button)
  pulseHustleGlowAndBorder(glow, button)
  spawnHustleSparks(sparkHost, clientX, clientY)

  if (rippleHost) {
    const r = rippleHost.getBoundingClientRect()
    const lx = clientX - r.left
    const ly = clientY - r.top
    spawnHustleRipple(rippleHost, lx, ly)
  }

  spawnFloatingClickRewards(null, moneyGain, powerGain, undefined, {
    viewportClient: { x: clientX, y: clientY },
  })
}
