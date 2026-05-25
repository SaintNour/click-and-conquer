import gsap from 'gsap'
import { useEffect, useRef, useState } from 'react'
import {
  heatMaxDebuffHud,
  isHeatCrackdownActive,
  isHeatGracePeriod,
} from '../game/heatCrackdownEngine'
import {
  HEAT_LAUNDER_MAX_COST,
  HEAT_LAUNDER_MIN_COST,
  HEAT_LAUNDER_MIN_HEAT,
  HEAT_LAUNDER_WEALTH_FRAC,
} from '../game/balanceConfig'
import { TOOLTIPS } from '../data/tooltips'
import type { GameState } from '../data/types'
import type { RivalRelationship } from '../data/rivalTypes'
import {
  rivalTruceTributeEstimate,
  rivalWarAttackPowerCost,
  rivalWarSurgePowerCost,
} from '../game/rivalWarEngine'
import { GameTooltip } from './GameTooltip'

function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )
}

type Props = {
  state: GameState
  onOpenRevenge: () => void
  onRivalWarAttack: (rivalId: string) => void
  onRivalWarSurge: (rivalId: string) => void
  onRivalSurrender: (rivalId: string) => void
  onRivalTruce: (rivalId: string) => void
  onHeatLaunder?: () => void
}

function heatLaunderCostPreview(state: GameState): number {
  const proposed = Math.round(state.money * HEAT_LAUNDER_WEALTH_FRAC)
  return Math.min(HEAT_LAUNDER_MAX_COST, Math.max(HEAT_LAUNDER_MIN_COST, proposed))
}

function relationshipShort(rel: RivalRelationship): string {
  switch (rel) {
    case 'neutral':
      return 'Cool'
    case 'rival':
      return 'Rival'
    case 'enemy':
      return 'Enemy'
    case 'nemesis':
      return 'Nemesis'
  }
}

/** Active gang-war rival (life-led arc only). */
function activeGangWarRival(state: GameState): {
  id: string
  name: string
  leaderName: string
  relationship: RivalRelationship
  colorTag: string
} | null {
  const id = state.gangWarRivalId
  if (!id) return null
  const r = state.rivals[id]
  if (!r || r.alive === false) return null
  return {
    id,
    name: r.name,
    leaderName: r.leaderName,
    relationship: r.relationship,
    colorTag: r.colorTag,
  }
}

function heatTier(pct: number): 'low' | 'mid' | 'high' {
  if (pct >= 68) return 'high'
  if (pct >= 35) return 'mid'
  return 'low'
}

