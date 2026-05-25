import { useEffect, useId, useRef } from 'react'
import { animateAccordionContent, setAccordionContentInstant } from '../animations/sidebarAccordion'

type Props = {
  title: string
  summary: string
  isOpen: boolean
  onToggle: () => void
  children: React.ReactNode
  className?: string
}

export function SidebarAccordionSection({
  title,
  summary,
  isOpen,
  onToggle,
  children,
  className = '',
}: Props) {
  const uid = useId()
  const panelId = `${uid}-panel`
  const btnId = `${uid}-btn`
  const wrapRef = useRef<HTMLDivElement>(null)
  const innerRef = useRef<HTMLDivElement>(null)
  const first = useRef(true)

  useEffect(() => {
    const wrap = wrapRef.current
    const inner = innerRef.current
    if (!wrap || !inner) return
    if (first.current) {
      first.current = false
      setAccordionContentInstant(wrap, isOpen)
      return
    }
    animateAccordionContent(wrap, inner, isOpen, false)
  }, [isOpen])

  return (
    <section className={`sidebar-acc ${className}${isOpen ? ' sidebar-acc--open' : ''}`}>
      <button
        id={btnId}
        type="button"
        className="sidebar-acc__header"
        aria-expanded={isOpen}
        aria-controls={panelId}
        onClick={onToggle}
      >
        <span className="sidebar-acc__chevron" aria-hidden>
          {isOpen ? '▼' : '▶'}
        </span>
        <span className="sidebar-acc__title-wrap">
          <span className="sidebar-acc__title">{title}</span>
          {!isOpen ? <span className="sidebar-acc__summary">{summary}</span> : null}
        </span>
      </button>
      <div
        ref={wrapRef}
        className="sidebar-acc__body-outer"
        id={panelId}
        role="region"
        aria-labelledby={btnId}
      >
        <div ref={innerRef} className="sidebar-acc__body-inner">
          {children}
        </div>
      </div>
    </section>
  )
}
