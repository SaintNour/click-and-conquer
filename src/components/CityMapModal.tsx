import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { GameState } from '../data/types'
import { territoriesOwnedCount } from '../game/compute'
import {
  CITY_MAP_VIEWBOX,
  CITY_MAP_VIEW_H,
  CITY_MAP_VIEW_W,
  buildCityMapRegions,
  buildCityMapRiverPath,
} from '../game/cityMapGeometry'
import {
  STATIC_TIER_BRACKETS,
  TIER_COUNT,
  TERRITORIES_PER_TIER,
  effectiveTerritoryPowerRequired,
  playerPowerBracket,
  rivalDefenseFloorFromTerritory,
  territoryDefenseRating,
  territoryDefById,
  visibleTierRange,
} from '../game/tierEngine'

type Props = {
  state: GameState
  open: boolean
  onClose: () => void
  onTakeTerritory: (territoryId: string) => void
}

function collectTerritoryIdsForTiers(min: number, max: number): string[] {
  const ids: string[] = []
  for (let t = min; t <= max; t++) {
    const bracket = STATIC_TIER_BRACKETS.find((x) => x.tier === t)
    if (bracket) {
      ids.push(...bracket.territoryIds)
      continue
    }
    if (t <= TIER_COUNT) continue
    const offset = (t - TIER_COUNT - 1) * TERRITORIES_PER_TIER
    ids.push(`inf_${offset}`, `inf_${offset + 1}`, `inf_${offset + 2}`)
  }
  return ids
}

function shortTerritoryLabel(name: string, max = 17): string {
  const t = name.trim()
  if (t.length <= max) return t
  return `${t.slice(0, max - 1)}…`
}

