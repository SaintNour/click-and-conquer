import type { ReactNode } from 'react'

type Props = {
  label: string
  tip: string
  children: ReactNode
  className?: string
}

/** Hover/focus tooltip wrapper — keeps copy short; full string in title for native fallback. */
export function GameTooltip({ label, tip, children, className = '' }: Props) {
  return (
    <span
      className={`game-tooltip-wrap${className ? ` ${className}` : ''}`}
      tabIndex={0}
      role="button"
      aria-label={`${label}. ${tip}`}
    >
      <span className="game-tooltip__target" title={tip}>
        {children}
      </span>
      <span className="game-tooltip__bubble" role="tooltip">
        <span className="game-tooltip__title">{label}</span>
        <span className="game-tooltip__body">{tip}</span>
      </span>
    </span>
  )
}