export function RivalHud({
  state,
  onOpenRevenge,
  onRivalWarAttack,
  onRivalWarSurge,
  onRivalSurrender,
  onRivalTruce,
  onHeatLaunder,
}: Props) {
  const rootRef = useRef<HTMLDivElement>(null)
  const heatFillRef = useRef<HTMLDivElement>(null)
  const rivalCardRef = useRef<HTMLDivElement>(null)
  const prevHeatRef = useRef(state.heat)
  const prevTensionKeyRef = useRef('')
  const [confirmingSurrender, setConfirmingSurrender] = useState(false)

  const heatPct = Math.min(100, Math.max(0, state.heat))
  const tier = heatTier(heatPct)
  const crackdown = isHeatCrackdownActive(state)
  const heatGrace = state.heatGracePeriodActive || isHeatGracePeriod(state)
  const graceCountdownSec =
    heatGrace && state.heatCapGraceEndTick > state.tickCount
      ? state.heatCapGraceEndTick - state.tickCount
      : 0
  const debuffHud = heatMaxDebuffHud(state)
  const crackdownSec =
    crackdown && state.heatCrackdownEndTick > state.tickCount
      ? state.heatCrackdownEndTick - state.tickCount
      : 0
  const debuffSec = Math.max(crackdownSec, heatGrace ? graceCountdownSec : 0)
  const canRevenge = Boolean(state.revengeTargetId && !state.pendingRivalEncounter)
  const tension = activeGangWarRival(state)
  const intelId = state.gangIntelRivalId
  const intelRival = intelId && !state.gangWarRivalId ? state.rivals[intelId] : null
  const tensionKey = tension ? `${tension.name}:${tension.relationship}` : ''
  const rivalFull = tension ? state.rivals[tension.id] : null
  const atkCost = rivalFull ? rivalWarAttackPowerCost(state, rivalFull) : 0
  const surgeCost = rivalFull ? rivalWarSurgePowerCost(state) : 0
  const busyModals = Boolean(state.pendingRivalEncounter || state.pendingWarStrike)
  const canAtk = !!rivalFull && state.power >= atkCost && !busyModals
  const canSurge = !!rivalFull && state.power >= surgeCost && !busyModals
  const canSurrender = !!rivalFull && !busyModals
  const rivalBroken = !!rivalFull && rivalFull.warPowerHp <= 0
  const truceTributeEst = rivalFull ? rivalTruceTributeEstimate(rivalFull) : 0
  const canTruce = !!rivalFull && rivalBroken && !busyModals
  const playerHpPct = Math.min(100, (state.playerWarHp / Math.max(1, state.playerWarMaxHp)) * 100)
  const rivalHpPct = rivalFull
    ? Math.min(100, (rivalFull.warHp / Math.max(1, rivalFull.warMaxHp)) * 100)
    : 0
  const rivalPowerPct = rivalFull
    ? Math.min(100, (rivalFull.warPowerHp / Math.max(1, rivalFull.warPowerHpMax)) * 100)
    : 0

  useEffect(() => {
    if (!tension) setConfirmingSurrender(false)
  }, [tension])

  useEffect(() => {
    if (state.rivalStoryEventNonce === 0) return
    const el = rootRef.current
    if (!el || prefersReducedMotion()) return
    gsap.killTweensOf(el, 'x,filter')
    gsap
      .timeline({
        onComplete: () => void gsap.set(el, { clearProps: 'x,filter' }),
      })
      .fromTo(
        el,
        { filter: 'brightness(1)' },
        { filter: 'brightness(1.14)', duration: 0.08, ease: 'power2.out' },
      )
      .to(el, { x: -3, duration: 0.04, ease: 'power1.inOut' }, 0.02)
      .to(el, { x: 4, duration: 0.06, ease: 'power1.inOut' })
      .to(el, { x: -2, duration: 0.04, ease: 'power1.inOut' })
      .to(el, { x: 0, duration: 0.08, ease: 'power2.out' })
      .to(el, { filter: 'brightness(1)', duration: 0.16, ease: 'sine.out' })
  }, [state.rivalStoryEventNonce])

  useEffect(() => {
    const prev = prevHeatRef.current
    prevHeatRef.current = state.heat
    if (state.heat <= prev || prefersReducedMotion()) return
    const el = heatFillRef.current
    if (!el) return
    gsap.killTweensOf(el, 'scaleY,filter,boxShadow')
    gsap
      .timeline({ onComplete: () => void gsap.set(el, { clearProps: 'scaleY,filter,boxShadow' }) })
      .fromTo(
        el,
        { scaleY: 1.25, filter: 'brightness(1)', boxShadow: '0 0 0 rgba(0,0,0,0)' },
        {
          scaleY: 1,
          filter: 'brightness(1.35)',
          boxShadow: '0 0 18px rgba(251, 146, 60, 0.55)',
          duration: 0.14,
          ease: 'power2.out',
        },
      )
      .to(el, {
        filter: 'brightness(1)',
        boxShadow: '0 0 0 rgba(0,0,0,0)',
        duration: 0.28,
        ease: 'sine.out',
      })
  }, [state.heat])

  useEffect(() => {
    if (!tensionKey) {
      prevTensionKeyRef.current = ''
      return
    }
    if (tensionKey === prevTensionKeyRef.current) return
    prevTensionKeyRef.current = tensionKey
    const el = rivalCardRef.current
    if (!el || prefersReducedMotion()) return
    gsap.killTweensOf(el, 'opacity,x,filter')
    gsap.fromTo(
      el,
      { opacity: 0.45, x: -10, filter: 'blur(4px)' },
      { opacity: 1, x: 0, filter: 'blur(0px)', duration: 0.32, ease: 'power3.out' },
    )
  }, [tensionKey])

  return (
    <div
      ref={rootRef}
      className={`rival-hud rival-hud--heat-${tier}`}
      title="Heat draws rival attention over time"
    >
      <div className="rival-hud__heat">
        <div className="rival-hud__heat-head">
          <GameTooltip label="Heat" tip={TOOLTIPS.heat}>
            <span className="rival-hud__heat-label">Heat</span>
          </GameTooltip>
          <span className="rival-hud__heat-pct" aria-hidden>
            {Math.round(heatPct)}%
          </span>
        </div>
        <div
          className={`rival-hud__bar${heatGrace ? ' rival-hud__bar--grace-pulse' : ''}`}
          role="progressbar"
          aria-valuenow={Math.round(heatPct)}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`Heat ${Math.round(heatPct)} percent${heatGrace ? ' — crackdown imminent' : ''}`}
        >
          <div
            ref={heatFillRef}
            className="rival-hud__fill"
            style={{ width: `${heatPct}%`, transformOrigin: 'center bottom' }}
          />
        </div>
        <div
          className={`rival-hud__grace-wrap${heatGrace ? ' rival-hud__grace-wrap--active' : ''}`}
          aria-live="polite"
          aria-atomic="true"
        >
          <div className="rival-hud__grace-warning">
            <span className="rival-hud__grace-warning-title">WARNING: CRACKDOWN IMMINENT</span>
            <span className="rival-hud__grace-warning-seconds">{graceCountdownSec}s</span>
          </div>
        </div>
      </div>

      {onHeatLaunder ? (
        <div className="rival-hud__heat-sink">
          <button
            type="button"
            className="rival-hud__launder-btn"
            disabled={
              state.heat < HEAT_LAUNDER_MIN_HEAT ||
              state.tickCount < state.heatLaunderCooldownEndTick ||
              state.money < heatLaunderCostPreview(state)
            }
            onClick={onHeatLaunder}
            title="Spend cash to launder heat. Long cooldown between uses."
          >
            Launder heat · ~${heatLaunderCostPreview(state).toLocaleString()}
            {state.tickCount < state.heatLaunderCooldownEndTick
              ? ` · ${state.heatLaunderCooldownEndTick - state.tickCount}s`
              : ''}
          </button>
        </div>
      ) : null}

      {debuffHud && debuffSec > 0 && !heatGrace ? (
        <div className="rival-hud__crackdown" role="status" title={debuffHud.title}>
          <span className="rival-hud__crackdown-label">{debuffHud.label}</span>
          <span className="rival-hud__crackdown-meta">{debuffHud.meta}</span>
        </div>
      ) : null}

      {!state.gangWarRivalId && intelRival && intelRival.alive !== false ? (
        <div className="rival-hud__intel" role="status">
          <strong>Preparing</strong> — intel points at{' '}
          <span style={{ color: intelRival.colorTag }}>{intelRival.name}</span>. War is not open
          yet; watch your corners.
        </div>
      ) : null}

      {tension && rivalFull ? (
        <div
          ref={rivalCardRef}
          className={`rival-hud__rival-card${tension.relationship === 'nemesis' ? ' rival-hud__rival-card--nemesis' : ''}${rivalBroken ? ' rival-hud__rival-card--broken' : ''}`}
          style={{ borderLeftColor: tension.colorTag }}
        >
          <div className="rival-hud__rival-card-top">
            <GameTooltip label="Rival war" tip={TOOLTIPS.rivalWar}>
              <span className="rival-hud__rival-kicker">Rival war</span>
            </GameTooltip>
            <span className="rival-hud__rival-status">
              {relationshipShort(tension.relationship)}
              {rivalBroken ? ' · broken' : ''}
            </span>
          </div>
          <div className="rival-hud__war-name-row">
            <div className="rival-hud__rival-name">{tension.name}</div>
            {tension.leaderName ? (
              <div className="rival-hud__rival-leader" title="Gang leader">
                Led by {tension.leaderName}
              </div>
            ) : null}
          </div>
          <div className="rival-hud__war-bars">
            <div className="rival-hud__war-row">
              <span className="rival-hud__war-label">You</span>
              <div
                className="rival-hud__war-bar"
                role="progressbar"
                aria-valuenow={Math.round(playerHpPct)}
              >
                <div
                  className="rival-hud__war-fill rival-hud__war-fill--you"
                  style={{ width: `${playerHpPct}%` }}
                />
              </div>
            </div>
            <div className="rival-hud__war-row">
              <span className="rival-hud__war-label">Them</span>
              <div
                className="rival-hud__war-bar"
                role="progressbar"
                aria-valuenow={Math.round(rivalHpPct)}
              >
                <div
                  className="rival-hud__war-fill rival-hud__war-fill--them"
                  style={{ width: `${rivalHpPct}%` }}
                />
              </div>
            </div>
            <div className="rival-hud__war-row">
              <span
                className="rival-hud__war-label"
                title="Rival war-power pool — broken rivals hit weaker and accept Truce."
              >
                Their⚡
              </span>
              <div
                className="rival-hud__war-bar"
                role="progressbar"
                aria-valuenow={Math.round(rivalPowerPct)}
              >
                <div
                  className="rival-hud__war-fill rival-hud__war-fill--power"
                  style={{ width: `${rivalPowerPct}%` }}
                />
              </div>
            </div>
          </div>
          {confirmingSurrender ? (
            <div className="rival-hud__war-confirm">
              <div className="rival-hud__war-confirm-msg">
                Surrender to {tension.name}? They'll take a random tribute (money or power) and
                you'll be able to take revenge later.
              </div>
              <div className="rival-hud__war-confirm-row">
                <button
                  type="button"
                  className="rival-hud__war-btn rival-hud__war-btn--danger"
                  onClick={() => {
                    setConfirmingSurrender(false)
                    onRivalSurrender(tension.id)
                  }}
                >
                  <span className="rival-hud__war-btn-label">Confirm</span>
                </button>
                <button
                  type="button"
                  className="rival-hud__war-btn rival-hud__war-btn--ghost"
                  onClick={() => setConfirmingSurrender(false)}
                >
                  <span className="rival-hud__war-btn-label">Cancel</span>
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="rival-hud__war-actions rival-hud__war-actions--duo">
                <button
                  type="button"
                  className="rival-hud__war-btn rival-hud__war-btn--atk"
                  disabled={!canAtk}
                  onClick={() => onRivalWarAttack(tension.id)}
                  title={`Spend ${atkCost.toLocaleString()} power to hit their crew line`}
                >
                  <span className="rival-hud__war-btn-label">Attack</span>
                  <span className="rival-hud__war-btn-cost">{atkCost.toLocaleString()}⚡</span>
                </button>
                <button
                  type="button"
                  className="rival-hud__war-btn rival-hud__war-btn--surge"
                  disabled={!canSurge}
                  onClick={() => onRivalWarSurge(tension.id)}
                  title={`Surge: spend ${surgeCost.toLocaleString()} power for a heavy hit and one free block.`}
                >
                  <span className="rival-hud__war-btn-label">Surge</span>
                  <span className="rival-hud__war-btn-cost">{surgeCost.toLocaleString()}⚡</span>
                </button>
              </div>
              <div className="rival-hud__war-actions rival-hud__war-actions--duo">
                <button
                  type="button"
                  className="rival-hud__war-btn rival-hud__war-btn--truce"
                  disabled={!canTruce}
                  onClick={() => onRivalTruce(tension.id)}
                  title={
                    rivalBroken
                      ? `Truce: the broken crew pays you ~$${truceTributeEst.toLocaleString()} + a little power. War ends, no revenge.`
                      : `Break their war-power pool first to unlock Truce.`
                  }
                >
                  <span className="rival-hud__war-btn-label">
                    {rivalBroken ? 'Truce' : 'Truce (locked)'}
                  </span>
                  <span className="rival-hud__war-btn-cost">
                    {rivalBroken ? `+~$${truceTributeEst.toLocaleString()}` : 'break ⚡'}
                  </span>
                </button>
                <button
                  type="button"
                  className="rival-hud__war-btn rival-hud__war-btn--surrender"
                  disabled={!canSurrender}
                  onClick={() => setConfirmingSurrender(true)}
                  title="Surrender: random tribute (money or power). Unlocks revenge later."
                >
                  <span className="rival-hud__war-btn-label">Surrender</span>
                  <span className="rival-hud__war-btn-cost">tribute · revenge</span>
                </button>
              </div>
            </>
          )}
        </div>
      ) : null}

      {canRevenge ? (
        <button type="button" className="rival-hud__revenge" onClick={onOpenRevenge}>
          Revenge ready
        </button>
      ) : null}
    </div>
  )
}
