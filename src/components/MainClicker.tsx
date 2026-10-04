import { useEffect, useState } from 'react'
import { TOOLTIPS } from '../data/tooltips'
import type { EventChoiceDef, GameState } from '../data/types'
import { getEmbeddedNarrativeEventDef, isGameplayModalBlocking } from '../game/lifeEventFlow'
import {
  autoHustleClicksPerSecond,
  clickMoneyAmount,
  clickPowerAmount,
  clickStreakActive,
  clickStreakMultiplier,
  passiveMoneyPerSecond,
  passivePowerPerSecond,
  streetLuckMoneyMultiplier,
} from '../game/compute'
import { CLICK_STREAK_WINDOW_MS } from '../game/constants'
import { totalEmpireScaleMultiplier } from '../game/empireMultiplierSources'
import { GameTooltip } from './GameTooltip'
import { HustleButton } from './HustleButton'
import { MinorLifeEventCard } from './MinorLifeEventCard'

type Props = {
  state: GameState
  onClick: () => void
  /** Non-blocking life or non-rival street event — center column, Hustle stays enabled. */
  embeddedEventId?: string | null
  onResolveEmbeddedEvent?: (eventId: string, choice: EventChoiceDef) => void
}

export function MainClicker({ state, onClick, embeddedEventId, onResolveEmbeddedEvent }: Props) {
  const mps = passiveMoneyPerSecond(state)
  const pps = passivePowerPerSecond(state)

  const [nowMs, setNowMs] = useState(() => Date.now())
  useEffect(() => {
    const id = window.setInterval(() => setNowMs(Date.now()), 250)
    return () => window.clearInterval(id)
  }, [])
  const streakLive = clickStreakActive(state, nowMs)
  const streakMult = streakLive ? clickStreakMultiplier(state, nowMs) : 1
  const streakFrac = streakLive
    ? Math.max(0, Math.min(1, (state.clickStreakUntilMs - nowMs) / CLICK_STREAK_WINDOW_MS))
    : 0
  const moneyGain = clickMoneyAmount(state) * streakMult
  const powerGain = clickPowerAmount(state) * streakMult
  const autoHustle = autoHustleClicksPerSecond(state)
  const luckMult = streetLuckMoneyMultiplier(state)
  const luckSecs =
    luckMult > 1 && state.streetLuckEndTick > state.tickCount
      ? state.streetLuckEndTick - state.tickCount
      : 0

  const embeddedId =
    embeddedEventId && onResolveEmbeddedEvent && getEmbeddedNarrativeEventDef(embeddedEventId)
      ? embeddedEventId
      : null

  return (
    <section className="main-clicker intro-stagger">
      <div className="main-clicker__above-life">
        <div className="main-clicker__stats">
          <div className="stat stat--money">
            <span className="stat__glyph" aria-hidden>
              <span className="stat__glyph-inner">$</span>
            </span>
            <div className="stat__body">
              <GameTooltip label="Money" tip={TOOLTIPS.money}>
                <span className="stat__label">Money</span>
              </GameTooltip>
              <span className="stat__value">${Math.floor(state.money).toLocaleString()}</span>
            </div>
          </div>
          <div className="stat stat--power">
            <span className="stat__glyph stat__glyph--power" aria-hidden>
              <span className="stat__glyph-inner">⚡</span>
            </span>
            <div className="stat__body">
              <GameTooltip label="Power" tip={TOOLTIPS.power}>
                <span className="stat__label">Power</span>
              </GameTooltip>
              <span className="stat__value">{Math.floor(state.power).toLocaleString()}</span>
            </div>
          </div>
        </div>
        <p className="main-clicker__rates">
          Passive +${mps.toFixed(1)}/s · +{pps.toFixed(1)} power/s
          {autoHustle > 0 ? (
            <>
              {' '}
              ·{' '}
              <GameTooltip label="Auto-hustle" tip={TOOLTIPS.autoHustle}>
                <span className="main-clicker__scale-tip">auto ×{autoHustle.toFixed(2)}/s</span>
              </GameTooltip>
            </>
          ) : null}
          {' · '}
          <GameTooltip label="Empire scale" tip={TOOLTIPS.passiveScale}>
            <span className="main-clicker__scale-tip">
              scale ×{totalEmpireScaleMultiplier(state).toFixed(2)}
            </span>
          </GameTooltip>
        </p>
        {luckMult > 1 && luckSecs > 0 ? (
          <p className="main-clicker__luck" role="status">
            <GameTooltip label="Street luck" tip={TOOLTIPS.streetLuck}>
              <span>
                Street luck ×{luckMult} · {luckSecs}s
              </span>
            </GameTooltip>
          </p>
        ) : null}
        <HustleButton
          onAction={onClick}
          moneyGain={moneyGain}
          powerGain={powerGain}
          disabled={isGameplayModalBlocking(state)}
        />
        {streakLive ? (
          <div
            className={`hustle-streak${state.clickStreak >= 25 ? ' hustle-streak--max' : ''}`}
            role="status"
            aria-live="polite"
          >
            <span className="hustle-streak__label">
              Streak ×{state.clickStreak}
              <em className="hustle-streak__mult">+{Math.round((streakMult - 1) * 100)}%</em>
            </span>
            <span className="hustle-streak__track" aria-hidden>
              <span className="hustle-streak__fill" style={{ width: `${streakFrac * 100}%` }} />
            </span>
          </div>
        ) : null}
      </div>
      {embeddedId && onResolveEmbeddedEvent ? (
        <div className="main-clicker__life-slot">
          <MinorLifeEventCard
            eventId={embeddedId}
            state={state}
            onResolve={onResolveEmbeddedEvent}
          />
        </div>
      ) : null}
    </section>
  )
}
