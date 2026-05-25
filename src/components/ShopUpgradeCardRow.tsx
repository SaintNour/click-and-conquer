import {
  useCallback,
  useRef,
  useState,
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
} from 'react'
import { playFailSfx } from '../audio/gameSfx'
import { animateShopCardPress } from '../animations'

export const SHOP_BULK_QTY = [1, 10, 100, 'max'] as const
export type ShopBulkQty = (typeof SHOP_BULK_QTY)[number]

type Props = {
  id: string
  cardRef: (el: HTMLLIElement | null) => void
  /** Row visually locked (chain not open yet). */
  lockedVisual: boolean
  /** Next-in-chain preview (not purchasable). */
  peek?: boolean
  /** Show ×1/×10/×100 and allow card purchase attempts. */
  showBulk: boolean
  selectedQty: ShopBulkQty
  onSelectQty: (q: ShopBulkQty) => void
  bulkTotal: (q: ShopBulkQty) => number
  money: number
  onPurchase: (qty: ShopBulkQty) => void
  title: string
  description: string
  level: number
  priceLineLabel: string
  lockMessages: ReactNode
  icon: ReactNode
  /** Base title/tooltip when locked or contextual. */
  hintTitle?: string
}

export function ShopUpgradeCardRow({
  id,
  cardRef,
  lockedVisual,
  peek = false,
  showBulk,
  selectedQty,
  onSelectQty,
  bulkTotal,
  money,
  onPurchase,
  title,
  description,
  level,
  priceLineLabel,
  lockMessages,
  icon,
  hintTitle,
}: Props) {
  const rowRef = useRef<HTMLLIElement | null>(null)
  const [hovered, setHovered] = useState(false)
  const canAffordSelection = showBulk && money >= bulkTotal(selectedQty)

  const setRefs = useCallback(
    (el: HTMLLIElement | null) => {
      rowRef.current = el
      cardRef(el)
    },
    [cardRef],
  )

  const handleCardActivate = useCallback(() => {
    if (!showBulk || lockedVisual) return
    const rowEl = rowRef.current
    if (!canAffordSelection) {
      queueMicrotask(() => playFailSfx())
      return
    }
    animateShopCardPress(rowEl)
    onPurchase(selectedQty)
  }, [showBulk, lockedVisual, canAffordSelection, onPurchase, selectedQty])

  const onCardClick = useCallback(
    (e: MouseEvent) => {
      if (!showBulk || lockedVisual) return
      e.preventDefault()
      handleCardActivate()
    },
    [showBulk, lockedVisual, handleCardActivate],
  )

  const onCardKeyDown = useCallback(
    (e: KeyboardEvent<HTMLLIElement>) => {
      if (!showBulk || lockedVisual) return
      if (e.key !== 'Enter' && e.key !== ' ') return
      e.preventDefault()
      handleCardActivate()
    },
    [showBulk, lockedVisual, handleCardActivate],
  )

  const interactive = showBulk && !lockedVisual
  const unaffordable = interactive && !canAffordSelection

  const needAmount = bulkTotal(selectedQty)
  const affordHint =
    interactive && !canAffordSelection
      ? `Need $${needAmount.toLocaleString()} for ${selectedQty === 'max' ? 'Max' : `×${selectedQty}`} (you have $${money.toLocaleString()})`
      : interactive
        ? `Buy ${selectedQty === 'max' ? 'Max' : `×${selectedQty}`} — $${needAmount.toLocaleString()} total (click card or adjust multiplier)`
        : undefined

  /** Avoid updating native title every tick; show price/afford details only on hover/focus. */
  const titleMerged = hovered
    ? [hintTitle, affordHint].filter(Boolean).join(' — ') || undefined
    : [hintTitle, interactive ? 'Hover for purchase totals' : undefined]
        .filter(Boolean)
        .join(' — ') || undefined

  const classNames = [
    'shop-card-row',
    peek ? 'shop-card-row--peek' : '',
    lockedVisual ? 'shop-card-row--locked' : '',
    interactive ? 'shop-card-row--interactive' : '',
    unaffordable ? 'shop-card-row--unaffordable' : '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <li
      ref={setRefs}
      data-shop-card={id}
      className={classNames}
      title={titleMerged}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => setHovered(true)}
      onBlur={() => setHovered(false)}
      tabIndex={interactive ? 0 : undefined}
      aria-label={
        interactive
          ? `${title}, level ${level}. ${canAffordSelection ? `Purchase ${selectedQty === 'max' ? 'max affordable' : `×${selectedQty}`} for ${needAmount} dollars` : 'Insufficient funds for selected quantity'}`
          : undefined
      }
      aria-disabled={interactive ? !canAffordSelection : undefined}
      onClick={onCardClick}
      onKeyDown={onCardKeyDown}
    >
      <div className="shop-card-row__icon" aria-hidden>
        {icon}
      </div>
      <div className="shop-card-row__main">
        <div className="shop-card-row__title">{title}</div>
        <div className="shop-card-row__purpose">{description}</div>
        <div className="shop-card-row__meta">Level {level}</div>
        {lockMessages}
      </div>
      <div className="shop-card-row__buyCol">
        <div className="shop-card-row__priceLine">{priceLineLabel}</div>
        {showBulk ? (
          <div className="shop-card-row__bulk" role="group" aria-label="Purchase quantity mode">
            {SHOP_BULK_QTY.map((q) => (
              <button
                key={q}
                type="button"
                className={`shop-card-row__bulkBtn${q === selectedQty ? ' shop-card-row__bulkBtn--active' : ''}${q === 'max' ? ' shop-card-row__bulkBtn--max' : ''}`}
                title={
                  q === 'max'
                    ? `Buy all levels you can afford ($${bulkTotal(q).toLocaleString()} total)`
                    : `Set purchase size to ×${q} ($${bulkTotal(q).toLocaleString()} total)`
                }
                onClick={(e) => {
                  e.stopPropagation()
                  onSelectQty(q)
                }}
              >
                {q === 'max' ? 'Max' : `×${q}`}
              </button>
            ))}
          </div>
        ) : null}
      </div>
    </li>
  )
}
