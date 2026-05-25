import { businessById } from '../data/businesses'
import { getStreetEventDef } from '../data/eventRegistry'
import { houseItemById } from '../data/houseItems'
import { houseTierAtLevel } from '../data/lifeContent'
import { recruitById } from '../data/recruits'
import { RIVAL_EVENTS } from '../data/rivalEvents'
import { shopUpgradeById } from '../data/shopUpgrades'
import { getTerritoryDefinition } from '../data/territories'
import type {
  CharacterLook,
  CharacterThemeId,
  EventChoiceDef,
  EventOutcomeBundle,
  GameState,
} from '../data/types'
import {
  DANGER_COOLDOWN_TICKS,
  DANGER_ROLL_CHANCE,
  EVENT_COOLDOWN_MAX,
  EVENT_COOLDOWN_MIN,
  EVENT_COOLDOWN_MID_MAX,
  EVENT_COOLDOWN_MID_MIN,
  MIDGAME_EVENT_TICK,
  MIDGAME_TERRITORIES,
} from './constants'
import {
  AGE_PROGRESS_EVENT_RESOLVED,
  AGE_PROGRESS_PURCHASE,
  AGE_PROGRESS_RIVAL_ENCOUNTER,
  AGE_PROGRESS_TERRITORY,
  ageProgressFromClick,
  applyAgeProgress,
  passiveAgeProgressPerTick,
} from './ageEngine'
import {
  autoHustleClicksPerSecond,
  clickMoneyAmount,
  clickPowerAmount,
  passiveMoneyPerSecond,
  passivePowerPerSecond,
  computePlayerTitle,
  clampPassiveScale,
  territoriesOwnedCount,
} from './compute'
import {
  patchAchievementStatsEventResolved,
  patchAchievementStatsOnClick,
  patchAchievementStatsOnPurchase,
  patchAchievementStatsOnTick,
  patchAchievementStatsTerritoryFail,
  processAchievements,
} from './achievementsEngine'
import { DANGER_NARRATOR_KEYS, resolveNarratorLine, setNarratorFromKey } from './narrator'
import {
  lifeEventCooldownSecondsForState,
  lifeEventMinorStackDeferSeconds,
  TERRITORY_FAIL_POWER_FRAC,
  TERRITORY_FAIL_POWER_MIN,
} from './balanceConfig'
import { businessesUnlockedByTerritory, isBusinessUnlocked } from './businessUnlocks'
import { upgradeCostBulk } from './pricing'
import {
  isShopUpgradePurchased,
  isShopUpgradeUnlocked,
  scaledShopUpgradeCost,
} from './shopUpgradeEngine'
import { shopPurchaseNarratorKey } from './shopUpgradePresentation'
import {
  applyLifeSocialAction,
  applyLifeStatDeltasFromChoice,
  performLifePrestigeChild,
  performLifePrestigeSolo,
  randomPartnerNameForMeet,
  tickLifeSocialCooldown,
  tickRelationshipNeglect,
  tryMarry,
  tryUpgradeHouse,
  type LifeSocialAction,
} from './lifeEngine'
import {
  applyRivalOutcomeEffects,
  eventOutcomeBannerVariant,
  interpolateRivalText,
} from './rivalEngine'
import { pickStreetEvent } from './eventSelection'
import {
  adjustedHomeDefenseChance,
  describeHomeDefenseHighlight,
  softenHomeFailureBundle,
} from './homeDefenseEngine'
import { pruneHousePlacementsToGrid } from './houseCustomizationEngine'
import { pickLifeEventOrForced } from './lifeEventSelection'
import {
  isBlockingLifeEventId,
  isBlockingStreetEventId,
  isGameplayModalBlocking,
  maybeRestorePausedEmbeddedEvents,
  stashActiveMinorLifeForBlocking,
} from './lifeEventFlow'
import {
  addHeatFromClickGains,
  addHeatFromTerritoryCapture,
  openRevengeEncounter,
  resolveRivalEncounter as applyRivalEncounterResolution,
  tickRivalsAndHeat,
  type RivalChoiceId,
} from './rivalsEngine'
import {
  beginSmallTerritoryWar,
  resolveWarStrike,
  tickRivalWar,
  tryRivalSurrender,
  tryRivalTruce,
  tryRivalWarAttack,
  tryRivalWarSurge,
} from './rivalWarEngine'
import { effectiveTerritoryPowerRequired } from './tierEngine'
import { maybeRollStreetLuck } from './streetLuckEngine'
import {
  GANG_DEMAND_EVENT_ID,
  GANG_RUMOR_EVENT_ID,
  applyGangDemandAftermath,
  applyGangRumorAftermath,
  beginEliminationWar,
  beginGangWarArc,
} from './gangArcEngine'
import { MEET_GIRLFRIEND_LIFE_EVENT_ID } from '../data/lifeEvents'
import { effectiveLifeMoneyCost, effectiveLifePowerCost } from './lifeChoiceCosts'
import { attachOutcomeBanner } from './outcomeMeta'
import { tickPartnerGoal } from './partnerGoalEngine'

