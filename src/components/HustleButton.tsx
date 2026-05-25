import { useCallback, useRef } from 'react'
import { playHustleClickFeedback } from '../animations/hustleClickFeedback'

type Props = {
  /** Game / reducer click — keep synchronous and fast for rapid tapping. */
  onAction: () => void
  moneyGain: number
  powerGain: number
  /** When true (blocking street / rival / major life modal), Hustle does nothing. */
  disabled?: boolean
}

export function HustleButton({ onAction, moneyGain, powerGain, disabled = false }: Props) {
  const glowRef = useRef<HTMLDivElement>(null)
  const floatRef = useRef<HTMLDivElement>(null)
  const btnRef = useRef<HTMLButtonElement>(null)
  const rippleHostRef = useRef<HTMLSpanElement>(null)
  const wrapRef = useRef<HTMLDivElement>(null)

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      onAction()
      playHustleClickFeedback({
        button: btnRef.current,
        glow: glowRef.current,
        floatLayer: floatRef.current,
        rippleHost: rippleHostRef.current,
        sparkHost: wrapRef.current,
        clientX: e.clientX,
        clientY: e.clientY,
        moneyGain,
        powerGain,
      })
    },
    [disabled, onAction, moneyGain, powerGain],
  )

  return (
    <div ref={wrapRef} className="main-clicker__btn-wrap">
      <div ref={glowRef} className="main-clicker__glow" aria-hidden />
      <div ref={floatRef} className="main-clicker__float-layer" aria-hidden />
      <button
        ref={btnRef}
        type="button"
        className={`main-clicker__btn${disabled ? ' main-clicker__btn--disabled' : ''}`}
        disabled={disabled}
        aria-disabled={disabled}
        title={disabled ? 'Resolve the open event first' : undefined}
        onClick={handleClick}
      >
        <span ref={rippleHostRef} className="hustle-btn__ripples" aria-hidden />
        <span className="hustle-btn__label">Hustle</span>
      </button>
    </div>
  )
}
