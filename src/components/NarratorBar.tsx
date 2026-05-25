import { AnimatedNarratorText } from './AnimatedNarratorText'

type Props = {
  line: string
}

export function NarratorBar({ line }: Props) {
  return (
    <footer className="narrator-bar intro-stagger">
      <span className="narrator-bar__label">Narrator</span>
      <AnimatedNarratorText line={line} motion="bar" className="narrator-bar__text" />
    </footer>
  )
}