export type { RivalChoiceId }
export type { LifeSocialAction }

/** Life choice: lock war UI + strikes to one crew (no random hand-offs to another gang). */
function applyLifeGangWarChoice(state: GameState): GameState {
  return beginGangWarArc(state, null)
}

function syncPlayerTitle(state: GameState, announce: boolean): GameState {
  const nextTitle = computePlayerTitle(state)
  if (nextTitle === state.title) return state
  let next: GameState = {
    ...state,
    title: nextTitle,
    titlePulseNonce: state.titlePulseNonce + 1,
  }
  if (announce) {
    next = setNarratorFromKey(next, 'title_promotion')
  }
  return next
}

function bumpAvatarReaction(
  state: GameState,
  kind: NonNullable<GameState['avatarReactionKind']>,
): GameState {
  return {
    ...state,
    avatarReactionNonce: state.avatarReactionNonce + 1,
    avatarReactionKind: kind,
  }
}

function bumpAvatarReactionFromOutcomeVariant(
  state: GameState,
  variant: NonNullable<GameState['eventOutcomeBanner']>['variant'],
): GameState {
  if (
    variant === 'success' ||
    variant === 'rival-success' ||
    variant === 'revenge-success' ||
    variant === 'home-success' ||
    variant === 'home-partial'
  ) {
    return bumpAvatarReaction(state, 'success')
  }
  if (
    variant === 'fail' ||
    variant === 'rival-fail' ||
    variant === 'revenge-fail' ||
    variant === 'home-fail'
  ) {
    return bumpAvatarReaction(state, 'fail')
  }
  return state
}

function randomEventCooldown(state: GameState): number {
  const tick = state.tickCount
  const terr = territoriesOwnedCount(state)
  const midPace = tick >= MIDGAME_EVENT_TICK && terr >= MIDGAME_TERRITORIES
  const min = midPace ? EVENT_COOLDOWN_MID_MIN : EVENT_COOLDOWN_MIN
  const max = midPace ? EVENT_COOLDOWN_MID_MAX : EVENT_COOLDOWN_MAX
  return Math.floor(Math.random() * (max - min + 1)) + min
}

