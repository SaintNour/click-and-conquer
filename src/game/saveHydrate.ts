import type { GameState } from '../data/types'
import { getStreetEventDef } from '../data/eventRegistry'
import { DEFAULT_THEME, mergeCharacterLook } from '../data/characterCustomization'
import { MAX_HOUSE_LEVEL_INDEX } from '../data/lifeContent'
import { pruneHousePlacementsToGrid } from './houseCustomizationEngine'
import { createDefaultAchievementStats } from './achievementsEngine'
import { computePlayerTitle } from './compute'
import { migratePassiveScaleV9 } from './empireMultiplierSources'
import { migrateAllRivalsWar } from './rivalWarEngine'
import { ensureRivals, RELATIONSHIP_POINTS_START } from './rivalsEngine'
import { createInitialState } from './initialState'
import { MEET_GIRLFRIEND_LIFE_EVENT_ID } from '../data/lifeEvents'

function migratePendingLifeEventId(id: string | null): string | null {
  if (id === 'life_meet_someone' || id === 'life_meet_someone_b')
    return MEET_GIRLFRIEND_LIFE_EVENT_ID
  return id
}

function migrateNonRivalPendingStreetToEmbedded(s: GameState): GameState {
  const id = s.pendingEventId
  if (!id) return s
  const ev = getStreetEventDef(id)
  if (!ev || ev.eventKind === 'rival') return s
  return {
    ...s,
    pendingEventId: null,
    pendingRivalEventContext: null,
    pendingMinorStreetEventId: s.pendingMinorStreetEventId ?? id,
  }
}

/**
 * Merge a parsed save object into a full GameState (same rules as load from localStorage).
 * Returns null if `parsed` is not a non-null object.
 */
