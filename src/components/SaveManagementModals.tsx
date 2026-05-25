import { useCallback, useLayoutEffect, useRef, useState } from 'react'
import type { GameState } from '../data/types'
import { decodeSaveImport, encodeSaveExport } from '../game/save'
import {
  playResetConfirmShake,
  playSaveModalClose,
  playSaveModalOpen,
} from '../animations/saveModalFx'

type Props = {
  state: GameState
  onResetSave: () => void
  onApplyImport: (game: GameState) => void
  /** When false, omit the local-save note (e.g. shown in Settings header). Default true. */
  showLocalSaveNote?: boolean
  onImportSuccess?: () => void
}

export function SaveManagementUI({
  state,
  onResetSave,
  onApplyImport,
  showLocalSaveNote = true,
  onImportSuccess,
}: Props) {
  const [resetOpen, setResetOpen] = useState(false)
  const [exportOpen, setExportOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const [importText, setImportText] = useState('')
  const [importErr, setImportErr] = useState('')
  const [importReady, setImportReady] = useState<GameState | null>(null)
  const [importStep, setImportStep] = useState<'paste' | 'confirm'>('paste')
  const [copyFeedback, setCopyFeedback] = useState(false)

  const resetBackdropRef = useRef<HTMLDivElement>(null)
  const resetCardRef = useRef<HTMLDivElement>(null)
  const exportBackdropRef = useRef<HTMLDivElement>(null)
  const exportCardRef = useRef<HTMLDivElement>(null)
  const importBackdropRef = useRef<HTMLDivElement>(null)
  const importCardRef = useRef<HTMLDivElement>(null)

  const exportString = exportOpen ? encodeSaveExport(state) : ''

  useLayoutEffect(() => {
    if (resetOpen) playSaveModalOpen(resetBackdropRef.current, resetCardRef.current)
  }, [resetOpen])

  useLayoutEffect(() => {
    if (exportOpen) playSaveModalOpen(exportBackdropRef.current, exportCardRef.current)
  }, [exportOpen])

  useLayoutEffect(() => {
    if (importOpen) playSaveModalOpen(importBackdropRef.current, importCardRef.current)
  }, [importOpen])

  const closeReset = useCallback(() => {
    playSaveModalClose(resetBackdropRef.current, resetCardRef.current, () => setResetOpen(false))
  }, [])

  const closeExport = useCallback(() => {
    playSaveModalClose(exportBackdropRef.current, exportCardRef.current, () => setExportOpen(false))
  }, [])

  const closeImport = useCallback(() => {
    playSaveModalClose(importBackdropRef.current, importCardRef.current, () => {
      setImportOpen(false)
      setImportText('')
      setImportErr('')
      setImportReady(null)
      setImportStep('paste')
    })
  }, [])

  const confirmReset = useCallback(() => {
    playResetConfirmShake(resetCardRef.current)
    window.setTimeout(() => {
      onResetSave()
      playSaveModalClose(resetBackdropRef.current, resetCardRef.current, () => setResetOpen(false))
    }, 260)
  }, [onResetSave])

  const copyExport = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(exportString)
      setCopyFeedback(true)
      window.setTimeout(() => setCopyFeedback(false), 2000)
    } catch {
      /* ignore */
    }
  }, [exportString])

  const parseImport = useCallback(() => {
    const r = decodeSaveImport(importText)
    if ('error' in r) {
      setImportErr(r.error)
      setImportReady(null)
      return
    }
    setImportErr('')
    setImportReady(r)
    setImportStep('confirm')
  }, [importText])

  const doImport = useCallback(() => {
    if (!importReady) return
    onApplyImport(importReady)
    onImportSuccess?.()
    playSaveModalClose(importBackdropRef.current, importCardRef.current, () => {
      setImportOpen(false)
      setImportText('')
      setImportErr('')
      setImportReady(null)
      setImportStep('paste')
    })
  }, [importReady, onApplyImport, onImportSuccess])

  return (
    <>
      <div className={`save-panel${showLocalSaveNote ? '' : ' save-panel--embedded'}`}>
        {showLocalSaveNote ? (
          <p className="save-panel__note">Progress saves locally in this browser.</p>
        ) : null}
        <div className="save-panel__row">
          <button type="button" className="save-panel__btn" onClick={() => setExportOpen(true)}>
            Export save
          </button>
          <button
            type="button"
            className="save-panel__btn"
            onClick={() => {
              setImportOpen(true)
              setImportStep('paste')
              setImportErr('')
              setImportReady(null)
            }}
          >
            Import save
          </button>
        </div>
        <button
          type="button"
          className="save-panel__btn save-panel__btn--reset"
          onClick={() => setResetOpen(true)}
        >
          Reset save
        </button>
      </div>

      {resetOpen ? (
        <div
          ref={resetBackdropRef}
          className="save-modal-backdrop"
          role="presentation"
          onClick={(e) => e.target === e.currentTarget && closeReset()}
        >
          <div
            ref={resetCardRef}
            className="save-modal save-modal--danger"
            role="dialog"
            aria-modal="true"
            aria-labelledby="reset-save-title"
          >
            <h2 id="reset-save-title" className="save-modal__title">
              Reset all progress?
            </h2>
            <p className="save-modal__warn">
              This will delete all progress permanently. Only this game&apos;s save data is removed
              from this browser.
            </p>
            <div className="save-modal__actions">
              <button
                type="button"
                className="save-modal__btn save-modal__btn--ghost"
                onClick={closeReset}
              >
                Cancel
              </button>
              <button
                type="button"
                className="save-modal__btn save-modal__btn--destructive"
                onClick={confirmReset}
              >
                Reset everything
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {exportOpen ? (
        <div
          ref={exportBackdropRef}
          className="save-modal-backdrop"
          role="presentation"
          onClick={(e) => e.target === e.currentTarget && closeExport()}
        >
          <div
            ref={exportCardRef}
            className="save-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="export-title"
          >
            <h2 id="export-title" className="save-modal__title">
              Export save
            </h2>
            <p className="save-modal__hint">Copy this backup string and store it somewhere safe.</p>
            <textarea className="save-modal__textarea" readOnly value={exportString} rows={6} />
            <div className="save-modal__actions">
              <button
                type="button"
                className="save-modal__btn save-modal__btn--ghost"
                onClick={closeExport}
              >
                Close
              </button>
              <button
                type="button"
                className="save-modal__btn save-modal__btn--primary"
                onClick={copyExport}
              >
                {copyFeedback ? 'Copied!' : 'Copy'}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {importOpen ? (
        <div
          ref={importBackdropRef}
          className="save-modal-backdrop"
          role="presentation"
          onClick={(e) => e.target === e.currentTarget && closeImport()}
        >
          <div
            ref={importCardRef}
            className="save-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="import-title"
          >
            <h2 id="import-title" className="save-modal__title">
              Import save
            </h2>
            {importStep === 'paste' ? (
              <>
                <p className="save-modal__hint">
                  Paste a backup string from Export save, then validate.
                </p>
                <textarea
                  className="save-modal__textarea"
                  value={importText}
                  onChange={(e) => {
                    setImportText(e.target.value)
                    setImportErr('')
                  }}
                  rows={6}
                  placeholder="CNC1:…"
                />
                {importErr ? <p className="save-modal__error">{importErr}</p> : null}
                <div className="save-modal__actions">
                  <button
                    type="button"
                    className="save-modal__btn save-modal__btn--ghost"
                    onClick={closeImport}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="save-modal__btn save-modal__btn--primary"
                    onClick={parseImport}
                  >
                    Check save
                  </button>
                </div>
              </>
            ) : (
              <>
                <p className="save-modal__warn">This will replace your current progress.</p>
                <div className="save-modal__actions">
                  <button
                    type="button"
                    className="save-modal__btn save-modal__btn--ghost"
                    onClick={() => {
                      setImportStep('paste')
                      setImportReady(null)
                    }}
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    className="save-modal__btn save-modal__btn--primary"
                    onClick={doImport}
                  >
                    Import & replace
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      ) : null}
    </>
  )
}