export function applyTick(state: GameState): GameState {
  const tickPartnerGoalSnapshot: GameState = { ...state }
  // Empire scale no longer drifts up every tick (that rewarded idle time alone). Permanent scale comes from
  // progression + event/rival modifiers — see `empireMultiplierSources` and `state.passiveScale`.
  let next: GameState = {
    ...state,
    money: state.money + passiveMoneyPerSecond(state),
    power: state.power + passivePowerPerSecond(state),
    tickCount: state.tickCount + 1,
  }

  const auto = autoHustleClicksPerSecond(state)
  if (auto > 0) {
    const gainM = clickMoneyAmount(state) * auto
    const gainP = clickPowerAmount(state) * auto
    // Heat from hustle-shaped gains is manual-only (anti–auto-clicker spice). Auto-hustle still pays out.
    next = { ...next, money: next.money + gainM, power: next.power + gainP }
  }

  next = tickLifeSocialCooldown(next)
  next = tickRelationshipNeglect(next)
  next = tickPartnerGoal(tickPartnerGoalSnapshot, next)

  if (!isGameplayModalBlocking(next)) {
    next = {
      ...next,
      secondsUntilEvent: next.secondsUntilEvent - 1,
      secondsUntilLifeEvent: next.secondsUntilLifeEvent - 1,
    }
    if (next.secondsUntilEvent <= 0) {
      const { event: ev, rivalContext } = pickStreetEvent(next)
      const embeddedSlotBusy =
        (next.pendingLifeEventId != null && !isBlockingLifeEventId(next.pendingLifeEventId)) ||
        next.pendingMinorStreetEventId != null

      if (ev.eventKind === 'rival') {
        const afterStash = stashActiveMinorLifeForBlocking(next)
        next = {
          ...afterStash,
          pendingEventId: ev.id,
          pendingRivalEventContext: rivalContext,
          secondsUntilEvent: randomEventCooldown(next),
          rivalStoryEventNonce: rivalContext
            ? next.rivalStoryEventNonce + 1
            : next.rivalStoryEventNonce,
          homeThreatPulseNonce: ev.targetsHome
            ? next.homeThreatPulseNonce + 1
            : next.homeThreatPulseNonce,
        }
      } else if (embeddedSlotBusy) {
        next = { ...next, secondsUntilEvent: lifeEventMinorStackDeferSeconds() }
      } else {
        next = {
          ...next,
          pendingMinorStreetEventId: ev.id,
          pendingRivalEventContext: rivalContext,
          secondsUntilEvent: randomEventCooldown(next),
          rivalStoryEventNonce: rivalContext
            ? next.rivalStoryEventNonce + 1
            : next.rivalStoryEventNonce,
          homeThreatPulseNonce: ev.targetsHome
            ? next.homeThreatPulseNonce + 1
            : next.homeThreatPulseNonce,
        }
      }
    } else if (next.secondsUntilLifeEvent <= 0) {
      const { def: ev, clearForced } = pickLifeEventOrForced(next)
      if (clearForced) {
        next = { ...next, lifeEventForcedId: null }
      }
      const incomingBlocking = isBlockingLifeEventId(ev.id)
      let lifeTimer = lifeEventCooldownSecondsForState(next.tickCount, territoriesOwnedCount(next))

      if (next.pendingLifeEventId && isBlockingLifeEventId(next.pendingLifeEventId)) {
        next = { ...next, secondsUntilLifeEvent: lifeEventMinorStackDeferSeconds() }
      } else if (incomingBlocking) {
        const stashed = stashActiveMinorLifeForBlocking(next)
        next = {
          ...stashed,
          pendingLifeEventId: ev.id,
          secondsUntilLifeEvent: lifeTimer,
        }
      } else {
        const embeddedSlotBusy =
          (next.pendingLifeEventId != null && !isBlockingLifeEventId(next.pendingLifeEventId)) ||
          next.pendingMinorStreetEventId != null
        let pendingLife = next.pendingLifeEventId
        const paused = next.pausedMinorLifeEventId
        if (embeddedSlotBusy) {
          lifeTimer = lifeEventMinorStackDeferSeconds()
        } else {
          pendingLife = ev.id
        }
        next = {
          ...next,
          pausedMinorLifeEventId: paused,
          pendingLifeEventId: pendingLife,
          secondsUntilLifeEvent: lifeTimer,
        }
      }
    }
  }

  const dangerCooldown = Math.max(0, next.dangerCooldownRemaining - 1)
  next = { ...next, dangerCooldownRemaining: dangerCooldown }

  if (!isGameplayModalBlocking(next) && dangerCooldown === 0) {
    if (Math.random() < DANGER_ROLL_CHANCE) {
      const key = DANGER_NARRATOR_KEYS[Math.floor(Math.random() * DANGER_NARRATOR_KEYS.length)]
      next = setNarratorFromKey(
        {
          ...next,
          dangerPulseNonce: next.dangerPulseNonce + 1,
          dangerCooldownRemaining: DANGER_COOLDOWN_TICKS,
        },
        key,
      )
    }
  }

  next = tickRivalsAndHeat(next)
  next = tickRivalWar(next)
  next = patchAchievementStatsOnTick(next)
  next = applyAgeProgress(next, passiveAgeProgressPerTick(next))
  next = syncPlayerTitle(next, false)
  next = maybeRollStreetLuck(next)
  return processAchievements(next)
}

export function applyClick(state: GameState): GameState {
  const gainM = clickMoneyAmount(state)
  const gainP = clickPowerAmount(state)
  const patched = patchAchievementStatsOnClick(state)
  let next = addHeatFromClickGains(
    {
      ...patched,
      money: state.money + gainM,
      power: state.power + gainP,
    },
    gainM,
    gainP,
  )
  next = processAchievements(next)
  next = syncPlayerTitle(next, true)
  next = { ...next, lastManualHustleTick: next.tickCount }
  return applyAgeProgress(next, ageProgressFromClick(gainM, gainP))
}

export function tryBuyRecruit(state: GameState, recruitId: string, qty: number = 1): GameState {
  if (qty < 1) return state
  const def = recruitById(recruitId)
  if (!def) return state
  const lv = state.recruitLevels[recruitId] ?? 0
  const cost = upgradeCostBulk(def, lv, qty)
  if (state.money < cost) return state
  let next = setNarratorFromKey(
    patchAchievementStatsOnPurchase({
      ...state,
      money: state.money - cost,
      recruitLevels: { ...state.recruitLevels, [recruitId]: lv + qty },
    }),
    'buy_recruit',
  )
  next = processAchievements(next)
  return applyAgeProgress(next, AGE_PROGRESS_PURCHASE, { skipNarrator: true })
}

export function tryBuyShopUpgrade(state: GameState, upgradeId: string): GameState {
  const def = shopUpgradeById(upgradeId)
  if (!def || isShopUpgradePurchased(state, upgradeId)) return state
  if (!isShopUpgradeUnlocked(state, def)) return state
  const price = scaledShopUpgradeCost(def)
  if (state.money < price) return state
  let next = setNarratorFromKey(
    patchAchievementStatsOnPurchase({
      ...state,
      money: state.money - price,
      shopUpgradesPurchased: { ...state.shopUpgradesPurchased, [upgradeId]: true },
    }),
    shopPurchaseNarratorKey(def),
  )
  next = processAchievements(next)
  return applyAgeProgress(next, AGE_PROGRESS_PURCHASE, { skipNarrator: true })
}