export function CityMapModal({ state, open, onClose, onTakeTerritory }: Props) {
  const { min: tierMin, max: tierMax } = visibleTierRange(state)
  const bracket = playerPowerBracket(state)
  const ownedCount = territoriesOwnedCount(state)
  const warBusy = Boolean(state.gangWarRivalId)

  const territoryIds = useMemo(
    () => collectTerritoryIdsForTiers(tierMin, tierMax),
    [tierMin, tierMax],
  )

  const regions = useMemo(() => buildCityMapRegions(territoryIds), [territoryIds])

  const [hoverTid, setHoverTid] = useState<string | null>(null)
  const [tipPos, setTipPos] = useState({ x: 0, y: 0 })
  const [tipBox, setTipBox] = useState({ left: 8, top: 8 })
  const [confirmTid, setConfirmTid] = useState<string | null>(null)
  const mapWrapRef = useRef<HTMLDivElement>(null)
  const tipRef = useRef<HTMLDivElement>(null)

  const hoverDef = hoverTid ? territoryDefById(hoverTid) : null
  const hoverOwnerId = hoverTid ? (state.territoryOwner?.[hoverTid] ?? null) : null
  const hoverRival = hoverOwnerId ? state.rivals[hoverOwnerId] : null
  const hoverOwned = hoverTid ? !!state.territoriesOwned[hoverTid] : false
  const hoverReq = hoverDef ? effectiveTerritoryPowerRequired(state, hoverDef) : 0
  const hoverWardDefense =
    hoverTid && hoverDef && hoverRival && !hoverOwned
      ? territoryDefenseRating(state, hoverTid)
      : null
  const hoverCrewRating =
    hoverRival && !hoverOwned
      ? Math.max(hoverRival.powerLevel, rivalDefenseFloorFromTerritory(state, hoverRival.id))
      : null

  useEffect(() => {
    if (!open) {
      setHoverTid(null)
      setConfirmTid(null)
    }
  }, [open])

  useLayoutEffect(() => {
    if (!open || !hoverTid || !mapWrapRef.current) return
    if (!territoryDefById(hoverTid)) return
    const wrap = mapWrapRef.current
    const tw = tipRef.current?.offsetWidth ?? 260
    const th = tipRef.current?.offsetHeight ?? 140
    const m = 8
    const ax = tipPos.x + 16
    const ay = tipPos.y + 20
    const left = Math.min(Math.max(m, ax), Math.max(m, wrap.clientWidth - tw - m))
    const top = Math.min(Math.max(m, ay), Math.max(m, wrap.clientHeight - th - m))
    setTipBox({ left, top })
  }, [
    open,
    hoverTid,
    hoverOwned,
    hoverReq,
    hoverWardDefense,
    hoverCrewRating,
    hoverRival?.name,
    tipPos.x,
    tipPos.y,
  ])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (confirmTid) setConfirmTid(null)
        else onClose()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose, confirmTid])

  const updateTipFromEvent = useCallback((clientX: number, clientY: number) => {
    const wrap = mapWrapRef.current
    if (!wrap) return
    const r = wrap.getBoundingClientRect()
    setTipPos({ x: clientX - r.left, y: clientY - r.top })
  }, [])

  const onSvgMove = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      const el = e.target as Element | null
      const path = el?.closest?.('[data-tid]')
      const tid = path?.getAttribute('data-tid') ?? null
      setHoverTid(tid)
      updateTipFromEvent(e.clientX, e.clientY)
    },
    [updateTipFromEvent],
  )

  const onSvgLeave = useCallback(() => {
    setHoverTid(null)
  }, [])

  if (!open) return null

  const bracketLabel =
    bracket.max === Number.POSITIVE_INFINITY
      ? `${bracket.min.toLocaleString()}+⚡`
      : `${bracket.min.toLocaleString()}–${bracket.max.toLocaleString()}⚡`

  const confirmDef = confirmTid ? territoryDefById(confirmTid) : null
  const confirmOwnerId = confirmTid ? (state.territoryOwner?.[confirmTid] ?? null) : null
  const confirmRival = confirmOwnerId ? state.rivals[confirmOwnerId] : null
  const confirmOwned = confirmTid ? !!state.territoriesOwned[confirmTid] : false
  const confirmReq = confirmDef ? effectiveTerritoryPowerRequired(state, confirmDef) : 0
  const confirmWardDefense =
    confirmTid && confirmDef && confirmRival && !confirmOwned
      ? territoryDefenseRating(state, confirmTid)
      : null
  const confirmCrewRating =
    confirmRival && !confirmOwned
      ? Math.max(confirmRival.powerLevel, rivalDefenseFloorFromTerritory(state, confirmRival.id))
      : null
  const confirmCanTry =
    confirmTid && confirmDef ? !warBusy && !confirmOwned && state.power >= confirmReq : false

  return (
    <div
      className="city-map-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="city-map-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="modal modal--city-map" onClick={(e) => e.stopPropagation()}>
        <div className="city-map__head">
          <h2 id="city-map-title" className="modal__title city-map__title">
            City turf control
          </h2>
          <button
            type="button"
            className="city-map__close"
            onClick={onClose}
            aria-label="Close city map"
          >
            ×
          </button>
        </div>

        <div className="city-map__strip" role="status">
          <span className="city-map__strip-item">
            <strong>Your tier T{bracket.tier}</strong>
          </span>
          <span className="city-map__strip-dot" aria-hidden>
            ·
          </span>
          <span className="city-map__strip-item">Power bracket ~{bracketLabel}</span>
          <span className="city-map__strip-dot" aria-hidden>
            ·
          </span>
          <span className="city-map__strip-item">{ownedCount} territories held</span>
          <span className="city-map__strip-dot" aria-hidden>
            ·
          </span>
          <span className="city-map__strip-item">
            Wards T{tierMin}–T{tierMax}
          </span>
          <span className="city-map__strip-dot" aria-hidden>
            ·
          </span>
          <span className="city-map__strip-item">Hover a ward · click to try takeover</span>
        </div>

        <div className="city-map__body city-map__body--map-only">
          <div className="city-map__map city-map__map--svg" ref={mapWrapRef}>
            <svg
              className="city-map__svg"
              viewBox={CITY_MAP_VIEWBOX}
              preserveAspectRatio="xMidYMid meet"
              role="img"
              aria-label="City wards map"
              onMouseMove={onSvgMove}
              onMouseLeave={onSvgLeave}
            >
              <defs>
                <linearGradient id="city-map-ocean" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#0c1929" />
                  <stop offset="55%" stopColor="#071018" />
                  <stop offset="100%" stopColor="#020617" />
                </linearGradient>
                <pattern id="city-map-grid" width="28" height="28" patternUnits="userSpaceOnUse">
                  <path
                    d="M 28 0 L 0 0 0 28"
                    fill="none"
                    stroke="rgba(148, 163, 184, 0.07)"
                    strokeWidth="1"
                  />
                </pattern>
                <radialGradient id="city-map-vignette" cx="50%" cy="45%" r="72%">
                  <stop offset="0%" stopColor="rgba(15, 23, 42, 0)" />
                  <stop offset="100%" stopColor="rgba(2, 6, 23, 0.55)" />
                </radialGradient>
                <filter id="city-map-ward-shadow" x="-12%" y="-12%" width="124%" height="124%">
                  <feDropShadow
                    dx="0"
                    dy="4"
                    stdDeviation="3"
                    floodColor="#020617"
                    floodOpacity="0.5"
                  />
                </filter>
                <filter id="city-map-river-glow" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur in="SourceGraphic" stdDeviation="10" result="b" />
                  <feMerge>
                    <feMergeNode in="b" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>

              <rect width={CITY_MAP_VIEW_W} height={CITY_MAP_VIEW_H} fill="url(#city-map-ocean)" />
              <rect
                width={CITY_MAP_VIEW_W}
                height={CITY_MAP_VIEW_H}
                fill="url(#city-map-grid)"
                opacity="0.9"
                pointerEvents="none"
              />
              <rect
                width={CITY_MAP_VIEW_W}
                height={CITY_MAP_VIEW_H}
                fill="url(#city-map-vignette)"
                pointerEvents="none"
              />

              <path
                d={buildCityMapRiverPath()}
                fill="none"
                stroke="rgba(14, 165, 233, 0.12)"
                strokeWidth="46"
                strokeLinecap="round"
                pointerEvents="none"
              />
              <path
                d={buildCityMapRiverPath()}
                fill="none"
                stroke="rgba(56, 189, 248, 0.35)"
                strokeWidth="3.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                filter="url(#city-map-river-glow)"
                pointerEvents="none"
              />

              {regions.map((g) => {
                const def = territoryDefById(g.id)
                if (!def) return null
                const owned = !!state.territoriesOwned[g.id]
                const ownerId = state.territoryOwner?.[g.id] ?? null
                const rival = ownerId ? state.rivals[ownerId] : null
                const stripe = rival?.colorTag ?? (owned ? '#22c55e' : '#64748b')
                const isHover = hoverTid === g.id
                return (
                  <g key={g.id} className="city-map__ward-cell">
                    <path
                      className={`city-map__region${owned ? ' city-map__region--owned' : ''}${
                        isHover ? ' city-map__region--hover' : ''
                      }`}
                      d={g.d}
                      fill={stripe}
                      data-tid={g.id}
                      onClick={() => setConfirmTid(g.id)}
                    />
                    <text
                      className="city-map__ward-label"
                      x={g.labelX}
                      y={g.labelY}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      pointerEvents="none"
                    >
                      {shortTerritoryLabel(def.name)}
                    </text>
                  </g>
                )
              })}

              <g
                className="city-map__svg-frame"
                pointerEvents="none"
                fill="none"
                strokeLinecap="square"
              >
                <path
                  stroke="rgba(56, 189, 248, 0.55)"
                  strokeWidth="2.25"
                  d={`M 18 52 L 18 18 L 52 18 M ${CITY_MAP_VIEW_W - 52} 18 L ${CITY_MAP_VIEW_W - 18} 18 L ${CITY_MAP_VIEW_W - 18} 52 M 18 ${CITY_MAP_VIEW_H - 52} L 18 ${CITY_MAP_VIEW_H - 18} L 52 ${CITY_MAP_VIEW_H - 18} M ${CITY_MAP_VIEW_W - 18} ${CITY_MAP_VIEW_H - 52} L ${CITY_MAP_VIEW_W - 18} ${CITY_MAP_VIEW_H - 18} L ${CITY_MAP_VIEW_W - 52} ${CITY_MAP_VIEW_H - 18}`}
                />
                <path
                  stroke="rgba(125, 211, 252, 0.22)"
                  strokeWidth="1"
                  d={`M 26 60 L 26 26 L 60 26 M ${CITY_MAP_VIEW_W - 60} 26 L ${CITY_MAP_VIEW_W - 26} 26 L ${CITY_MAP_VIEW_W - 26} 60 M 26 ${CITY_MAP_VIEW_H - 60} L 26 ${CITY_MAP_VIEW_H - 26} L 60 ${CITY_MAP_VIEW_H - 26} M ${CITY_MAP_VIEW_W - 26} ${CITY_MAP_VIEW_H - 60} L ${CITY_MAP_VIEW_W - 26} ${CITY_MAP_VIEW_H - 26} L ${CITY_MAP_VIEW_W - 60} ${CITY_MAP_VIEW_H - 26}`}
                />
              </g>
            </svg>

            {hoverTid && hoverDef ? (
              <div
                ref={tipRef}
                className="city-map__tooltip"
                style={{
                  left: tipBox.left,
                  top: tipBox.top,
                }}
              >
                <div className="city-map__tooltip-title">{hoverDef.name}</div>
                <div className="city-map__tooltip-row">
                  <span className="city-map__tooltip-k">Owner</span>
                  <span className="city-map__tooltip-v">
                    {hoverOwned ? 'You' : hoverRival ? hoverRival.name : 'Open'}
                  </span>
                </div>
                {hoverRival &&
                !hoverOwned &&
                hoverWardDefense != null &&
                hoverCrewRating != null ? (
                  <>
                    <div className="city-map__tooltip-row">
                      <span className="city-map__tooltip-k">Defense (this ward)</span>
                      <span className="city-map__tooltip-v">
                        {hoverWardDefense.toLocaleString()}⚡
                      </span>
                    </div>
                    <div className="city-map__tooltip-row">
                      <span className="city-map__tooltip-k">Crew strength</span>
                      <span className="city-map__tooltip-v">
                        {hoverCrewRating.toLocaleString()}⚡
                      </span>
                    </div>
                  </>
                ) : null}
                <div className="city-map__tooltip-row city-map__tooltip-row--push">
                  <span className="city-map__tooltip-k">Your push cost</span>
                  <span className="city-map__tooltip-v">{hoverReq.toLocaleString()}⚡</span>
                </div>
                <div className="city-map__tooltip-row">
                  <span className="city-map__tooltip-k">Income</span>
                  <span className="city-map__tooltip-v">
                    +${hoverDef.rewardMoney.toLocaleString()}
                  </span>
                </div>
              </div>
            ) : null}

            {confirmTid && confirmDef ? (
              <div
                className="city-map__confirm"
                role="alertdialog"
                aria-labelledby="city-map-confirm-title"
                aria-describedby="city-map-confirm-desc"
                onClick={() => setConfirmTid(null)}
              >
                <div className="city-map__confirm-panel" onClick={(e) => e.stopPropagation()}>
                  <h3 id="city-map-confirm-title" className="city-map__confirm-title">
                    {confirmOwned ? 'Your ward' : 'Attempt takeover?'}
                  </h3>
                  <p id="city-map-confirm-desc" className="city-map__confirm-desc">
                    {confirmOwned ? (
                      <>
                        <strong>{confirmDef.name}</strong> is already on your books.
                      </>
                    ) : (
                      <>
                        Push on <strong>{confirmDef.name}</strong> — costs{' '}
                        <strong>{confirmReq.toLocaleString()}⚡</strong>
                        {confirmRival ? (
                          <>
                            {' '}
                            and crosses <strong>{confirmRival.name}</strong> — crew strength about{' '}
                            <strong>
                              {(confirmCrewRating ?? confirmRival.powerLevel).toLocaleString()}⚡
                            </strong>
                            {confirmWardDefense != null ? (
                              <>
                                {' '}
                                (ward defense ~
                                <strong>{confirmWardDefense.toLocaleString()}⚡</strong>).
                              </>
                            ) : (
                              '.'
                            )}
                          </>
                        ) : (
                          ' (open turf).'
                        )}
                        {warBusy ? ' You already have a war open.' : ''}
                        {!warBusy && state.power < confirmReq
                          ? ` You only have ${state.power.toLocaleString()}⚡.`
                          : null}
                      </>
                    )}
                  </p>
                  <div className="city-map__confirm-actions">
                    {confirmOwned ? (
                      <button
                        type="button"
                        className="city-map__confirm-btn"
                        onClick={() => setConfirmTid(null)}
                      >
                        OK
                      </button>
                    ) : (
                      <>
                        <button
                          type="button"
                          className="city-map__confirm-btn"
                          onClick={() => setConfirmTid(null)}
                        >
                          No
                        </button>
                        <button
                          type="button"
                          className="city-map__confirm-btn city-map__confirm-btn--primary"
                          disabled={!confirmCanTry}
                          onClick={() => {
                            onTakeTerritory(confirmTid)
                            setConfirmTid(null)
                            onClose()
                          }}
                        >
                          Yes, attempt takeover
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  )
}
