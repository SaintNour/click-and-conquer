import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { playAchievementToastEnter, playAchievementToastExit } from '../animations/achievementToast'
import { achievementById } from '../data/achievements'

type Props = {
  achievementId: string
  stackIndex?: number
  /** When true, visible in stack but no auto-dismiss (waits until promoted to front). */
  deferAutoDismiss?: boolean
  onDismiss: () => void
}

const DISPLAY_MS = 4200
const DRAG_THRESHOLD_PX = 6

type DragState = {
  pointerId: number
  startX: number
  startY: number
  originX: number
  originY: number
  moved: boolean
}

/**
 * Single toast; parent may mount several with stackIndex for a vertical stack.
 * Front toast (stackIndex 0): draggable and tap-to-dismiss; auto-fades unless paused while dragging.
 */
export function AchievementToast({
  achievementId,
  stackIndex = 0,
  deferAutoDismiss = false,
  onDismiss,
}: Props) {
  const rootRef = useRef<HTMLDivElement>(null)
  const def = achievementById(achievementId)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const offsetRef = useRef(offset)
  const dragRef = useRef<DragState | null>(null)

  useEffect(() => {
    offsetRef.current = offset
  }, [offset])
  const dismissTimerRef = useRef(0)

  const isFront = stackIndex === 0

  const clearDismissTimer = useCallback(() => {
    window.clearTimeout(dismissTimerRef.current)
    dismissTimerRef.current = 0
  }, [])

  const dismissWithExit = useCallback(() => {
    clearDismissTimer()
    const el = rootRef.current
    if (el) playAchievementToastExit(el, onDismiss)
    else onDismiss()
  }, [clearDismissTimer, onDismiss])

  useLayoutEffect(() => {
    setOffset({ x: 0, y: 0 })
  }, [achievementId])

  useLayoutEffect(() => {
    if (!def) {
      onDismiss()
      return
    }
    const el = rootRef.current
    const tl = playAchievementToastEnter(el, { stackIndex })
    if (deferAutoDismiss) {
      return () => {
        clearDismissTimer()
        tl.kill()
      }
    }
    dismissTimerRef.current = window.setTimeout(() => {
      playAchievementToastExit(el, onDismiss)
    }, DISPLAY_MS)
    return () => {
      clearDismissTimer()
      tl.kill()
    }
  }, [achievementId, def, deferAutoDismiss, onDismiss, stackIndex, clearDismissTimer])

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isFront) return
    e.currentTarget.setPointerCapture(e.pointerId)
    const o = offsetRef.current
    dragRef.current = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      originX: o.x,
      originY: o.y,
      moved: false,
    }
    if (!deferAutoDismiss) clearDismissTimer()
  }

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = dragRef.current
    if (!d || e.pointerId !== d.pointerId) return
    const dx = e.clientX - d.startX
    const dy = e.clientY - d.startY
    if (Math.hypot(dx, dy) > DRAG_THRESHOLD_PX) d.moved = true
    setOffset({ x: d.originX + dx, y: d.originY + dy })
  }

  const onPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = dragRef.current
    if (!d || e.pointerId !== d.pointerId) return
    dragRef.current = null
    try {
      e.currentTarget.releasePointerCapture(e.pointerId)
    } catch {
      /* released */
    }
    if (!isFront) return
    if (!d.moved) {
      dismissWithExit()
      return
    }
    if (!deferAutoDismiss) {
      const el = rootRef.current
      dismissTimerRef.current = window.setTimeout(() => {
        playAchievementToastExit(el, onDismiss)
      }, DISPLAY_MS)
    }
  }

  const onPointerCancel = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = dragRef.current
    if (!d || e.pointerId !== d.pointerId) return
    dragRef.current = null
    try {
      e.currentTarget.releasePointerCapture(e.pointerId)
    } catch {
      /* */
    }
    if (isFront && !deferAutoDismiss) {
      const el = rootRef.current
      dismissTimerRef.current = window.setTimeout(() => {
        playAchievementToastExit(el, onDismiss)
      }, DISPLAY_MS)
    }
  }

  if (!def) return null

  return (
    <div className="achievement-toast-anchor">
      <div ref={rootRef} className="achievement-toast-shell">
        <div
          className={`achievement-toast${def.hidden ? ' achievement-toast--hidden-reveal' : ''}${stackIndex > 0 ? ' achievement-toast--stacked' : ''}${isFront ? ' achievement-toast--interactive' : ''}`}
          role="status"
          aria-live="polite"
          style={{
            transform: isFront ? `translate(${offset.x}px, ${offset.y}px)` : undefined,
          }}
          onPointerDown={isFront ? onPointerDown : undefined}
          onPointerMove={isFront ? onPointerMove : undefined}
          onPointerUp={isFront ? onPointerUp : undefined}
          onPointerCancel={isFront ? onPointerCancel : undefined}
          title={isFront ? 'Drag to move · click to dismiss' : undefined}
        >
          <div className="achievement-toast__badge">Achievement</div>
          <div className="achievement-toast__title">{def.name}</div>
          <p className="achievement-toast__desc">{def.description}</p>
          <div className="achievement-toast__reward" aria-hidden>
            Permanent bonus applied
          </div>
        </div>
      </div>
    </div>
  )
}