export function tryBuyBusiness(state: GameState, businessId: string, qty: number = 1): GameState {
  if (qty < 1) return state
  const def = businessById(businessId)
  if (!def) return state
  if (!isBusinessUnlocked(state, businessId)) return state
  const lv = state.businessLevels[businessId] ?? 0
  const cost = upgradeCostBulk(def, lv, qty)
  if (state.money < cost) return state
  let next = setNarratorFromKey(
    patchAchievementStatsOnPurchase({
      ...state,
      money: state.money - cost,
      businessLevels: { ...state.businessLevels, [businessId]: lv + qty },
    }),
    'buy_business',
  )
  next = processAchievements(next)
  return applyAgeProgress(next, AGE_PROGRESS_PURCHASE, { skipNarrator: true })
}

export function tryTakeTerritory(state: GameState, territoryId: string): GameState {
  const t = getTerritoryDefinition(territoryId)
  if (!t || state.territoriesOwned[territoryId]) return state
  // Block while any war is already running.
  if (state.gangWarRivalId) return state
  if (isGameplayModalBlocking(state)) return state

  const required = effectiveTerritoryPowerRequired(state, t)
  if (state.power < required) {
    const failPow = Math.max(
      TERRITORY_FAIL_POWER_MIN,
      Math.floor(state.power * TERRITORY_FAIL_POWER_FRAC),
    )
    let fail = setNarratorFromKey(
      {
        ...state,
        power: Math.max(0, state.power - failPow),
      },
      'territory_fail',
    )
    fail = patchAchievementStatsTerritoryFail(fail)
    return processAchievements(fail)
  }

  // RIVAL-OWNED → spend the power entry fee + open a SMALL war.
  const ownerRivalId = state.territoryOwner?.[territoryId] ?? null
  if (ownerRivalId && state.rivals[ownerRivalId]?.alive !== false) {
    const afterFee: GameState = {
      ...state,
      power: state.power - required,
    }
    const started = beginSmallTerritoryWar(afterFee, ownerRivalId, territoryId)
    const r = started.rivals[ownerRivalId]!
    const banner = {
      title: `Move on ${r.name}`,
      detail: `You committed ${required.toLocaleString()}⚡ to take ${t.name}. The line is open — break their HP to flip the corner.`,
      variant: 'rival-success' as const,
    }
    return processAchievements(
      setNarratorFromKey({ ...started, eventOutcomeBanner: banner }, 'rival_war_territory_open'),
    )
  }

  // UNCLAIMED → original instant-capture path.
  const territoriesOwned = { ...state.territoriesOwned, [territoryId]: true }
  let won: GameState = {
    ...state,
    money: state.money + t.rewardMoney,
    territoriesOwned,
  }
  won = syncPlayerTitle(won, false)
  const bizUnlockedHere = businessesUnlockedByTerritory(territoryId)
  if (bizUnlockedHere.length > 0) {
    const names = bizUnlockedHere.map((b) => b.name).join(' · ')
    const baseLine = resolveNarratorLine('territory_success', won)
    won = {
      ...won,
      narratorLine: `${baseLine} New ventures on the books: ${names}.`,
      narratorEventKey: 'territory_unlock_business',
      businessUnlockHighlightNonce: won.businessUnlockHighlightNonce + 1,
      businessUnlockHighlightIds: bizUnlockedHere.map((b) => b.id),
    }
  } else {
    won = setNarratorFromKey(won, 'territory_success')
  }
  won = addHeatFromTerritoryCapture(won)
  won = processAchievements(won)
  const firstFlag = !state.territoryFirstCaptureSeen?.[territoryId]
  if (firstFlag) {
    won = {
      ...won,
      territoryFirstCaptureSeen: {
        ...(state.territoryFirstCaptureSeen ?? {}),
        [territoryId]: true,
      },
    }
    won = attachOutcomeBanner(state, won, {
      title: `First stake: ${t.name}`,
      detail: resolveNarratorLine('territory_first_claim', won),
      variant: 'success',
    })
  }
  return applyAgeProgress(won, AGE_PROGRESS_TERRITORY, { skipNarrator: true })
}

function mergeRivalId(
  bundle: EventOutcomeBundle,
  contextRivalId: string | null,
): EventOutcomeBundle {
  if (!contextRivalId) return bundle
  return { ...bundle, rivalFactionId: bundle.rivalFactionId ?? contextRivalId }
}

function isRivalEventId(eventId: string): boolean {
  return RIVAL_EVENTS.some((e) => e.id === eventId)
}

