import { useEffect, useRef } from 'react'
import { animateNarratorLineChange, type NarratorMotion } from '../animations'

type Props = {
  line: string
  motion: NarratorMotion
  className?: string
}

export function AnimatedNarratorText({ line, motion, className }: Props) {
  const ref = useRef<HTMLParagraphElement>(null)
  const first = useRef(true)

  useEffect(() => {
    if (first.current) {
      first.current = false
      return
    }
    animateNarratorLineChange(ref.current, motion)
  }, [line, motion])

  return (
    <p ref={ref} className={className}>
      {line}
    </p>
  )
}
