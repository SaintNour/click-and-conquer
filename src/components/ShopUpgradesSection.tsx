import { useEffect, useMemo, useRef, useState } from 'react'
import {
  animateShopUpgradeCardEnter,
  animateShopUpgradeCardPurchaseExit,
} from '../animations/shopUpgradeFeedback'
import { shopUpgradeIcon } from '../data/shopUpgradeIcons'
import { SHOP_UPGRADES, shopUpgradeById, type ShopUpgradeDef } from '../data/shopUpgrades'
import type { GameState } from '../data/types'
import { sumBusinessLevels } from '../game/progressionMomentum'
import {
  canPurchaseShopUpgrade,
  isShopUpgradePurchased,
  isShopUpgradeUnlocked,
  scaledShopUpgradeCost,
} from '../game/shopUpgradeEngine'
import { TOOLTIPS } from '../data/tooltips'
import { unlockNarratorKey } from '../game/shopUpgradePresentation'
import { GameTooltip } from './GameTooltip'

type Props = {
  state: GameState
  onBuyShopUpgrade: (id: string) => void
  onNarratorKey: (key: string) => void
}

const EMPIRE_SHOP_VISIBLE_CAP = 6

const GLOBAL_SCOPE_LABEL: Record<string, string> = {
  clickMoney: 'Click cash',
  passiveMoney: 'Passive cash',
  clickPower: 'Click power',
  passivePower: 'Passive power',
  allMoney: 'All cash',
  allPower: 'All power',
}

function formatShortEffect(def: ShopUpgradeDef): string {
  const parts: string[] = []
  for (const e of def.effects) {
    if (e.kind === 'global') {
      parts.push(`${GLOBAL_SCOPE_LABEL[e.scope] ?? e.scope} ×${e.mult}`)
    } else if (e.kind === 'recruit') {
      parts.push(`${e.recruitId} ×${e.mult}`)
    } else if (e.kind === 'business') {
      parts.push(`${e.businessId} ×${e.mult}`)
    } else if (e.kind === 'synergy_power') {
      parts.push(`Synergy ${e.fromRecruit}→${e.toRecruit}`)
    } else if (e.kind === 'synergy_business_recruit_power') {
      parts.push(`Recruit power vs businesses (cap ×${e.capMult})`)
    }
  }
  return parts.join(' · ')
}

function cardClassName(def: ShopUpgradeDef): string {
  const base = 'empire-upgrade-card'
  const tier = `empire-upgrade-card--tier-${def.tier}`
  if (def.tier >= 5) return `${base} ${tier} empire-upgrade-card--apex`
  if (def.tier >= 4) return `${base} ${tier} empire-upgrade-card--elite`
  return `${base} ${tier}`
}

