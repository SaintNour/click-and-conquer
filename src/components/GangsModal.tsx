import { useEffect, useMemo } from 'react'
import type { GameState } from '../data/types'
import type { RivalRelationship, RivalState } from '../data/rivalTypes'
import { isRivalEliminationEligible, RELATIONSHIP_POINTS_START } from '../game/rivalsEngine'
import {
  effectiveTerritoryPowerRequired,
  rivalDefenseFloorFromTerritory,
  territoryDefById,
  visibleTierRange,
} from '../game/tierEngine'

type Props = {
  state: GameState
  open: boolean
  onClose: () => void
  onBeginEliminationWar: (rivalId: string) => void
}

function relationshipLabel(rel: RivalRelationship): string {
  switch (rel) {
    case 'neutral':
      return 'Neutral'
    case 'rival':
      return 'Rival'
    case 'enemy':
      return 'Enemy'
    case 'nemesis':
      return 'Nemesis'
  }
}

export function GangsModal({ state, open, onClose, onBeginEliminationWar }: Props) {
  const { min: tierMin, max: tierMax } = visibleTierRange(state)
  const warBusy = Boolean(state.gangWarRivalId)

  const rivalsInBracket = useMemo(() => {
    const list: RivalState[] = []
    for (const r of Object.values(state.rivals)) {
      if (!r || r.alive === false) continue
      const tier = r.tier ?? 1
      if (tier >= tierMin && tier <= tierMax) list.push(r)
    }
    list.sort((a, b) => {
      const ra =
        a.relationship === 'nemesis'
          ? 3
          : a.relationship === 'enemy'
            ? 2
            : a.relationship === 'rival'
              ? 1
              : 0
      const rb =
        b.relationship === 'nemesis'
          ? 3
          : b.relationship === 'enemy'
            ? 2
            : b.relationship === 'rival'
              ? 1
              : 0
      if (rb !== ra) return rb - ra
      return b.territoryCount - a.territoryCount
    })
    return list
  }, [state.rivals, tierMin, tierMax])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      className="gangs-modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="gangs-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="modal modal--gangs" onClick={(e) => e.stopPropagation()}>
        <div className="gangs-modal__head">
          <h2 id="gangs-modal-title" className="modal__title gangs-modal__title">
            Gangs
          </h2>
          <button
            type="button"
            className="gangs-modal__close"
            onClick={onClose}
            aria-label="Close gangs"
          >
            ×
          </button>
        </div>
        <p className="gangs-modal__sub">
          Crews on tiers T{tierMin}–T{tierMax} (always includes early turf; extends one tier above
          yours). Power is how hard they hit in the street; tension tracks how close you are to the
          next relationship tier.
        </p>
        <div className="gangs-modal__scroll">
          <ul className="city-map__rival-list gangs-modal__list">
            {rivalsInBracket.map((r) => {
              const pts = r.relationshipPoints ?? RELATIONSHIP_POINTS_START
              const bigReady = isRivalEliminationEligible(state, r.id)
              const crewRating = Math.max(r.powerLevel, rivalDefenseFloorFromTerritory(state, r.id))
              const ownedByRival = Object.entries(state.territoryOwner ?? {}).filter(
                ([tid, oid]) => oid === r.id && !state.territoriesOwned[tid],
              )
              return (
                <li
                  key={r.id}
                  className="city-map__rival-card"
                  style={{ borderLeftColor: r.colorTag }}
                >
                  <div className="city-map__rival-top">
                    <span className="city-map__rival-name">{r.name}</span>
                    <span className="city-map__rival-tier">T{r.tier ?? '?'}</span>
                  </div>
                  {r.leaderName ? (
                    <div className="city-map__rival-leader">Led by {r.leaderName}</div>
                  ) : null}
                  <div className="gangs-modal__stats-row">
                    <span>
                      Crew strength: <strong>{crewRating.toLocaleString()}⚡</strong>
                      <span className="gangs-modal__stats-hint"> (includes turf they hold)</span>
                    </span>
                    <span>
                      War pool: <strong>{r.warPowerHp}</strong> / {r.warPowerHpMax}
                    </span>
                  </div>
                  <div className="city-map__rival-rel">
                    <span className="city-map__rival-rel-label">
                      {relationshipLabel(r.relationship)}
                    </span>
                    <div
                      className="city-map__rel-bar"
                      role="progressbar"
                      aria-valuenow={pts}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-label={`Relationship tension ${pts}`}
                    >
                      <div className="city-map__rel-fill" style={{ width: `${pts}%` }} />
                    </div>
                    <span className="city-map__rel-pct">{pts}</span>
                  </div>
                  <div className="city-map__rival-turf">
                    Turf held: <strong>{r.territoryCount}</strong>
                    {bigReady ? (
                      <span
                        className="city-map__rival-ready"
                        title="No corners left — nemesis line open"
                      >
                        {' '}
                        · Big war ready
                      </span>
                    ) : null}
                  </div>
                  {bigReady && !warBusy ? (
                    <button
                      type="button"
                      className="city-map__elimination-btn"
                      onClick={() => {
                        onBeginEliminationWar(r.id)
                        onClose()
                      }}
                    >
                      Start elimination war
                    </button>
                  ) : null}
                  {ownedByRival.length > 0 ? (
                    <ul className="city-map__rival-tiles">
                      {ownedByRival.slice(0, 8).map(([tid]) => {
                        const d = territoryDefById(tid)
                        if (!d) return null
                        const rq = effectiveTerritoryPowerRequired(state, d)
                        return (
                          <li key={tid} className="gangs-modal__turf-hint">
                            Holds {d.name} — need <strong>{rq.toLocaleString()}⚡</strong> to push
                            from the map
                          </li>
                        )
                      })}
                    </ul>
                  ) : null}
                </li>
              )
            })}
          </ul>
        </div>
      </div>
    </div>
  )
}
