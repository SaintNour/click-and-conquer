import gsap from 'gsap'
import { useEffect, useRef } from 'react'
import { HumanPortrait } from './HumanPortrait'
import type { GameState } from '../data/types'
import {
  playAvatarClick,
  playAvatarHover,
  playAvatarHoverOut,
  playAvatarReaction,
  playTitleRankUp,
  startAvatarIdle,
} from '../animations/avatarPresence'
import {
  animateBossNarratorBubble,
  pulseBossAvatar,
  setBossBubbleTone,
} from '../animations/narratorBubble'
import { narratorToneFromKey } from '../game/narratorTone'

type Props = {
  state: GameState
  onAvatarClick?: () => void
}

export function BossCard({ state, onAvatarClick }: Props) {
  const bubbleRef = useRef<HTMLDivElement>(null)
  const textRef = useRef<HTMLParagraphElement>(null)
  const avatarRef = useRef<HTMLButtonElement>(null)
  const faceRef = useRef<HTMLSpanElement>(null)
  const titleRef = useRef<HTMLDivElement>(null)
  const nameRef = useRef<HTMLDivElement>(null)
  const firstLine = useRef(true)

  useEffect(() => {
    const stop = startAvatarIdle(faceRef.current)
    return stop
  }, [])

  useEffect(() => {
    const tone = narratorToneFromKey(state.narratorEventKey)
    if (firstLine.current) {
      firstLine.current = false
      if (textRef.current) textRef.current.textContent = state.narratorLine
      setBossBubbleTone(bubbleRef.current, tone)
      return
    }
    animateBossNarratorBubble(bubbleRef.current, textRef.current, state.narratorLine, tone)
    pulseBossAvatar(avatarRef.current, tone)
  }, [state.narratorLine, state.narratorEventKey])

  useEffect(() => {
    if (state.agePulseNonce === 0) return
    const el = nameRef.current
    if (!el) return
    gsap.killTweensOf(el)
    gsap.fromTo(
      el,
      { scale: 1, color: 'var(--text-h, #e8e4dc)' },
      {
        scale: 1.06,
        color: 'var(--gold, #d4a017)',
        duration: 0.22,
        yoyo: true,
        repeat: 1,
        ease: 'sine.inOut',
        transformOrigin: 'center left',
        onComplete: () => {
          gsap.set(el, { clearProps: 'scale,color' })
        },
      },
    )
  }, [state.agePulseNonce])

  const displayName = state.playerName.trim() || 'Unknown'

  useEffect(() => {
    if (state.customizationNonce === 0) return
    const el = faceRef.current
    if (!el) return
    gsap.killTweensOf(el)
    gsap.fromTo(
      el,
      { opacity: 0.35, scale: 0.88 },
      { opacity: 1, scale: 1, duration: 0.38, ease: 'power2.out' },
    )
  }, [state.customizationNonce, state.characterLook])

  useEffect(() => {
    if (state.titlePulseNonce === 0) return
    playTitleRankUp(titleRef.current)
    pulseBossAvatar(avatarRef.current, 'milestone')
  }, [state.titlePulseNonce])

  useEffect(() => {
    if (state.avatarReactionNonce === 0 || !state.avatarReactionKind) return
    playAvatarReaction(avatarRef.current, faceRef.current, state.avatarReactionKind)
  }, [state.avatarReactionNonce, state.avatarReactionKind])

  useEffect(() => {
    if (state.rivalAttackFlashNonce === 0) return
    playAvatarReaction(avatarRef.current, faceRef.current, 'rival')
  }, [state.rivalAttackFlashNonce])

  useEffect(() => {
    if (state.rivalRevengeNonce === 0) return
    playAvatarReaction(avatarRef.current, faceRef.current, 'revenge')
  }, [state.rivalRevengeNonce])

  useEffect(() => {
    if (state.rivalWarningNonce === 0) return
    playAvatarReaction(avatarRef.current, faceRef.current, 'danger')
  }, [state.rivalWarningNonce])

  const heatHigh = state.heat >= 68

  return (
    <aside className="boss-card intro-stagger">
      <div className="boss-card__row">
        <button
          type="button"
          ref={avatarRef}
          className={`boss-card__avatar boss-card__avatar--btn${heatHigh ? ' boss-card__avatar--heat' : ''}`}
          aria-label="Open identity customization"
          onMouseEnter={() => playAvatarHover(avatarRef.current)}
          onMouseLeave={() => playAvatarHoverOut(avatarRef.current)}
          onClick={() => {
            playAvatarClick(avatarRef.current)
            onAvatarClick?.()
          }}
        >
          <span className="boss-card__avatar-ring" />
          <span ref={faceRef} className="boss-card__avatar-face">
            <HumanPortrait look={state.characterLook} />
          </span>
        </button>
        <div className="boss-card__info">
          <div ref={nameRef} className="boss-card__name">
            {displayName}
          </div>
          <div className="boss-card__meta">
            <span className="boss-card__life-icons" aria-hidden>
              {(state.hasPartner || state.married) && (
                <span className="boss-card__life-ico" title="Partner">
                  💍
                </span>
              )}
              {state.lifePrestigeMarried + state.lifePrestigeSolo > 0 && (
                <span className="boss-card__life-ico" title="Family prestige line">
                  👶
                </span>
              )}
            </span>
            <span className="boss-card__dots" aria-hidden>
              <span className="boss-card__dot boss-card__dot--money" title="Money flow" />
              <span className="boss-card__dot boss-card__dot--power" title="Street power" />
            </span>
          </div>
          <div ref={titleRef} className="boss-card__title">
            {state.title}
          </div>
        </div>
      </div>

      <div className="boss-card__bubble-connector" aria-hidden />
      <div ref={bubbleRef} className="boss-card__bubble boss-card__bubble--neutral" role="status">
        <span className="boss-card__bubble-shine" aria-hidden />
        <span className="boss-card__bubble-label">Intel</span>
        <span className="boss-card__bubble-tail" aria-hidden />
        <p ref={textRef} className="boss-card__bubble-text">
          {state.narratorLine}
        </p>
      </div>
    </aside>
  )
}
