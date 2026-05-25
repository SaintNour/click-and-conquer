import { effectiveDateCost, effectiveGiftCost, effectiveMarriageCost } from '../game/lifeEngine'
import { houseTierAtLevel, MAX_HOUSE_LEVEL_INDEX } from '../data/lifeContent'
import type { GameState } from '../data/types'
import type { LifeSocialAction } from '../game/gameLogic'
import {
  familyPrestigeProgressMet,
  lifePanelShowsPrestige,
  soloPrestigeProgressMet,
} from '../game/lifeEngine'
import { TOOLTIPS } from '../data/tooltips'
import { GameTooltip } from './GameTooltip'
import { HousePanel } from './HousePanel'

type Props = {
  state: GameState
  onUpgradeHouse: () => void
  onSocial: (action: LifeSocialAction) => void
  onMarry: () => void
  onPrestigeChild: () => void
  onPrestigeSolo: () => void
  onBuyHouseItem: (itemId: string) => void
  onPlaceHouseItem: (slotKey: string, itemId: string | null) => void
  /** Optional: begin a timed partner co-op goal (bank cash under a heat cap). */
  onStartPartnerGoal?: () => void
  /** When true, HQ grid/shop is shown in a separate accordion; omit here. */
  omitHouse?: boolean
  /** Hide duplicate section title when inside an accordion. */
  embedded?: boolean
}

