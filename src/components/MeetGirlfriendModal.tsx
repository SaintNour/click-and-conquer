import { useLayoutEffect, useRef, useState } from 'react'
import { playMajorLifeEventOpenSfx } from '../audio/gameSfx'
import { playEventBackdropDim, playEventCardEnter } from '../animations/eventModalFx'
import type { MeetConvoContent, MeetConvoRoundDef } from '../data/types'

type Props = {
  content: MeetConvoContent
  onComplete: (payload: { correctCount: number; pickedEggSmile: boolean }) => void
}

export function MeetGirlfriendModal({ content, onComplete }: Props) {
  const backdropRef = useRef<HTMLDivElement>(null)
  const cardRef = useRef<HTMLDivElement>(null)
  const [phase, setPhase] = useState<'intro' | 'rounds'>('intro')
  const [roundIndex, setRoundIndex] = useState(0)
  const [hits, setHits] = useState<boolean[]>([])
  const [pickedEggSmile, setPickedEggSmile] = useState(false)

  useLayoutEffect(() => {
    playEventBackdropDim(backdropRef.current)
    const tl = playEventCardEnter(cardRef.current)
    queueMicrotask(() => playMajorLifeEventOpenSfx())
    return () => {
      tl.kill()
    }
  }, [])

  const rounds = content.rounds
  const current: MeetConvoRoundDef | undefined = rounds[roundIndex]

  const scoreDots = [0, 1, 2].map((i) => {
    if (i >= hits.length) return 'pending'
    return hits[i] ? 'hit' : 'miss'
  })

  const onPick = (choiceId: string, correct: boolean | undefined) => {
    if (!current) return
    if (choiceId === 'egg_smile') setPickedEggSmile(true)
    const nextHits = [...hits, Boolean(correct)]
    setHits(nextHits)
    if (roundIndex >= rounds.length - 1) {
      const correctCount = nextHits.filter(Boolean).length
      onComplete({
        correctCount,
        pickedEggSmile: pickedEggSmile || choiceId === 'egg_smile',
      })
      return
    }
    setRoundIndex(roundIndex + 1)
  }

  return (
    <div
      ref={backdropRef}
      className="modal-backdrop modal-backdrop--event modal-backdrop--life-major meet-convo-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="meet-convo-title"
    >
      <div ref={cardRef} className="modal modal--event-card modal--life-major meet-convo-card">
        <div className="meet-convo__score" aria-label="Conversation progress">
          {scoreDots.map((s, i) => (
            <span
              key={i}
              className={`meet-convo__dot meet-convo__dot--${s}`}
              aria-hidden
              title={s === 'hit' ? 'Good beat' : s === 'miss' ? 'Miss' : 'Upcoming'}
            />
          ))}
        </div>

        {phase === 'intro' ? (
          <>
            <h2 id="meet-convo-title" className="modal__title">
              {content.introTitle}
            </h2>
            <p className="modal__body">{content.introBody}</p>
            <div className="modal__choices">
              <button
                type="button"
                className="modal__choice"
                onClick={() => {
                  setPhase('rounds')
                }}
              >
                Start the conversation
              </button>
            </div>
          </>
        ) : current ? (
          <>
            <h2 id="meet-convo-title" className="modal__title meet-convo__her">
              {current.herLine}
            </h2>
            <p className="meet-convo__hint">Pick the line that matches her energy.</p>
            <div className="modal__choices meet-convo__choices">
              {current.choices.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  className="modal__choice"
                  onClick={() => onPick(c.id, c.correct)}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </>
        ) : null}
      </div>
    </div>
  )
}