export function hydrateFromParsedSave(parsed: unknown): GameState | null {
  if (!parsed || typeof parsed !== 'object') return null
  const p = parsed as Partial<GameState>
  try {
    const base = createInitialState()
    const saveVersion = p.saveVersion ?? 1
    let migratedHouseLevel = p.houseLevel ?? base.houseLevel
    if (saveVersion < 2) {
      migratedHouseLevel = Math.min(MAX_HOUSE_LEVEL_INDEX, migratedHouseLevel + 1)
    }
    if (saveVersion < 8) {
      // v8: optional portrait layer offsets (hairYOffset/hatYOffset) — mergeCharacterLook applies defaults.
    }
    if (saveVersion < 9) {
      // v9: empire scale split — progression vs events; strip tick-only passiveScale drift (see migratePassiveScaleV9).
    }
    const merged: GameState = {
      ...base,
      ...p,
      recruitLevels: { ...base.recruitLevels, ...p.recruitLevels },
      businessLevels: { ...base.businessLevels, ...p.businessLevels },
      territoriesOwned: { ...base.territoriesOwned, ...p.territoriesOwned },
      shopUpgradesPurchased: {
        ...base.shopUpgradesPurchased,
        ...(p.shopUpgradesPurchased ?? {}),
      },
      achievementsUnlocked: {
        ...base.achievementsUnlocked,
        ...(p.achievementsUnlocked ?? {}),
      },
      achievementStats: {
        ...createDefaultAchievementStats(),
        ...(p.achievementStats ?? {}),
        clickMsRing: p.achievementStats?.clickMsRing ?? [],
      },
      achievementToastQueue: [],
      pendingRivalEventContext: null,
      rivalStoryEventNonce: 0,
      homeThreatPulseNonce: 0,
      pendingEventId: p.pendingEventId ?? null,
      narratorEventKey: p.narratorEventKey ?? base.narratorEventKey,
      dangerPulseNonce: 0,
      dangerCooldownRemaining: p.dangerCooldownRemaining ?? base.dangerCooldownRemaining,
      rivals: { ...base.rivals, ...(p.rivals ?? {}) },
      heat: p.heat ?? base.heat,
      heatCrackdownEndTick: p.heatCrackdownEndTick ?? base.heatCrackdownEndTick,
      heatCapGraceEndTick: p.heatCapGraceEndTick ?? 0,
      heatGracePeriodActive: p.heatGracePeriodActive ?? false,
      heatMaxDebuffKind: p.heatMaxDebuffKind ?? null,
      heatCrackdownNonce: 0,
      heatWarningLatch: p.heatWarningLatch ?? base.heatWarningLatch,
      heatWarningSfxNonce: 0,
      secondsUntilRivalCheck: p.secondsUntilRivalCheck ?? base.secondsUntilRivalCheck,
      rivalAttackCooldownTicks: p.rivalAttackCooldownTicks ?? base.rivalAttackCooldownTicks,
      rivalAmbientCooldownTicks: p.rivalAmbientCooldownTicks ?? base.rivalAmbientCooldownTicks,
      pendingRivalEncounter: p.pendingRivalEncounter ?? null,
      revengeTargetId: p.revengeTargetId ?? null,
      rivalIncomeMult: p.rivalIncomeMult ?? base.rivalIncomeMult,
      rivalWarningNonce: 0,
      rivalAttackFlashNonce: 0,
      rivalRevengeNonce: 0,
      titlePulseNonce: p.titlePulseNonce ?? 0,
      avatarReactionNonce: 0,
      avatarReactionKind: null,
      saveVersion: Math.max(p.saveVersion ?? 1, 15),
      lastManualHustleTick:
        (p as { lastManualHustleTick?: number }).lastManualHustleTick ??
        p.tickCount ??
        base.lastManualHustleTick,
      houseLevel: migratedHouseLevel,
      relationshipUnlocked: p.relationshipUnlocked ?? !!p.hasPartner,
      lifeEventHistory: p.lifeEventHistory ?? [],
      age: p.age ?? base.age,
      ageProgressPoints: p.ageProgressPoints ?? base.ageProgressPoints,
      agePulseNonce: p.agePulseNonce ?? 0,
      hasPartner: p.hasPartner ?? base.hasPartner,
      partnerName: p.partnerName ?? base.partnerName,
      affection: p.affection ?? base.affection,
      loyalty: p.loyalty ?? base.loyalty,
      happiness: p.happiness ?? base.happiness,
      married: p.married ?? base.married,
      lifePrestigeMarried: p.lifePrestigeMarried ?? base.lifePrestigeMarried,
      lifePrestigeSolo: p.lifePrestigeSolo ?? base.lifePrestigeSolo,
      secondsUntilLifeEvent: p.secondsUntilLifeEvent ?? base.secondsUntilLifeEvent,
      pendingLifeEventId: migratePendingLifeEventId(p.pendingLifeEventId ?? null),
      pausedMinorLifeEventId: p.pausedMinorLifeEventId ?? base.pausedMinorLifeEventId,
      lifeSocialCooldownTicks: p.lifeSocialCooldownTicks ?? base.lifeSocialCooldownTicks,
      lastLifePositiveSocialTick: p.lastLifePositiveSocialTick ?? 0,
      lifeGriefDebuffEndTick: p.lifeGriefDebuffEndTick ?? 0,
      playerWarHp: p.playerWarHp ?? 100,
      playerWarMaxHp: p.playerWarMaxHp ?? 100,
      warIncomingBlocks: p.warIncomingBlocks ?? 0,
      pendingWarStrike: p.pendingWarStrike ?? null,
      gangWarRivalId: p.gangWarRivalId ?? null,
      gangWarTargetTerritoryId: p.gangWarTargetTerritoryId ?? null,
      gangWarSmallWar: p.gangWarSmallWar ?? false,
      gangWarAttackUses: p.gangWarAttackUses ?? 0,
      gangWarDefendUses: p.gangWarDefendUses ?? 0,
      territoryOwner: p.territoryOwner ?? {},
      territoryFailMult: p.territoryFailMult ?? {},
      lifeEventForcedId: p.lifeEventForcedId ?? null,
      gangIntelRivalId: p.gangIntelRivalId ?? null,
      gangWarStrikePrepared: p.gangWarStrikePrepared ?? false,
      gangWarSurpriseDoublePending: p.gangWarSurpriseDoublePending ?? false,
      houseOwnedItems: { ...base.houseOwnedItems, ...(p.houseOwnedItems ?? {}) },
      housePlacements: { ...base.housePlacements, ...(p.housePlacements ?? {}) },
      housePlacementNonce: p.housePlacementNonce ?? 0,
      characterLook: mergeCharacterLook((p as { characterLook?: unknown }).characterLook),
      characterTheme: p.characterTheme ?? DEFAULT_THEME,
      customizationNonce: p.customizationNonce ?? 0,
      businessUnlockHighlightNonce:
        p.businessUnlockHighlightNonce ?? base.businessUnlockHighlightNonce,
      businessUnlockHighlightIds: Array.isArray(p.businessUnlockHighlightIds)
        ? p.businessUnlockHighlightIds
        : base.businessUnlockHighlightIds,
      territoryFirstCaptureSeen: p.territoryFirstCaptureSeen ?? {},
      lifeBranchFlags: p.lifeBranchFlags ?? {},
      heatLaunderCooldownEndTick: p.heatLaunderCooldownEndTick ?? 0,
      partnerGoal: p.partnerGoal ?? null,
      eventLog: Array.isArray(p.eventLog) ? p.eventLog : [],
      eventOutcomeBanner: null,
    }
    Reflect.deleteProperty(merged as object, 'avatarStyle')
    const synced: GameState = migrateNonRivalPendingStreetToEmbedded({
      ...merged,
      title: computePlayerTitle(merged),
    })
    let out = pruneHousePlacementsToGrid(synced)
    out = migratePassiveScaleV9(out)
    out = migrateAllRivalsWar(out)
    // Re-seed rivals up to the new 15-rival roster and assign rivals to all unowned territories.
    // If the new seed adds rivals (legacy save had 5), stale references to old rival ids must be cleared.
    out = ensureRivals(out)
    const legacyRivals = out.rivals
    const cleanRef = (id: string | null): string | null =>
      id && legacyRivals[id]?.alive !== false ? id : null
    out = {
      ...out,
      gangWarRivalId: cleanRef(out.gangWarRivalId),
      gangIntelRivalId: cleanRef(out.gangIntelRivalId),
      revengeTargetId: cleanRef(out.revengeTargetId),
    }
    // Ensure relationshipPoints exists on every rival (legacy migration safety net).
    const rivalsBackfilled: Record<string, (typeof legacyRivals)[string]> = {}
    for (const rid of Object.keys(out.rivals)) {
      const r = out.rivals[rid]!
      rivalsBackfilled[rid] =
        typeof r.relationshipPoints === 'number'
          ? r
          : { ...r, relationshipPoints: RELATIONSHIP_POINTS_START }
    }
    out = { ...out, rivals: rivalsBackfilled }
    out = { ...out, title: computePlayerTitle(out) }
    return out
  } catch {
    return null
  }
}

