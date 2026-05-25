import { useCallback, useLayoutEffect, useRef } from 'react'
import { playTerritoryTakeoverCelebration } from '../animations/territoryTakeoverFeedback'
import { visibleTerritoryDefs } from '../data/territories'
import type { GameState } from '../data/types'
import type { TerritoryDef } from '../data/types'
import { TOOLTIPS } from '../data/tooltips'
import { businessesUnlockedByTerritory } from '../game/businessUnlocks'
import { GameTooltip } from './GameTooltip'

type Props = {
  state: GameState
  onTake: (id: string) => void
  /** After capture FX (~0.32s); use to re-emphasize narrator. */
  onCaptureCelebrated?: () => void
  /** Hide outer panel heading when nested in an accordion. */
  embedded?: boolean
}

function TerritoryRow({
  t,
  owned,
  onTake,
  onCaptureCelebrated,
}: {
  t: TerritoryDef
  owned: boolean
  onTake: (id: string) => void
  onCaptureCelebrated?: () => void
}) {
  const rowRef = useRef<HTMLLIElement>(null)
  const burstHostRef = useRef<HTMLSpanElement>(null)
  const badgeRef = useRef<HTMLSpanElement>(null)
  const prevOwnedRef = useRef<boolean | undefined>(undefined)

  const stableCelebration = useCallback(() => {
    onCaptureCelebrated?.()
  }, [onCaptureCelebrated])

  const bizUnlocks = businessesUnlockedByTerritory(t.id)

  useLayoutEffect(() => {
    if (prevOwnedRef.current === undefined) {
      prevOwnedRef.current = owned
      return
    }
    if (owned && !prevOwnedRef.current) {
      playTerritoryTakeoverCelebration({
        rowEl: rowRef.current,
        burstHost: burstHostRef.current,
        badgeEl: badgeRef.current,
        rewardMoney: t.rewardMoney,
        onComplete: stableCelebration,
      })
    }
    prevOwnedRef.current = owned
  }, [owned, t.rewardMoney, stableCelebration])

  return (
    <li ref={rowRef} className={`territory-row${owned ? ' territory-row--owned' : ''}`}>
      <span ref={burstHostRef} className="territory-row__burst-host" aria-hidden />
      <div className="territory-row__inner">
        <div className="territory-row__text-block">
          <div className="territory-row__name">
            {t.name}
            {owned && (
              <span ref={badgeRef} className="badge badge--owned">
                Owned
              </span>
            )}
          </div>
          <div className="territory-row__desc">{t.description}</div>
          <div className="territory-row__req">
            Needs {t.powerRequired} power · Reward ${t.rewardMoney.toLocaleString()}
          </div>
          {bizUnlocks.length > 0 ? (
            <div
              className="territory-row__unlocks territory-row__unlocks--chips"
              aria-label="Unlocks"
            >
              <span className="territory-row__unlocks-label">Unlocks</span>
              <div className="territory-row__unlocks-chips">
                {bizUnlocks.map((b) => (
                  <span key={b.id} className="territory-unlock-chip">
                    {b.name}
                  </span>
                ))}
              </div>
            </div>
          ) : null}
        </div>
        <button
          type="button"
          className="territory-row__btn"
          disabled={owned}
          onClick={() => onTake(t.id)}
          title={owned ? 'Already yours' : undefined}
        >
          {owned ? 'Yours' : 'Attempt takeover'}
        </button>
      </div>
    </li>
  )
}

export function TerritoryPanel({ state, onTake, onCaptureCelebrated, embedded }: Props) {
  const visible = visibleTerritoryDefs(state.territoriesOwned)
  return (
    <section
      className={`territory-panel intro-stagger${embedded ? ' territory-panel--embedded' : ''}`}
    >
      {embedded ? null : (
        <h2 className="territory-panel__heading">
          <GameTooltip label="Territories" tip={TOOLTIPS.territories}>
            <span>Territories</span>
          </GameTooltip>
        </h2>
      )}
      <ul className="territory-list">
        {visible.map((t) => (
          <TerritoryRow
            key={t.id}
            t={t}
            owned={!!state.territoriesOwned[t.id]}
            onTake={onTake}
            onCaptureCelebrated={onCaptureCelebrated}
          />
        ))}
      </ul>
    </section>
  )
}
