import { useLayoutEffect, useRef, useState } from 'react'
import { animateBusinessUnlockReveal } from '../animations'
import { businessArt, isEmojiArt, recruitArt } from '../data/shopArt'
import { BUSINESSES } from '../data/businesses'
import { RECRUITS } from '../data/recruits'
import type { GameState } from '../data/types'
import { businessUnlockRequirementLabel, isBusinessUnlocked } from '../game/businessUnlocks'
import { maxAffordableBulk, upgradeCost, upgradeCostBulk } from '../game/pricing'
import {
  businessLockHint,
  businessPeekHiddenIndex,
  businessPeekRequirementLine,
  businessShopMode,
  recruitLockHint,
  recruitPeekHiddenIndex,
  recruitPeekRequirementLine,
  recruitShopMode,
} from '../game/shopVisibility'
import { TOOLTIPS } from '../data/tooltips'
import { ShopUpgradeCardRow, type ShopBulkQty } from './ShopUpgradeCardRow'
import { ShopUpgradesSection } from './ShopUpgradesSection'
import { GameTooltip } from './GameTooltip'

type Props = {
  state: GameState
  onBuyRecruit: (id: string, qty?: number) => void
  onBuyBusiness: (id: string, qty?: number) => void
  onBuyShopUpgrade: (id: string) => void
  onNarratorKey: (key: string) => void
}