export const SAVE_EXPORT_PREFIX = 'CNC1:'

/** Strip UI-only / animation fields before export backup. */
export function stripEphemeralForExport(state: GameState): GameState {
  return {
    ...state,
    achievementToastQueue: [],
    eventOutcomeBanner: null,
    agePulseNonce: 0,
    titlePulseNonce: 0,
    dangerPulseNonce: 0,
    rivalStoryEventNonce: 0,
    homeThreatPulseNonce: 0,
    rivalWarningNonce: 0,
    rivalAttackFlashNonce: 0,
    rivalRevengeNonce: 0,
    avatarReactionNonce: 0,
    avatarReactionKind: null,
    housePlacementNonce: 0,
    customizationNonce: 0,
    businessUnlockHighlightNonce: 0,
    businessUnlockHighlightIds: [],
  }
}

export function encodeSaveExport(state: GameState): string {
  const json = JSON.stringify(stripEphemeralForExport(state))
  return SAVE_EXPORT_PREFIX + btoa(unescape(encodeURIComponent(json)))
}

export function decodeSaveImport(str: string): GameState | { error: string } {
  const trimmed = str.trim()
  if (!trimmed.startsWith(SAVE_EXPORT_PREFIX)) {
    return { error: 'Not a Click & Conquer save (wrong header).' }
  }
  const b64 = trimmed.slice(SAVE_EXPORT_PREFIX.length).trim()
  let json: string
  try {
    json = decodeURIComponent(escape(atob(b64)))
  } catch {
    return { error: 'Could not decode save data.' }
  }
  let parsed: unknown
  try {
    parsed = JSON.parse(json)
  } catch {
    return { error: 'Save data is not valid JSON.' }
  }
  const game = hydrateFromParsedSave(parsed)
  if (!game) return { error: 'Save data could not be loaded.' }
  return game
}