function applyEconomicOutcome(state: GameState, bundle: EventOutcomeBundle): GameState {
  let next = state
  if (bundle.moneyDelta !== undefined) {
    next = { ...next, money: Math.max(0, next.money + bundle.moneyDelta) }
  }
  if (bundle.powerDelta !== undefined) {
    next = { ...next, power: Math.max(0, next.power + bundle.powerDelta) }
  }
  if (bundle.passiveBonusDelta !== undefined) {
    next = {
      ...next,
      passiveScale: clampPassiveScale(next.passiveScale + bundle.passiveBonusDelta),
    }
  }
  return next
}

function clampLifeStat(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)))
}

function applyLifeOutcomeFields(state: GameState, bundle: EventOutcomeBundle): GameState {
  let next = state
  if (bundle.affectionDelta !== undefined) {
    next = { ...next, affection: clampLifeStat(next.affection + bundle.affectionDelta) }
  }
  if (bundle.loyaltyDelta !== undefined) {
    next = { ...next, loyalty: clampLifeStat(next.loyalty + bundle.loyaltyDelta) }
  }
  if (bundle.happinessDelta !== undefined) {
    next = { ...next, happiness: clampLifeStat(next.happiness + bundle.happinessDelta) }
  }
  if (bundle.relationshipPathUnlock) {
    next = { ...next, relationshipUnlocked: true }
  }
  return next
}

function deterministicRivalVariant(
  choice: EventChoiceDef,
): 'rival-success' | 'rival-fail' | 'neutral' {
  const md = choice.moneyDelta
  const pd = choice.powerDelta
  if (md !== undefined && md < 0) return 'rival-fail'
  if (pd !== undefined && pd < 0) return 'rival-fail'
  if (md !== undefined && md > 0) return 'rival-success'
  return 'neutral'
}

