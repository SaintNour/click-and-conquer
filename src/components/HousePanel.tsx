import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from 'react'
import { HOUSE_ITEMS, houseItemById, type HouseItemEffect } from '../data/houseItems'
import { houseGridSize, slotKeysForGrid } from '../game/houseCustomizationEngine'
import {
  getHomeDefenseProfile,
  homeDefenseScore,
  placedDefenseItemsRanked,
} from '../game/homeDefenseEngine'
import {
  playHomeThreatPulse,
  playHouseSlotPlaceAnim,
  startHouseItemIdle,
} from '../animations/houseFx'
import { TOOLTIPS } from '../data/tooltips'
import type { GameState } from '../data/types'
import { GameTooltip } from './GameTooltip'

const DRAG_MOVE_PX = 8

function defenseHint(effect: HouseItemEffect): string {
  const d = effect.defense
  if (!d) return ''
  const bits: string[] = []
  if (d.security) bits.push(`+${d.security} security`)
  if (d.detection) bits.push(`+${d.detection} detection`)
  if (d.intimidation) bits.push(`+${d.intimidation} intimidation`)
  if (d.durability) bits.push(`+${d.durability} durability`)
  if (bits.length === 0) return ''
  return ` · ${bits.join(', ')}`
}

type Props = {
  state: GameState
  onBuyItem: (itemId: string) => void
  onPlace: (slotKey: string, itemId: string | null) => void
}

type DragRef = {
  itemId: string
  sx: number
  sy: number
  moved: boolean
  pointerId: number
  source: 'catalog' | 'slot'
  fromSlotKey?: string
}

