import { useLayoutEffect, useRef } from 'react'
import { playSaveModalClose, playSaveModalOpen } from '../animations/saveModalFx'
import { ACHIEVEMENTS } from '../data/achievements'
import type { GameState } from '../data/types'

type Props = {
  open: boolean
  onClose: () => void
  state: GameState
}

export function AchievementsModal({ open, onClose, state }: Props) {
  const backdropRef = useRef<HTMLDivElement>(null)
  const cardRef = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    if (!open) return
    playSaveModalOpen(backdropRef.current, cardRef.current)
  }, [open])

  if (!open) return null

  const close = () => {
    playSaveModalClose(backdropRef.current, cardRef.current, onClose)
  }

  return (
    <div
      ref={backdropRef}
      className="achievements-modal-backdrop"
      role="presentation"
      onClick={(e) => e.target === e.currentTarget && close()}
    >
      <div
        ref={cardRef}
        className="achievements-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="achievements-modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="achievements-modal-title" className="achievements-modal__title">
          Achievements
        </h2>
        <ul className="achievements-modal__list">
          {ACHIEVEMENTS.map((a) => {
            const unlocked = Boolean(state.achievementsUnlocked[a.id])
            const hiddenLocked = a.hidden && !unlocked
            return (
              <li
                key={a.id}
                className={`achievements-modal__row${unlocked ? ' achievements-modal__row--unlocked' : ' achievements-modal__row--locked'}`}
              >
                <div className="achievements-modal__row-main">
                  <span className="achievements-modal__name">
                    {hiddenLocked ? 'Hidden achievement' : a.name}
                  </span>
                  {!unlocked ? (
                    <span className="achievements-modal__q" aria-hidden title="Not unlocked yet">
                      ?
                    </span>
                  ) : null}
                </div>
                <p className="achievements-modal__desc">
                  {hiddenLocked ? 'Keep playing to discover this one.' : a.description}
                </p>
              </li>
            )
          })}
        </ul>
        <div className="achievements-modal__footer">
          <button type="button" className="achievements-modal__close" onClick={close}>
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