export function applyEventChoice(
  state: GameState,
  eventId: string,
  choice: EventChoiceDef,
): GameState {
  const isLife = state.pendingLifeEventId === eventId
  const isBlockingStreet = state.pendingEventId === eventId && isBlockingStreetEventId(eventId)
  const isMinorStreet = state.pendingMinorStreetEventId === eventId
  const isStreetResolve = isBlockingStreet || isMinorStreet
  if (!isLife && !isStreetResolve) return state

  const contextRivalId = state.pendingRivalEventContext?.rivalId ?? null
  const rivalName = contextRivalId ? (state.rivals[contextRivalId]?.name ?? 'A rival') : 'A rival'
  const isRivalEvent = isRivalEventId(eventId)
  const isRevengeEvent = eventId === 'rival_revenge_opportunity'

  const lifeHist =
    isLife && eventId
      ? [...(state.lifeEventHistory ?? []), eventId].slice(-10)
      : (state.lifeEventHistory ?? [])

  const base: GameState = {
    ...state,
    pendingEventId: isBlockingStreet ? null : state.pendingEventId,
    pendingMinorStreetEventId: isMinorStreet ? null : state.pendingMinorStreetEventId,
    pendingLifeEventId: isLife ? null : state.pendingLifeEventId,
    pendingRivalEventContext: isStreetResolve ? null : state.pendingRivalEventContext,
    secondsUntilEvent: isStreetResolve ? randomEventCooldown(state) : state.secondsUntilEvent,
    lifeEventHistory: lifeHist,
    secondsUntilLifeEvent: isLife
      ? lifeEventCooldownSecondsForState(state.tickCount, territoriesOwnedCount(state))
      : state.secondsUntilLifeEvent,
  }

  const cm = effectiveLifeMoneyCost(state, choice)
  const cp = effectiveLifePowerCost(state, choice)
  const md0 = choice.moneyDelta
  const minMoneyNeeded = cm + (md0 !== undefined && md0 < 0 ? -md0 : 0)

  if (choice.successChance !== undefined && choice.successOutcome && choice.failureOutcome) {
    if (state.money < minMoneyNeeded || state.power < cp) return state

    const eventDef = getStreetEventDef(eventId)

    let next: GameState = {
      ...base,
      money: Math.max(0, state.money - cm + (md0 ?? 0)),
      power: state.power - cp,
    }
    let rollChance = choice.successChance
    if (eventDef?.targetsHome) {
      rollChance = adjustedHomeDefenseChance(state, eventDef, choice.successChance)
    }
    const success = Math.random() < rollChance
    let rawBundle: EventOutcomeBundle = success ? choice.successOutcome! : choice.failureOutcome!
    if (isLife && success && choice.successMoneyMultOfStake != null && cm > 0) {
      rawBundle = {
        ...rawBundle,
        moneyDelta: (rawBundle.moneyDelta ?? 0) + Math.round(cm * choice.successMoneyMultOfStake),
      }
    }
    let bundle = mergeRivalId(rawBundle, contextRivalId)
    let homeDefenseTier: 'full' | 'partial' | 'breach' | null = null

    if (eventDef?.targetsHome) {
      if (success) {
        homeDefenseTier = 'full'
      } else {
        const softened = softenHomeFailureBundle(state, eventDef, bundle)
        bundle = softened.bundle
        homeDefenseTier = softened.severity === 'partial' ? 'partial' : 'breach'
        if (homeDefenseTier === 'breach' && contextRivalId) {
          bundle = {
            ...bundle,
            revengeUnlocked: true,
            narratorId: 'rival_home_revenge_unlock',
            resultDetail: `${bundle.resultDetail} Payback just got a name: {{rival}}.`,
          }
        }
      }
    }

    next = applyEconomicOutcome(next, bundle)
    next = applyLifeOutcomeFields(next, bundle)
    next = applyRivalOutcomeEffects(next, bundle)
    next = patchAchievementStatsEventResolved(next, eventId, choice.id)
    next = setNarratorFromKey(next, bundle.narratorId)
    const variant = eventOutcomeBannerVariant(success, bundle, {
      isRivalEvent,
      isRevengeEvent,
      homeDefenseTier,
    })
    let homeDefenseHighlight: string | undefined
    if (eventDef?.targetsHome && (homeDefenseTier === 'full' || homeDefenseTier === 'partial')) {
      const raw = describeHomeDefenseHighlight(state, homeDefenseTier)
      if (raw) homeDefenseHighlight = interpolateRivalText(raw, rivalName)
    }
    next = attachOutcomeBanner(state, next, {
      title: interpolateRivalText(bundle.resultTitle, rivalName),
      detail: interpolateRivalText(bundle.resultDetail, rivalName),
      ...(isLife ? { fromLifeEvent: true } : {}),
      ...(homeDefenseHighlight ? { homeDefenseHighlight } : {}),
      variant,
    })
    next = bumpAvatarReactionFromOutcomeVariant(next, variant)
    next = processAchievements(next)
    next = applyAgeProgress(next, AGE_PROGRESS_EVENT_RESOLVED, { skipNarrator: true })
    if (isLife || isStreetResolve) next = maybeRestorePausedEmbeddedEvents(next)
    if (isLife && choice.startsGangWar) next = applyLifeGangWarChoice(next)
    return next
  }

  if (!choice.narratorId) return state
  if (state.money < minMoneyNeeded || state.power < cp) return state

  let next: GameState = {
    ...base,
    money: Math.max(0, state.money - cm + (md0 ?? 0)),
    power: state.power - cp,
  }
  if (choice.powerDelta) next = { ...next, power: Math.max(0, next.power + choice.powerDelta) }
  if (choice.passiveBonusDelta) {
    next = {
      ...next,
      passiveScale: clampPassiveScale(next.passiveScale + choice.passiveBonusDelta),
    }
  }
  next = applyLifeStatDeltasFromChoice(next, choice)
  if (isLife && eventId === 'life_tier1_beggar' && choice.id === 'sorry') {
    next = {
      ...next,
      lifeBranchFlags: { ...(next.lifeBranchFlags ?? {}), beggar_cold: true },
    }
  }
  next = applyRivalOutcomeEffects(next, {
    heatDelta: choice.heatDelta,
    rivalFactionId: choice.rivalFactionId ?? contextRivalId ?? undefined,
    rivalRelationshipDelta: choice.rivalRelationshipDelta,
    rivalPowerDelta: choice.rivalPowerDelta,
    territoryPressureDelta: choice.territoryPressureDelta,
    revengeUnlocked: choice.revengeUnlocked,
    nemesisFlag: choice.nemesisFlag,
  })
  next = patchAchievementStatsEventResolved(next, eventId, choice.id)
  if (isLife && eventId === GANG_RUMOR_EVENT_ID) {
    next = applyGangRumorAftermath(next, choice)
  } else if (isLife && eventId === GANG_DEMAND_EVENT_ID) {
    next = applyGangDemandAftermath(next, choice)
  } else {
    next = setNarratorFromKey(next, choice.narratorId)
  }
  const gangArcLife =
    isLife && (eventId === GANG_RUMOR_EVENT_ID || eventId === GANG_DEMAND_EVENT_ID)
  const detail = gangArcLife
    ? resolveNarratorLine(next.narratorEventKey ?? 'welcome', next)
    : choice.resultDetail != null
      ? interpolateRivalText(choice.resultDetail, rivalName)
      : resolveNarratorLine(choice.narratorId, next)
  const title = gangArcLife
    ? eventId === GANG_RUMOR_EVENT_ID
      ? 'Rumor fallout'
      : 'Situation update'
    : choice.resultTitle != null
      ? interpolateRivalText(choice.resultTitle, rivalName)
      : 'Outcome'
  let variant: NonNullable<GameState['eventOutcomeBanner']>['variant'] = 'neutral'
  if (isRevengeEvent) {
    variant =
      deterministicRivalVariant(choice) === 'rival-fail' ? 'revenge-fail' : 'revenge-success'
  } else if (isRivalEvent) {
    const rv = deterministicRivalVariant(choice)
    variant = rv === 'neutral' ? 'neutral' : rv
  }
  next = attachOutcomeBanner(state, next, {
    title,
    detail,
    ...(isLife ? { fromLifeEvent: true } : {}),
    variant,
  })
  next = bumpAvatarReactionFromOutcomeVariant(next, variant)
  next = processAchievements(next)
  next = applyAgeProgress(next, AGE_PROGRESS_EVENT_RESOLVED, { skipNarrator: true })
  if (isLife || isStreetResolve) next = maybeRestorePausedEmbeddedEvents(next)
  if (isLife && choice.startsGangWar) next = applyLifeGangWarChoice(next)
  return next
}