export function ShopUpgradesSection({ state, onBuyShopUpgrade, onNarratorKey }: Props) {
  const cardRefs = useRef<Map<string, HTMLButtonElement>>(new Map())
  const [purchaseLockId, setPurchaseLockId] = useState<string | null>(null)

  const recruitLevelsKey = JSON.stringify(state.recruitLevels)
  const businessLevelsKey = JSON.stringify(state.businessLevels)
  const territoriesKey = JSON.stringify(state.territoriesOwned)
  const purchasedKey = JSON.stringify(state.shopUpgradesPurchased)

  const availableOrdered = useMemo(
    () =>
      SHOP_UPGRADES.filter(
        (u) => isShopUpgradeUnlocked(state, u) && !isShopUpgradePurchased(state, u.id),
      ),
    [recruitLevelsKey, businessLevelsKey, territoriesKey, state.power, purchasedKey, state],
  )

  const visibleUpgrades = useMemo(
    () => availableOrdered.slice(0, EMPIRE_SHOP_VISIBLE_CAP),
    [availableOrdered],
  )

  const unlockedInit = useRef(false)
  const prevUnlockedIds = useRef<Set<string>>(new Set())

  useEffect(() => {
    const current = new Set(
      SHOP_UPGRADES.filter((u) => isShopUpgradeUnlocked(state, u)).map((u) => u.id),
    )
    if (!unlockedInit.current) {
      prevUnlockedIds.current = current
      unlockedInit.current = true
      return
    }
    for (const id of current) {
      if (!prevUnlockedIds.current.has(id)) {
        const def = shopUpgradeById(id)
        if (def && !isShopUpgradePurchased(state, id)) {
          onNarratorKey(unlockNarratorKey(def))
        }
      }
    }
    prevUnlockedIds.current = current
  }, [
    recruitLevelsKey,
    businessLevelsKey,
    territoriesKey,
    state.power,
    purchasedKey,
    onNarratorKey,
    state,
  ])

  const visibleKey = visibleUpgrades.map((u) => u.id).join('|')

  const enterInit = useRef(false)
  const prevVisibleIds = useRef<Set<string>>(new Set())

  useEffect(() => {
    const ids = visibleUpgrades.map((u) => u.id)
    const set = new Set(ids)
    if (!enterInit.current) {
      enterInit.current = true
      prevVisibleIds.current = set
      return
    }
    for (const id of ids) {
      if (!prevVisibleIds.current.has(id)) {
        requestAnimationFrame(() => {
          animateShopUpgradeCardEnter(cardRefs.current.get(id) ?? null)
        })
      }
    }
    prevVisibleIds.current = set
  }, [visibleKey, visibleUpgrades])

  const milestoneInit = useRef(false)
  const firedMilestones = useRef<Set<string>>(new Set())

  useEffect(() => {
    const b = sumBusinessLevels(state)
    const run = state.recruitLevels.runner ?? 0
    const p = state.power

    if (!milestoneInit.current) {
      milestoneInit.current = true
      if (b >= 18) firedMilestones.current.add('biz18')
      if (b >= 35) firedMilestones.current.add('biz35')
      if (run >= 8) firedMilestones.current.add('run8')
      if (run >= 20) firedMilestones.current.add('run20')
      if (p >= 550) firedMilestones.current.add('pow550')
      if (p >= 1800) firedMilestones.current.add('pow1800')
      if (p >= 4200) firedMilestones.current.add('pow4200')
      return
    }

    const mark = (key: string, id: string) => {
      if (firedMilestones.current.has(id)) return
      firedMilestones.current.add(id)
      onNarratorKey(key)
    }
    if (b >= 18) mark('progress_business_pulse', 'biz18')
    if (b >= 35) mark('progress_business_surge', 'biz35')
    if (run >= 8) mark('progress_runner_muscle', 'run8')
    if (run >= 20) mark('progress_runner_flood', 'run20')
    if (p >= 550) mark('progress_power_climb', 'pow550')
    if (p >= 1800) mark('progress_power_break', 'pow1800')
    if (p >= 4200) mark('progress_momentum_shift', 'pow4200')
  }, [
    recruitLevelsKey,
    businessLevelsKey,
    territoriesKey,
    state.power,
    state.recruitLevels.runner,
    onNarratorKey,
    state,
  ])

  return (
    <>
      <h2 className="upgrade-panel__heading">
        <GameTooltip label="Empire upgrades" tip={TOOLTIPS.empireUpgrades}>
          <span>Empire upgrades</span>
        </GameTooltip>
      </h2>
      <div className="empire-upgrades">
        {availableOrdered.length === 0 ? (
          <p className="empire-upgrades__empty">No upgrades available yet</p>
        ) : (
          <>
            <div className="empire-upgrades__grid empire-upgrades__grid--capped">
              {visibleUpgrades.map((u) => {
                const affordable = canPurchaseShopUpgrade(state, u.id)
                const price = scaledShopUpgradeCost(u)
                const effectLine = formatShortEffect(u)
                const hint = `${u.description}\n\n${effectLine}\nCost: $${price.toLocaleString()}`
                const badge = u.tier >= 4 ? (u.tier >= 5 ? 'Apex' : 'Spike') : null
                const icon = shopUpgradeIcon(u.id)

                return (
                  <button
                    key={u.id}
                    type="button"
                    className={cardClassName(u)}
                    title={hint}
                    disabled={!affordable || purchaseLockId === u.id}
                    ref={(el) => {
                      if (el) cardRefs.current.set(u.id, el)
                      else cardRefs.current.delete(u.id)
                    }}
                    onClick={() => {
                      if (purchaseLockId) return
                      if (!canPurchaseShopUpgrade(state, u.id)) return
                      const el = cardRefs.current.get(u.id) ?? null
                      setPurchaseLockId(u.id)
                      animateShopUpgradeCardPurchaseExit(el, u, u.name, () => {
                        onBuyShopUpgrade(u.id)
                        setPurchaseLockId(null)
                      })
                    }}
                  >
                    <span className="empire-upgrade-card__icon" aria-hidden>
                      {icon}
                    </span>
                    {badge ? (
                      <span
                        className={`empire-upgrade-card__badge empire-upgrade-card__badge--tier-${u.tier}`}
                      >
                        {badge}
                      </span>
                    ) : null}
                    <span className="empire-upgrade-card__name">{u.name}</span>
                    <span className="empire-upgrade-card__effect">{effectLine}</span>
                    <span className="empire-upgrade-card__price">${price.toLocaleString()}</span>
                  </button>
                )
              })}
            </div>
            {availableOrdered.length > EMPIRE_SHOP_VISIBLE_CAP ? (
              <p className="empire-upgrades__queue">
                +{availableOrdered.length - EMPIRE_SHOP_VISIBLE_CAP} more in queue — buy one above
                to reveal the next.
              </p>
            ) : null}
          </>
        )}
      </div>
    </>
  )
}