export function UpgradePanel({
  state,
  onBuyRecruit,
  onBuyBusiness,
  onBuyShopUpgrade,
  onNarratorKey,
}: Props) {
  const recruitRowRefs = useRef<Map<string, HTMLLIElement>>(new Map())
  const businessRowRefs = useRef<Map<string, HTMLLIElement>>(new Map())
  const lastBizUnlockNonceRef = useRef(0)
  const [bulkQty, setBulkQty] = useState<ShopBulkQty>(1)

  useLayoutEffect(() => {
    const n = state.businessUnlockHighlightNonce
    if (n === 0) {
      lastBizUnlockNonceRef.current = 0
      return
    }
    if (n <= lastBizUnlockNonceRef.current) return
    lastBizUnlockNonceRef.current = n
    const ids = state.businessUnlockHighlightIds
    if (!ids.length) return
    requestAnimationFrame(() => {
      for (const id of ids) {
        animateBusinessUnlockReveal(businessRowRefs.current.get(id) ?? null)
      }
    })
  }, [state.businessUnlockHighlightNonce, state.businessUnlockHighlightIds])

  return (
    <aside className="upgrade-panel upgrade-panel--v2 intro-stagger">
      <ShopUpgradesSection
        state={state}
        onBuyShopUpgrade={onBuyShopUpgrade}
        onNarratorKey={onNarratorKey}
      />

      <h2 className="upgrade-panel__heading">
        <GameTooltip label="Crew" tip={TOOLTIPS.crew}>
          <span>Crew</span>
        </GameTooltip>
      </h2>
      <ul className="upgrade-list upgrade-list--cards">
        {RECRUITS.map((r, idx) => {
          const mode = recruitShopMode(state, idx)
          if (mode === 'hidden') return null
          const lv = state.recruitLevels[r.id] ?? 0
          const hint = recruitLockHint(state, idx)
          const art = recruitArt(r.id)
          const open = mode === 'open'
          const bulkTotal = (q: ShopBulkQty) =>
            q === 'max'
              ? (() => {
                  const mq = maxAffordableBulk(r, lv, state.money)
                  return mq <= 0 ? Number.POSITIVE_INFINITY : upgradeCostBulk(r, lv, mq)
                })()
              : upgradeCostBulk(r, lv, q)

          const icon = isEmojiArt(art) ? (
            <span className="shop-card-row__emoji">{art}</span>
          ) : (
            <img src={art} alt="" className="shop-card-row__img" />
          )

          return (
            <ShopUpgradeCardRow
              key={r.id}
              id={`recruit-${r.id}`}
              cardRef={(el) => {
                if (el) recruitRowRefs.current.set(r.id, el)
                else recruitRowRefs.current.delete(r.id)
              }}
              lockedVisual={!open}
              showBulk={open}
              selectedQty={bulkQty}
              onSelectQty={setBulkQty}
              bulkTotal={bulkTotal}
              money={state.money}
              onPurchase={(qty) => {
                const n = qty === 'max' ? maxAffordableBulk(r, lv, state.money) : qty
                if (n > 0) onBuyRecruit(r.id, n)
              }}
              title={r.name}
              description={r.description}
              level={lv}
              priceLineLabel={`$${upgradeCost(r, lv).toLocaleString()}`}
              hintTitle={hint ?? undefined}
              lockMessages={
                <>{!open && hint ? <div className="shop-card-row__lock-msg">{hint}</div> : null}</>
              }
              icon={icon}
            />
          )
        })}
      </ul>
      {(() => {
        const peekIdx = recruitPeekHiddenIndex(state)
        if (peekIdx === null) return null
        const r = RECRUITS[peekIdx]!
        const hint = recruitPeekRequirementLine(state, peekIdx)
        const art = recruitArt(r.id)
        const icon = isEmojiArt(art) ? (
          <span className="shop-card-row__emoji">{art}</span>
        ) : (
          <img src={art} alt="" className="shop-card-row__img" />
        )
        return (
          <ShopUpgradeCardRow
            key={`recruit-peek-${r.id}`}
            id={`recruit-peek-${r.id}`}
            cardRef={() => {}}
            peek
            lockedVisual
            showBulk={false}
            selectedQty={bulkQty}
            onSelectQty={setBulkQty}
            bulkTotal={() => 0}
            money={state.money}
            onPurchase={() => {}}
            title={r.name}
            description={r.description}
            level={0}
            priceLineLabel="—"
            hintTitle="Locked — next in crew chain"
            lockMessages={<div className="shop-card-row__lock-msg">{hint}</div>}
            icon={icon}
          />
        )
      })()}

      <h2 className="upgrade-panel__heading">
        <GameTooltip label="Businesses" tip={TOOLTIPS.businesses}>
          <span>Businesses</span>
        </GameTooltip>
      </h2>
      <ul className="upgrade-list upgrade-list--cards">
        {BUSINESSES.map((b, idx) => {
          const mode = businessShopMode(state, idx)
          if (mode === 'hidden') return null
          const lv = state.businessLevels[b.id] ?? 0
          const unlocked = isBusinessUnlocked(state, b.id)
          const hint = businessLockHint(state, idx)
          const reqLabel = businessUnlockRequirementLabel(b)
          const art = businessArt(b.id)
          const open = mode === 'open'

          const icon = isEmojiArt(art) ? (
            <span className="shop-card-row__emoji">{art}</span>
          ) : (
            <img src={art} alt="" className="shop-card-row__img" />
          )

          const bulkTotal = (q: ShopBulkQty) =>
            q === 'max'
              ? (() => {
                  const mq = maxAffordableBulk(b, lv, state.money)
                  return mq <= 0 ? Number.POSITIVE_INFINITY : upgradeCostBulk(b, lv, mq)
                })()
              : upgradeCostBulk(b, lv, q)

          return (
            <ShopUpgradeCardRow
              key={b.id}
              id={`business-${b.id}`}
              cardRef={(el) => {
                if (el) businessRowRefs.current.set(b.id, el)
                else businessRowRefs.current.delete(b.id)
              }}
              lockedVisual={!open}
              showBulk={open && unlocked}
              selectedQty={bulkQty}
              onSelectQty={setBulkQty}
              bulkTotal={bulkTotal}
              money={state.money}
              onPurchase={(qty) => {
                const n = qty === 'max' ? maxAffordableBulk(b, lv, state.money) : qty
                if (n > 0) onBuyBusiness(b.id, n)
              }}
              title={b.name}
              description={b.description}
              level={lv}
              priceLineLabel={`$${upgradeCost(b, lv).toLocaleString()}`}
              hintTitle={hint ?? reqLabel ?? undefined}
              lockMessages={
                <>
                  {!open && hint ? <div className="shop-card-row__lock-msg">{hint}</div> : null}
                  {open && !unlocked && reqLabel ? (
                    <div className="shop-card-row__lock-msg">{reqLabel}</div>
                  ) : null}
                </>
              }
              icon={icon}
            />
          )
        })}
      </ul>
      {(() => {
        const peekIdx = businessPeekHiddenIndex(state)
        if (peekIdx === null) return null
        const b = BUSINESSES[peekIdx]!
        const hint = businessPeekRequirementLine(state, peekIdx)
        const art = businessArt(b.id)
        const icon = isEmojiArt(art) ? (
          <span className="shop-card-row__emoji">{art}</span>
        ) : (
          <img src={art} alt="" className="shop-card-row__img" />
        )
        return (
          <ShopUpgradeCardRow
            key={`business-peek-${b.id}`}
            id={`business-peek-${b.id}`}
            cardRef={() => {}}
            peek
            lockedVisual
            showBulk={false}
            selectedQty={bulkQty}
            onSelectQty={setBulkQty}
            bulkTotal={() => 0}
            money={state.money}
            onPurchase={() => {}}
            title={b.name}
            description={b.description}
            level={0}
            priceLineLabel="—"
            hintTitle="Locked — next business"
            lockMessages={<div className="shop-card-row__lock-msg">{hint}</div>}
            icon={icon}
          />
        )
      })()}
    </aside>
  )
}