export function completeMeetGirlfriendConvo(
  state: GameState,
  payload: { correctCount: number; pickedEggSmile: boolean },
): GameState {
  if (state.pendingLifeEventId !== MEET_GIRLFRIEND_LIFE_EVENT_ID) return state
  const eventId = MEET_GIRLFRIEND_LIFE_EVENT_ID
  const choiceId = payload.pickedEggSmile
    ? 'egg_smile'
    : payload.correctCount >= 2
      ? 'meet_convo_win'
      : 'meet_convo_fail'
  let next: GameState = {
    ...state,
    pendingLifeEventId: null,
    lifeEventHistory: [...(state.lifeEventHistory ?? []), eventId].slice(-10),
    secondsUntilLifeEvent: lifeEventCooldownSecondsForState(
      state.tickCount,
      territoriesOwnedCount(state),
    ),
  }
  next = patchAchievementStatsEventResolved(next, eventId, choiceId)

  const won = payload.correctCount >= 2
  const hi = payload.correctCount >= 3
  if (!won) {
    next = {
      ...next,
      happiness: clampLifeStat(next.happiness - 3),
      eventOutcomeBanner: {
        title: 'Not this time',
        detail:
          'She smiles anyway and drifts off. The door cracked open—you did not walk through. Try again when the street sends another moment.',
        fromLifeEvent: true,
        variant: 'neutral',
      },
    }
    next = setNarratorFromKey(next, 'life_meet_convo_fail')
    next = bumpAvatarReactionFromOutcomeVariant(next, 'neutral')
    next = processAchievements(next)
    next = applyAgeProgress(next, AGE_PROGRESS_EVENT_RESOLVED, { skipNarrator: true })
    return maybeRestorePausedEmbeddedEvents(next)
  }

  const stats = hi ? 40 + Math.floor(Math.random() * 11) : 10 + Math.floor(Math.random() * 11)
  const nk = hi ? 'life_meet_convo_win_high' : 'life_meet_convo_win_low'
  next = {
    ...next,
    relationshipUnlocked: true,
    hasPartner: true,
    partnerName: state.partnerName || randomPartnerNameForMeet(),
    affection: clampLifeStat(stats),
    loyalty: clampLifeStat(stats),
    happiness: clampLifeStat(stats),
  }
  next = setNarratorFromKey(next, nk)
  next = {
    ...next,
    eventOutcomeBanner: {
      title: hi ? 'Clean sweep' : 'You made it count',
      detail: resolveNarratorLine(nk, next),
      fromLifeEvent: true,
      variant: 'success',
    },
  }
  next = bumpAvatarReactionFromOutcomeVariant(next, 'success')
  next = processAchievements(next)
  next = applyAgeProgress(next, AGE_PROGRESS_EVENT_RESOLVED, { skipNarrator: true })
  return maybeRestorePausedEmbeddedEvents(next)
}

export function dismissEventOutcome(state: GameState): GameState {
  return { ...state, eventOutcomeBanner: null }
}

export function updateNarrator(state: GameState, key: string): GameState {
  return setNarratorFromKey(state, key)
}

export function resolveRivalEncounter(state: GameState, choice: RivalChoiceId): GameState {
  const enc = state.pendingRivalEncounter
  const hadEncounter = enc != null
  const resolved = applyRivalEncounterResolution(state, choice)
  let next = processAchievements(resolved)
  if (!hadEncounter || !enc) return next
  next = applyAgeProgress(next, AGE_PROGRESS_RIVAL_ENCOUNTER, { skipNarrator: true })
  if (enc.kind === 'attack') {
    if (choice === 'defend') {
      next = bumpAvatarReaction(next, state.power >= enc.defendPowerCost ? 'success' : 'fail')
    } else if (choice === 'pay') {
      next = bumpAvatarReaction(next, state.money >= enc.payMoneyCost ? 'success' : 'fail')
    }
  } else if (enc.kind === 'revenge' && choice === 'revenge_strike') {
    if (state.power < enc.revengePowerCost) {
      next = bumpAvatarReaction(next, 'fail')
    }
  }
  return maybeRestorePausedEmbeddedEvents(next)
}

export function openRevengeModal(state: GameState): GameState {
  return processAchievements(openRevengeEncounter(state))
}

