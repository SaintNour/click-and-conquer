import { useCallback, useEffect, useLayoutEffect, useRef } from 'react'
import { playFailSfx, playSuccessSfx } from '../audio/gameSfx'
import type { GameState } from '../data/types'
import { playEventOutcomeEnter, playEventOutcomeExit } from '../animations/eventModalFx'

type Banner = NonNullable<GameState['eventOutcomeBanner']>

function formatStatDeltas(d: NonNullable<Banner['statDeltas']>): string {
  const parts: string[] = []
  if (d.money) {
    parts.push(
      `Cash ${d.money > 0 ? 'up ' : 'down '}$${Math.abs(Math.round(d.money)).toLocaleString()}`,
    )
  }
  if (d.power) {
    parts.push(
      `Power ${d.power > 0 ? 'up ' : 'down '}${Math.abs(Math.round(d.power)).toLocaleString()}`,
    )
  }
  if (d.heat) {
    parts.push(`Heat ${d.heat > 0 ? 'up ' : 'down '}${Math.abs(Math.round(d.heat))}`)
  }
  if (d.passiveScale) {
    const pct = Math.round(d.passiveScale * 1000) / 10
    parts.push(`Empire scale ${d.passiveScale > 0 ? 'up ' : 'down '}${Math.abs(pct)}%`)
  }
  return parts.join(' · ')
}

type Props = {
  banner: Banner
  onDismiss: () => void
}

function outcomeHoldMs(b: Banner): number {
  if (b.variant === 'heat-crackdown') return 4500
  return b.fromLifeEvent ? 3400 : 5200
}

function playOutcomeSfx(variant: Banner['variant']): void {
  if (variant === 'heat-crackdown') return
  if (variant === 'fail' || variant.endsWith('-fail')) {
    playFailSfx()
    return
  }
  if (variant === 'neutral') return
  playSuccessSfx()
}

export function EventOutcomeBanner({ banner, onDismiss }: Props) {
  const rootRef = useRef<HTMLDivElement>(null)
  const dismissTimerRef = useRef<number>(0)
  const deadlineRef = useRef<number>(0)
  const remainingOnPauseRef = useRef<number>(0)

  const clearDismissTimer = useCallback(() => {
    window.clearTimeout(dismissTimerRef.current)
    dismissTimerRef.current = 0
  }, [])

  const scheduleDismiss = useCallback(
    (ms: number) => {
      clearDismissTimer()
      if (ms <= 0) {
        playEventOutcomeExit(rootRef.current, onDismiss)
        return
      }
      dismissTimerRef.current = window.setTimeout(() => {
        playEventOutcomeExit(rootRef.current, onDismiss)
      }, ms)
    },
    [clearDismissTimer, onDismiss],
  )

  useLayoutEffect(() => {
    const el = rootRef.current
    playEventOutcomeEnter(el, banner.variant)
    queueMicrotask(() => playOutcomeSfx(banner.variant))
    const hold = outcomeHoldMs(banner)
    deadlineRef.current = Date.now() + hold
    scheduleDismiss(hold)
    return () => clearDismissTimer()
  }, [
    banner.title,
    banner.detail,
    banner.variant,
    banner.fromLifeEvent,
    banner.homeDefenseHighlight,
    clearDismissTimer,
    scheduleDismiss,
  ])

  const dismissNow = useCallback(() => {
    clearDismissTimer()
    playEventOutcomeExit(rootRef.current, onDismiss)
  }, [clearDismissTimer, onDismiss])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') dismissNow()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [dismissNow])

  const onPointerEnter = () => {
    clearDismissTimer()
    remainingOnPauseRef.current = Math.max(0, deadlineRef.current - Date.now())
  }

  const onPointerLeave = () => {
    const ms = Math.max(400, remainingOnPauseRef.current)
    deadlineRef.current = Date.now() + ms
    scheduleDismiss(ms)
  }

  const deltaLine = banner.statDeltas ? formatStatDeltas(banner.statDeltas) : ''

  return (
    <div
      ref={rootRef}
      className={`event-outcome event-outcome--${banner.variant}`}
      role="status"
      aria-live="polite"
      onPointerEnter={onPointerEnter}
      onPointerLeave={onPointerLeave}
    >
      <div className="event-outcome__chrome" aria-hidden />
      <h3 className="event-outcome__title">{banner.title}</h3>
      <p className="event-outcome__detail">{banner.detail}</p>
      {deltaLine ? <p className="event-outcome__deltas">{deltaLine}</p> : null}
      {banner.homeDefenseHighlight ? (
        <p className="event-outcome__home-highlight">{banner.homeDefenseHighlight}</p>
      ) : null}
      <p className="event-outcome__auto-hint">
        Fades in a few seconds — hover to read longer. Press Esc to close.
      </p>
    </div>
  )
}