export function LifePanel({
  state,
  onUpgradeHouse,
  onSocial,
  onMarry,
  onPrestigeChild,
  onPrestigeSolo,
  onBuyHouseItem,
  onPlaceHouseItem,
  omitHouse = false,
  embedded = false,
  onStartPartnerGoal,
}: Props) {
  const tier = houseTierAtLevel(state.houseLevel)
  const nextTier =
    state.houseLevel < MAX_HOUSE_LEVEL_INDEX ? houseTierAtLevel(state.houseLevel + 1) : null
  const upgradeCost = nextTier?.upgradeCost ?? 0
  const canSocial = state.lifeSocialCooldownTicks <= 0
  const dateCost = effectiveDateCost(state)
  const giftCost = effectiveGiftCost(state)
  const marriageCost = effectiveMarriageCost(state)
  const canMarry =
    !state.married && state.hasPartner && state.affection >= 80 && state.money >= marriageCost

  const relationshipActive = state.relationshipUnlocked && (state.hasPartner || state.married)
  const showSocialRow = state.relationshipUnlocked && (state.hasPartner || state.married)
  const showStatBars = relationshipActive
  const showPropose = state.relationshipUnlocked && state.hasPartner && !state.married

  const showPrestige = lifePanelShowsPrestige(state)
  const canFamilyPrestige = familyPrestigeProgressMet(state)
  const canSoloPrestige = soloPrestigeProgressMet(state)

  return (
    <section
      className={`life-panel${embedded ? ' life-panel--embedded' : ''}`}
      aria-label="Life and home"
    >
      {embedded ? null : (
        <div className="life-panel__head">
          <span className="life-panel__title">
            <GameTooltip label="Life" tip={TOOLTIPS.life}>
              <span>Life</span>
            </GameTooltip>
          </span>
          <span className="life-panel__home">{tier.label}</span>
        </div>
      )}
      {state.houseLevel === 0 ? (
        <p className="life-panel__flavor">
          No roof, no lease—only the street and the math of surviving it.
        </p>
      ) : null}
      {nextTier ? (
        <button
          type="button"
          className="life-panel__btn life-panel__btn--wide"
          disabled={state.money < upgradeCost}
          onClick={onUpgradeHouse}
        >
          {nextTier.id === 'apartment'
            ? `Move into Apartment ($${upgradeCost.toLocaleString()})`
            : `Upgrade home → ${nextTier.label} ($${upgradeCost.toLocaleString()})`}
        </button>
      ) : (
        <p className="life-panel__note">Max home tier.</p>
      )}

      {!state.relationshipUnlocked ? (
        <p className="life-panel__alone">You are alone.</p>
      ) : (
        <>
          {state.hasPartner ? null : (
            <p className="life-panel__relationship-hint">
              Someone&apos;s on your radar—take them out or buy a gift when you&apos;re ready to
              make it real.
            </p>
          )}

          {showStatBars ? (
            <div className="life-panel__bars">
              <div className="life-panel__stat">
                <div className="life-panel__stat-head">
                  <GameTooltip label="Affection" tip={TOOLTIPS.affection}>
                    <span>Affection</span>
                  </GameTooltip>
                  <span className="life-panel__stat-pct">{Math.round(state.affection)}%</span>
                </div>
                <div
                  className="life-panel__stat-track"
                  role="meter"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={Math.round(state.affection)}
                  aria-label={`Affection ${Math.round(state.affection)} percent`}
                >
                  <div
                    className="life-panel__stat-fill life-panel__stat-fill--affection"
                    style={{ width: `${Math.min(100, Math.max(0, state.affection))}%` }}
                  />
                </div>
              </div>
              <div className="life-panel__stat">
                <div className="life-panel__stat-head">
                  <GameTooltip label="Loyalty" tip={TOOLTIPS.loyalty}>
                    <span>Loyalty</span>
                  </GameTooltip>
                  <span className="life-panel__stat-pct">{Math.round(state.loyalty)}%</span>
                </div>
                <div
                  className="life-panel__stat-track"
                  role="meter"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={Math.round(state.loyalty)}
                  aria-label={`Loyalty ${Math.round(state.loyalty)} percent`}
                >
                  <div
                    className="life-panel__stat-fill life-panel__stat-fill--loyalty"
                    style={{ width: `${Math.min(100, Math.max(0, state.loyalty))}%` }}
                  />
                </div>
              </div>
              <div className="life-panel__stat">
                <div className="life-panel__stat-head">
                  <GameTooltip label="Happiness" tip={TOOLTIPS.happiness}>
                    <span>Happiness</span>
                  </GameTooltip>
                  <span className="life-panel__stat-pct">{Math.round(state.happiness)}%</span>
                </div>
                <div
                  className="life-panel__stat-track"
                  role="meter"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={Math.round(state.happiness)}
                  aria-label={`Happiness ${Math.round(state.happiness)} percent`}
                >
                  <div
                    className="life-panel__stat-fill life-panel__stat-fill--happiness"
                    style={{ width: `${Math.min(100, Math.max(0, state.happiness))}%` }}
                  />
                </div>
              </div>
            </div>
          ) : null}

          {showStatBars && state.partnerGoal ? (
            <div className="life-panel__partner-goal">
              <p className="life-panel__partner-goal-title">Shared hustle goal</p>
              <p className="life-panel__partner-goal-body">
                Bank $
                {Math.max(
                  0,
                  Math.round(state.money - state.partnerGoal.baselineMoney),
                ).toLocaleString()}{' '}
                / ${state.partnerGoal.targetMoneyDelta.toLocaleString()} since the goal started.
                Keep heat at or below {state.partnerGoal.maxHeat}. Time left:{' '}
                {Math.max(0, state.partnerGoal.endTick - state.tickCount)}s.
              </p>
            </div>
          ) : null}
          {showStatBars && !state.partnerGoal && state.hasPartner && onStartPartnerGoal ? (
            <button
              type="button"
              className="life-panel__btn life-panel__btn--wide"
              onClick={onStartPartnerGoal}
            >
              Start a shared hustle goal
            </button>
          ) : null}

          {showSocialRow ? (
            <div className="life-panel__row life-panel__row--social">
              <button
                type="button"
                className="life-panel__btn life-panel__btn--grow"
                disabled={!canSocial || state.money < dateCost}
                onClick={() => onSocial('date')}
              >
                Date (${dateCost.toLocaleString()})
              </button>
              <button
                type="button"
                className="life-panel__btn life-panel__btn--grow"
                disabled={!canSocial || state.money < giftCost}
                onClick={() => onSocial('gift')}
              >
                Gift (${giftCost.toLocaleString()})
              </button>
            </div>
          ) : null}

          {showPropose ? (
            <button
              type="button"
              className="life-panel__btn life-panel__btn--wide"
              disabled={!canMarry}
              onClick={onMarry}
            >
              Propose marriage (${marriageCost.toLocaleString()})
            </button>
          ) : null}

          {state.married ? (
            <p className="life-panel__married">
              Married{state.partnerName ? ` · ${state.partnerName}` : ''}
            </p>
          ) : null}
        </>
      )}

      {omitHouse ? null : (
        <HousePanel state={state} onBuyItem={onBuyHouseItem} onPlace={onPlaceHouseItem} />
      )}

      {showPrestige ? (
        <div className="life-panel__prestige life-panel__legacy">
          <p className="life-panel__prestige-title" role="heading" aria-level={3}>
            <GameTooltip label="Prestige" tip={TOOLTIPS.prestige}>
              <span>Prestige</span>
            </GameTooltip>
          </p>
          <p className="life-panel__prestige-lede">
            Hand the operation to the next generation: reset most of this run for a{' '}
            <strong>permanent</strong> bonus. Your HQ tier and owned décor stay with you; street
            traction starts fresh.
          </p>

          {state.married ? (
            <>
              <p className="life-panel__prestige-label">Family Prestige</p>
              <p className="life-panel__prestige-desc">
                Strongest path: have a child, keep your meta bonuses, and come back sharper.
              </p>
              <button
                type="button"
                className="life-panel__btn life-panel__btn--legacy"
                disabled={!canFamilyPrestige}
                onClick={onPrestigeChild}
              >
                Family Prestige (have a child)
              </button>
              {!canFamilyPrestige ? (
                <p className="life-panel__prestige-gate">
                  Requires a real home (house tier or better), traction on the street, and time in
                  the run—grow your empire first.
                </p>
              ) : null}
            </>
          ) : null}

          {!state.married ? (
            <>
              <p className="life-panel__prestige-label">Solo Prestige</p>
              <p className="life-panel__prestige-desc">
                Weaker bonus than family prestige, but you can take it without a partner.
              </p>
              <button
                type="button"
                className="life-panel__btn life-panel__btn--legacy-muted"
                disabled={!canSoloPrestige}
                onClick={onPrestigeSolo}
              >
                Solo Prestige (reset alone)
              </button>
              {!canSoloPrestige ? (
                <p className="life-panel__prestige-gate">
                  Unlock when you&apos;ve held turf, built crews and fronts, or put real time into
                  the run—this is a milestone, not a shortcut.
                </p>
              ) : null}
            </>
          ) : null}

          <p className="life-panel__legacy-note life-panel__prestige-foot">
            Prestige runs: {state.lifePrestigeMarried} family · {state.lifePrestigeSolo} solo — each
            adds a little permanent income &amp; power for new runs.
          </p>
        </div>
      ) : null}
    </section>
  )
}