export function upgradeHouse(state: GameState): GameState {
  const upgraded = tryUpgradeHouse(state)
  if (upgraded === state) return processAchievements(upgraded)
  const pruned = pruneHousePlacementsToGrid(upgraded)
  const next = processAchievements(pruned)
  return applyAgeProgress(next, AGE_PROGRESS_PURCHASE, { skipNarrator: true })
}

export function tryBuyHouseItem(state: GameState, itemId: string): GameState {
  if (state.houseLevel < 1) return state
  const def = houseItemById(itemId)
  if (!def || (state.houseOwnedItems ?? {})[itemId]) return state
  if (def.costMoney !== undefined && state.money < def.costMoney) return state
  if (def.costPower !== undefined && state.power < def.costPower) return state
  let money = state.money
  let power = state.power
  if (def.costMoney !== undefined) money -= def.costMoney
  if (def.costPower !== undefined) power -= def.costPower
  const next = setNarratorFromKey(
    {
      ...state,
      money,
      power,
      houseOwnedItems: { ...(state.houseOwnedItems ?? {}), [itemId]: true },
    },
    'buy_house_item',
  )
  return processAchievements(patchAchievementStatsOnPurchase(next))
}

export function placeHouseItem(
  state: GameState,
  slotKey: string,
  itemId: string | null,
): GameState {
  const size = houseTierAtLevel(state.houseLevel).gridSize
  if (size <= 0) return state
  const parts = slotKey.split('-')
  const rs = parseInt(parts[0]!, 10)
  const cs = parseInt(parts[1]!, 10)
  if (Number.isNaN(rs) || Number.isNaN(cs) || rs < 0 || cs < 0 || rs >= size || cs >= size) {
    return state
  }
  const placements = { ...(state.housePlacements ?? {}) }
  if (itemId === null) {
    delete placements[slotKey]
    return {
      ...state,
      housePlacements: placements,
      housePlacementNonce: state.housePlacementNonce + 1,
    }
  }
  if (!(state.houseOwnedItems ?? {})[itemId]) return state
  for (const k of Object.keys(placements)) {
    if (placements[k] === itemId) delete placements[k]
  }
  placements[slotKey] = itemId
  return {
    ...state,
    housePlacements: placements,
    housePlacementNonce: state.housePlacementNonce + 1,
  }
}

export function setCharacterCustomization(
  state: GameState,
  patch: {
    characterLook?: Partial<CharacterLook>
    characterTheme?: CharacterThemeId
    playerName?: string
  },
): GameState {
  let customizationNonce = state.customizationNonce
  if (patch.characterLook !== undefined || patch.characterTheme !== undefined) {
    customizationNonce += 1
  }
  const characterLook =
    patch.characterLook !== undefined
      ? { ...state.characterLook, ...patch.characterLook }
      : state.characterLook
  return {
    ...state,
    characterLook,
    ...(patch.characterTheme !== undefined ? { characterTheme: patch.characterTheme } : {}),
    ...(patch.playerName !== undefined ? { playerName: patch.playerName } : {}),
    customizationNonce,
  }
}

export function lifeSocial(state: GameState, action: LifeSocialAction): GameState {
  return processAchievements(applyLifeSocialAction(state, action))
}

export function marry(state: GameState): GameState {
  return processAchievements(tryMarry(state))
}

export function rivalWarAttack(state: GameState, rivalId: string): GameState {
  return processAchievements(tryRivalWarAttack(state, rivalId))
}

export function rivalWarSurge(state: GameState, rivalId: string): GameState {
  return processAchievements(tryRivalWarSurge(state, rivalId))
}

export function rivalSurrender(state: GameState, rivalId: string): GameState {
  return processAchievements(tryRivalSurrender(state, rivalId))
}

export function rivalTruce(state: GameState, rivalId: string): GameState {
  return processAchievements(tryRivalTruce(state, rivalId))
}

export function tryBeginEliminationWar(state: GameState, rivalId: string): GameState {
  const hadWar = Boolean(state.gangWarRivalId)
  const next = beginEliminationWar(state, rivalId)
  if (!hadWar && next.gangWarRivalId === rivalId) {
    return processAchievements(setNarratorFromKey(next, 'rival_elimination_war_start'))
  }
  return next
}

export function resolveWarStrikeAction(
  state: GameState,
  choice: import('./rivalWarEngine').WarStrikeChoice,
): GameState {
  return processAchievements(resolveWarStrike(state, choice))
}

export function lifePrestigeChild(state: GameState): GameState {
  return processAchievements(performLifePrestigeChild(state))
}

export function lifePrestigeSolo(state: GameState): GameState {
  return processAchievements(performLifePrestigeSolo(state))
}

export { tryHeatLaunder } from './heatLaunderEngine'
export { startPartnerGoal } from './partnerGoalEngine'
