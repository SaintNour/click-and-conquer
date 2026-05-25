import { useCallback, useLayoutEffect, useRef, useState, type ChangeEvent } from 'react'
import { getSfxMuted, getSfxVolume01, setSfxMuted, setSfxVolume01 } from '../audio/gameSfx'
import type { GameState } from '../data/types'
import { playSaveModalClose, playSaveModalOpen } from '../animations/saveModalFx'
import { SaveManagementUI } from './SaveManagementModals'

type Props = {
  open: boolean
  onClose: () => void
  state: GameState
  onResetSave: () => void
  onApplyImport: (game: GameState) => void
}

export function SettingsModal({ open, onClose, state, onResetSave, onApplyImport }: Props) {
  const backdropRef = useRef<HTMLDivElement>(null)
  const cardRef = useRef<HTMLDivElement>(null)
  const [muted, setMuted] = useState(() => getSfxMuted())
  const [volumePct, setVolumePct] = useState(() => Math.round(getSfxVolume01() * 100))
  const [feedback, setFeedback] = useState<string | null>(null)

  useLayoutEffect(() => {
    if (!open) return
    setMuted(getSfxMuted())
    setVolumePct(Math.round(getSfxVolume01() * 100))
    playSaveModalOpen(backdropRef.current, cardRef.current)
  }, [open])

  const close = useCallback(() => {
    playSaveModalClose(backdropRef.current, cardRef.current, () => {
      setFeedback(null)
      onClose()
    })
  }, [onClose])

  const toggleMute = useCallback(() => {
    const next = !getSfxMuted()
    setSfxMuted(next)
    setMuted(next)
  }, [])

  const onVolumeInput = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    const v = Number(e.target.value)
    const pct = Number.isFinite(v) ? Math.min(100, Math.max(0, Math.round(v))) : 100
    setVolumePct(pct)
    setSfxVolume01(pct / 100)
  }, [])

  if (!open) return null

  return (
    <div
      ref={backdropRef}
      className="settings-modal-backdrop"
      role="presentation"
      onClick={(e) => e.target === e.currentTarget && close()}
    >
      <div
        ref={cardRef}
        className="settings-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="settings-modal-title" className="settings-modal__title">
          Settings
        </h2>
        <p className="settings-modal__note">Progress saves locally in this browser.</p>

        {feedback ? (
          <p className="settings-modal__feedback" role="status">
            {feedback}
          </p>
        ) : null}

        <section className="settings-modal__section" aria-labelledby="settings-audio-h">
          <h3 id="settings-audio-h" className="settings-modal__section-title">
            Audio
          </h3>
          <label className="settings-modal__toggle-row">
            <input type="checkbox" checked={muted} onChange={toggleMute} />
            <span>Mute game sounds</span>
          </label>
          <label className="settings-modal__volume-row" htmlFor="settings-sfx-volume">
            <span className="settings-modal__volume-label">SFX volume</span>
            <input
              id="settings-sfx-volume"
              type="range"
              min={0}
              max={100}
              value={volumePct}
              onChange={onVolumeInput}
              disabled={muted}
              aria-valuetext={`${volumePct} percent`}
            />
            <span className="settings-modal__volume-pct" aria-hidden>
              {volumePct}%
            </span>
          </label>
        </section>

        <section className="settings-modal__section" aria-labelledby="settings-save-h">
          <h3 id="settings-save-h" className="settings-modal__section-title">
            Save management
          </h3>
          <SaveManagementUI
            state={state}
            onResetSave={onResetSave}
            onApplyImport={onApplyImport}
            showLocalSaveNote={false}
            onImportSuccess={() => {
              setFeedback('Save imported successfully.')
              window.setTimeout(() => setFeedback(null), 2800)
            }}
          />
        </section>

        <button type="button" className="settings-modal__done" onClick={close}>
          Close
        </button>
      </div>
    </div>
  )
}