export function HousePanel({ state, onBuyItem, onPlace }: Props) {
  const size = houseGridSize(state)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [draggingItemId, setDraggingItemId] = useState<string | null>(null)
  const [hoverSlotKey, setHoverSlotKey] = useState<string | null>(null)
  const slotRefs = useRef<Record<string, HTMLButtonElement | null>>({})
  const panelRef = useRef<HTMLDivElement>(null)
  const dragRef = useRef<DragRef | null>(null)
  const ignoreNextClickRef = useRef(false)
  const defense = getHomeDefenseProfile(state)
  const score = homeDefenseScore(defense)
  const decorPts = placedDefenseItemsRanked(state).reduce((s, x) => s + x.points, 0)
  const readinessPct = Math.min(100, Math.round((score / 52) * 100))

  useEffect(() => {
    if (state.homeThreatPulseNonce === 0) return
    playHomeThreatPulse(panelRef.current)
  }, [state.homeThreatPulseNonce])

  const updateHoverFromPoint = useCallback((clientX: number, clientY: number) => {
    const el = document.elementFromPoint(clientX, clientY)
    const slot = el?.closest?.('[data-house-slot]') as HTMLElement | null
    setHoverSlotKey(slot?.getAttribute('data-house-slot') ?? null)
  }, [])

  useEffect(() => {
    const d = dragRef.current
    if (!d?.moved) return

    const move = (ev: PointerEvent) => {
      if (ev.pointerId !== d.pointerId) return
      updateHoverFromPoint(ev.clientX, ev.clientY)
    }
    window.addEventListener('pointermove', move)
    return () => window.removeEventListener('pointermove', move)
  }, [draggingItemId, updateHoverFromPoint])

  const endDrag = useCallback(
    (ev: PointerEvent) => {
      const d = dragRef.current
      if (!d || ev.pointerId !== d.pointerId) return

      if (d.moved) {
        const el = document.elementFromPoint(ev.clientX, ev.clientY)
        const slot = el?.closest?.('[data-house-slot]') as HTMLElement | null
        const key = slot?.getAttribute('data-house-slot')
        if (key && !(d.source === 'slot' && d.fromSlotKey === key)) {
          onPlace(key, d.itemId)
          playHouseSlotPlaceAnim(slotRefs.current[key])
          ignoreNextClickRef.current = true
          queueMicrotask(() => {
            ignoreNextClickRef.current = false
          })
        }
        dragRef.current = null
        setDraggingItemId(null)
        setHoverSlotKey(null)
        setSelectedId(null)
        return
      }

      dragRef.current = null
      setDraggingItemId(null)
      setHoverSlotKey(null)
    },
    [onPlace],
  )

  const onSlotClick = useCallback(
    (slotKey: string) => {
      const placements = state.housePlacements ?? {}
      if (ignoreNextClickRef.current) return
      if (selectedId) {
        onPlace(slotKey, selectedId)
        playHouseSlotPlaceAnim(slotRefs.current[slotKey])
        setSelectedId(null)
        return
      }
      if (placements[slotKey]) {
        onPlace(slotKey, null)
      }
    },
    [onPlace, selectedId, state.housePlacements],
  )

  const onDecorPointerDown = useCallback((e: ReactPointerEvent, itemId: string, has: boolean) => {
    if (!has || e.button !== 0) return
    dragRef.current = {
      itemId,
      sx: e.clientX,
      sy: e.clientY,
      moved: false,
      pointerId: e.pointerId,
      source: 'catalog',
    }
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
  }, [])

  const onDecorPointerMove = useCallback(
    (e: ReactPointerEvent) => {
      const d = dragRef.current
      if (!d || e.pointerId !== d.pointerId || d.source !== 'catalog') return
      if (d.moved) return
      if (Math.hypot(e.clientX - d.sx, e.clientY - d.sy) >= DRAG_MOVE_PX) {
        d.moved = true
        setDraggingItemId(d.itemId)
        updateHoverFromPoint(e.clientX, e.clientY)
      }
    },
    [updateHoverFromPoint],
  )

  const onDecorPointerUp = useCallback(
    (e: ReactPointerEvent) => {
      const d = dragRef.current
      if (!d || e.pointerId !== d.pointerId || d.source !== 'catalog') return
      try {
        ;(e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId)
      } catch {
        /* released */
      }
      endDrag(e.nativeEvent)
    },
    [endDrag],
  )

  const onSlotPointerDown = useCallback(
    (e: ReactPointerEvent, slotKey: string, itemId: string | undefined) => {
      if (!itemId || e.button !== 0) return
      dragRef.current = {
        itemId,
        sx: e.clientX,
        sy: e.clientY,
        moved: false,
        pointerId: e.pointerId,
        source: 'slot',
        fromSlotKey: slotKey,
      }
      ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
    },
    [],
  )

  const onSlotPointerMove = useCallback(
    (e: ReactPointerEvent) => {
      const d = dragRef.current
      if (!d || e.pointerId !== d.pointerId || d.source !== 'slot') return
      if (d.moved) {
        updateHoverFromPoint(e.clientX, e.clientY)
        return
      }
      if (Math.hypot(e.clientX - d.sx, e.clientY - d.sy) >= DRAG_MOVE_PX) {
        d.moved = true
        setDraggingItemId(d.itemId)
        updateHoverFromPoint(e.clientX, e.clientY)
      }
    },
    [updateHoverFromPoint],
  )

  const onSlotPointerUp = useCallback(
    (e: ReactPointerEvent) => {
      const d = dragRef.current
      if (!d || e.pointerId !== d.pointerId || d.source !== 'slot') return
      try {
        ;(e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId)
      } catch {
        /* released */
      }
      endDrag(e.nativeEvent)
    },
    [endDrag],
  )

  if (size <= 0) {
    return (
      <div className="house-panel house-panel--locked">
        <div className="house-panel__hq-head">
          <span className="house-panel__hq-title">HQ</span>
          <span className="house-panel__hq-note">Move in to customize your space.</span>
        </div>
      </div>
    )
  }

  const keys = slotKeysForGrid(size)
  const owned = state.houseOwnedItems ?? {}

  return (
    <div ref={panelRef} className={`house-panel${draggingItemId ? ' house-panel--dragging' : ''}`}>
      <div className="house-panel__hq-head">
        <span className="house-panel__hq-title">HQ</span>
        <span className="house-panel__hq-hint">
          {draggingItemId
            ? 'Release on a slot to place · release elsewhere to cancel'
            : selectedId
              ? 'Tap a slot to place'
              : 'Select décor, drag to a slot, or tap a filled slot to clear'}
        </span>
      </div>
      <div className="house-panel__defense" aria-label="Home defense profile">
        <div className="house-panel__defense-top">
          <span className="house-panel__defense-title">
            <GameTooltip label="Home defense" tip={TOOLTIPS.defense}>
              <span>Home defense</span>
            </GameTooltip>
          </span>
          <span className="house-panel__defense-readiness">
            <GameTooltip label="Readiness" tip={TOOLTIPS.defense}>
              <span>
                Readiness <strong>{readinessPct}%</strong>
              </span>
            </GameTooltip>
          </span>
        </div>
        <div
          className="house-panel__defense-meter"
          role="meter"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={readinessPct}
          aria-label={`Defense readiness ${readinessPct} percent`}
        >
          <span className="house-panel__defense-meter-fill" style={{ width: `${readinessPct}%` }} />
        </div>
        <p className="house-panel__defense-blurb">
          Tier plus décor feed these stats. When rivals come to your address, rolls use this
          profile—plus your power.
          {decorPts > 0 ? (
            <>
              {' '}
              <span className="house-panel__defense-lift">
                Placed décor: +{decorPts} defense points.
              </span>
            </>
          ) : null}
        </p>
        <div className="house-panel__defense-stats">
          <span className="house-panel__defense-stat" title="Security — locks, muscle, posture">
            Sec <strong>{defense.security}</strong>
          </span>
          <span className="house-panel__defense-stat" title="Detection — cameras, awareness">
            Det <strong>{defense.detection}</strong>
          </span>
          <span className="house-panel__defense-stat" title="Intimidation — presence, reputation">
            Int <strong>{defense.intimidation}</strong>
          </span>
          <span className="house-panel__defense-stat" title="Durability — doors, infrastructure">
            Dur <strong>{defense.durability}</strong>
          </span>
        </div>
      </div>

      <div
        className="house-grid"
        style={{
          gridTemplateColumns: `repeat(${size}, minmax(0, 1fr))`,
        }}
      >
        {keys.map((key) => {
          const itemId = (state.housePlacements ?? {})[key]
          const def = itemId ? houseItemById(itemId) : undefined
          const hover = hoverSlotKey === key && draggingItemId
          return (
            <button
              key={key}
              type="button"
              data-house-slot={key}
              ref={(el) => {
                slotRefs.current[key] = el
              }}
              className={`house-slot${itemId ? ' house-slot--filled' : ''}${hover ? ' house-slot--drop-hover' : ''}`}
              onClick={() => onSlotClick(key)}
              onPointerDown={(e) => onSlotPointerDown(e, key, itemId)}
              onPointerMove={onSlotPointerMove}
              onPointerUp={onSlotPointerUp}
            >
              {def ? (
                <span className="house-slot__ico" aria-hidden>
                  <HouseItemIdleIcon icon={def.icon} />
                </span>
              ) : (
                <span className="house-slot__empty">+</span>
              )}
            </button>
          )
        })}
      </div>

      <div className="house-panel__shop" aria-label="HQ décor">
        <span className="house-panel__shop-label">
          <GameTooltip label="Catalog" tip={TOOLTIPS.home}>
            <span>Catalog</span>
          </GameTooltip>
        </span>
        <div className="house-item-row house-item-row--scroll">
          {HOUSE_ITEMS.map((it) => {
            const has = !!owned[it.id]
            const affordable =
              (it.costMoney === undefined || state.money >= it.costMoney) &&
              (it.costPower === undefined || state.power >= it.costPower)
            const isSel = selectedId === it.id
            const isDrag = draggingItemId === it.id
            return (
              <button
                key={it.id}
                type="button"
                className={`house-item-pill${isSel ? ' house-item-pill--selected' : ''}${has ? ' house-item-pill--owned' : ''}${isDrag ? ' house-item-pill--dragging' : ''}`}
                disabled={!has && !affordable}
                onPointerDown={(e) => has && onDecorPointerDown(e, it.id, has)}
                onPointerMove={onDecorPointerMove}
                onPointerUp={onDecorPointerUp}
                onClick={() => {
                  if (ignoreNextClickRef.current) return
                  if (!has) {
                    if (affordable) onBuyItem(it.id)
                    return
                  }
                  setSelectedId((s) => (s === it.id ? null : it.id))
                }}
                title={`${it.description}${defenseHint(it.effect)}`}
              >
                <span className="house-item-pill__ico" aria-hidden>
                  {it.icon}
                </span>
                <span className="house-item-pill__meta">
                  <span className="house-item-pill__name">{it.name}</span>
                  <span className="house-item-pill__cost">
                    {has
                      ? 'Owned'
                      : it.costMoney !== undefined
                        ? `$${it.costMoney.toLocaleString()}`
                        : `${it.costPower} pow`}
                  </span>
                </span>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function HouseItemIdleIcon({ icon }: { icon: string }) {
  const ref = useRef<HTMLSpanElement>(null)
  useEffect(() => {
    return startHouseItemIdle(ref.current)
  }, [icon])
  return (
    <span ref={ref} className="house-slot__idle">
      {icon}
    </span>
  )
}
