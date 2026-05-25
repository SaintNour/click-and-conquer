import gsap from 'gsap'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { PORTRAIT_LAYER_ORDER } from '../data/characterPortraitLayers'
import {
  CHARACTER_THEMES,
  FACIAL_HAIR_OPTIONS,
  HAIR_OPTIONS,
  JACKET_OPTIONS,
  SHIRT_OPTIONS,
  SKIN_TONE_OPTIONS,
  type CharacterLook,
  type CharacterThemeId,
} from '../data/characterCustomization'
import { HumanPortrait } from './HumanPortrait'

type TabId = 'face' | 'hair' | 'outfit' | 'accessories'

const TABS: { id: TabId; label: string }[] = [
  { id: 'face', label: 'Face' },
  { id: 'hair', label: 'Hair' },
  { id: 'outfit', label: 'Outfit' },
  { id: 'accessories', label: 'Extras' },
]

type Props = {
  open: boolean
  onClose: () => void
  characterLook: CharacterLook
  characterTheme: CharacterThemeId
  playerName: string
  onPatchLook: (patch: Partial<CharacterLook>) => void
  onSetTheme: (id: CharacterThemeId) => void
  onSetPlayerName: (name: string) => void
}

export function CharacterModal({
  open,
  onClose,
  characterLook,
  characterTheme,
  playerName,
  onPatchLook,
  onSetTheme,
  onSetPlayerName,
}: Props) {
  const backdropRef = useRef<HTMLDivElement>(null)
  const cardRef = useRef<HTMLDivElement>(null)
  const previewRef = useRef<HTMLDivElement>(null)
  const [tab, setTab] = useState<TabId>('face')
  const [nameDraft, setNameDraft] = useState(playerName)

  useEffect(() => {
    if (open) setNameDraft(playerName)
  }, [open, playerName])

  useLayoutEffect(() => {
    if (!open) return
    const b = backdropRef.current
    const c = cardRef.current
    if (!b || !c) return
    gsap.fromTo(b, { opacity: 0 }, { opacity: 1, duration: 0.2 })
    gsap.fromTo(
      c,
      { opacity: 0, y: 14, scale: 0.96, filter: 'blur(6px)' },
      { opacity: 1, y: 0, scale: 1, filter: 'blur(0px)', duration: 0.34, ease: 'power3.out' },
    )
  }, [open])

  useLayoutEffect(() => {
    if (!open) return
    const el = previewRef.current
    if (!el) return
    gsap.killTweensOf(el)
    gsap.fromTo(
      el,
      { opacity: 0.65, scale: 0.94 },
      { opacity: 1, scale: 1, duration: 0.28, ease: 'power2.out' },
    )
  }, [open, characterLook, tab])

  if (!open) return null

  return (
    <div
      ref={backdropRef}
      className="character-modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="character-modal-title"
      onClick={(e) => {
        if (e.target === backdropRef.current) onClose()
      }}
    >
      <div ref={cardRef} className="character-modal" onClick={(e) => e.stopPropagation()}>
        <h2 id="character-modal-title" className="character-modal__title">
          Your character
        </h2>
        <p className="character-modal__sub">
          Half-body portrait · saved automatically in this browser.
        </p>

        <div
          ref={previewRef}
          className="character-modal__preview"
          data-portrait-layers={PORTRAIT_LAYER_ORDER.join(',')}
        >
          <HumanPortrait look={characterLook} title="Character preview" />
        </div>

        <label className="character-modal__name-label">
          <span className="character-modal__label">Name</span>
          <input
            type="text"
            className="character-modal__name-input"
            value={nameDraft}
            maxLength={28}
            placeholder="Unknown if empty"
            onChange={(e) => {
              const v = e.target.value
              setNameDraft(v)
              onSetPlayerName(v)
            }}
          />
        </label>

        <div className="character-modal__tabs" role="tablist" aria-label="Customization categories">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={tab === t.id}
              className={`character-modal__tab${tab === t.id ? ' character-modal__tab--on' : ''}`}
              onClick={() => setTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === 'face' ? (
          <div className="character-modal__section" role="tabpanel">
            <span className="character-modal__label">Skin tone</span>
            <div className="character-modal__grid character-modal__grid--tone">
              {SKIN_TONE_OPTIONS.map((o) => (
                <button
                  key={o.id}
                  type="button"
                  className={`character-opt${characterLook.skinTone === o.id ? ' character-opt--on' : ''}`}
                  onClick={() => onPatchLook({ skinTone: o.id })}
                >
                  <span className="character-opt__swatch" style={{ background: o.preview }} />
                  <span className="character-opt__cap">{o.label}</span>
                </button>
              ))}
            </div>
            <span className="character-modal__label">Facial hair</span>
            <div className="character-modal__grid character-modal__grid--hair">
              {FACIAL_HAIR_OPTIONS.map((o) => (
                <button
                  key={o.id}
                  type="button"
                  className={`character-opt character-opt--wide${characterLook.facialHair === o.id ? ' character-opt--on' : ''}`}
                  onClick={() => onPatchLook({ facialHair: o.id })}
                >
                  <span className="character-opt__name">{o.label}</span>
                </button>
              ))}
            </div>
            <span className="character-modal__label">Street presence (theme)</span>
            <div className="character-modal__grid character-modal__grid--theme">
              {CHARACTER_THEMES.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  className={`character-opt character-opt--wide${characterTheme === t.id ? ' character-opt--on' : ''}`}
                  onClick={() => onSetTheme(t.id)}
                >
                  <span className="character-opt__name">{t.label}</span>
                  <span className="character-opt__hint">{t.hint}</span>
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {tab === 'hair' ? (
          <div className="character-modal__section" role="tabpanel">
            <span className="character-modal__label">Hair style</span>
            <div className="character-modal__grid character-modal__grid--hair">
              {HAIR_OPTIONS.map((o) => (
                <button
                  key={o.id}
                  type="button"
                  className={`character-opt character-opt--wide${characterLook.hair === o.id ? ' character-opt--on' : ''}`}
                  onClick={() => onPatchLook({ hair: o.id })}
                >
                  <span className="character-opt__name">{o.label}</span>
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {tab === 'outfit' ? (
          <div className="character-modal__section" role="tabpanel">
            <span className="character-modal__label">Shirt</span>
            <div className="character-modal__grid character-modal__grid--hair">
              {SHIRT_OPTIONS.map((o) => (
                <button
                  key={o.id}
                  type="button"
                  className={`character-opt character-opt--wide${characterLook.shirt === o.id ? ' character-opt--on' : ''}`}
                  onClick={() => onPatchLook({ shirt: o.id })}
                >
                  <span className="character-opt__name">{o.label}</span>
                </button>
              ))}
            </div>
            <span className="character-modal__label">Jacket / outerwear</span>
            <div className="character-modal__grid character-modal__grid--hair">
              {JACKET_OPTIONS.map((o) => (
                <button
                  key={o.id}
                  type="button"
                  className={`character-opt character-opt--wide${characterLook.jacket === o.id ? ' character-opt--on' : ''}`}
                  onClick={() => onPatchLook({ jacket: o.id })}
                >
                  <span className="character-opt__name">{o.label}</span>
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {tab === 'accessories' ? (
          <div className="character-modal__section" role="tabpanel">
            <span className="character-modal__label">Toggle accessories</span>
            <div className="character-modal__toggles">
              <button
                type="button"
                className={`character-toggle${characterLook.glasses ? ' character-toggle--on' : ''}`}
                onClick={() => onPatchLook({ glasses: !characterLook.glasses })}
              >
                Glasses
              </button>
              <button
                type="button"
                className={`character-toggle${characterLook.chain ? ' character-toggle--on' : ''}`}
                onClick={() => onPatchLook({ chain: !characterLook.chain })}
              >
                Chain
              </button>
              <button
                type="button"
                className={`character-toggle${characterLook.hat ? ' character-toggle--on' : ''}`}
                onClick={() => onPatchLook({ hat: !characterLook.hat })}
              >
                Hat
              </button>
            </div>
          </div>
        ) : null}

        <button type="button" className="character-modal__done" onClick={onClose}>
          Done
        </button>
      </div>
    </div>
  )
}
