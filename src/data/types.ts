import type {
  PendingRivalEncounter,
  PendingWarStrike,
  RivalArchetype,
  RivalState,
} from './rivalTypes'
import type { CharacterLook, CharacterThemeId } from './characterCustomization'

export type {
  PendingRivalEncounter,
  PendingWarStrike,
  RivalArchetype,
  RivalRelationship,
  RivalState,
} from './rivalTypes'
export type { CharacterLook, CharacterThemeId } from './characterCustomization'

export type OutcomeStatDeltas = {
  money: number
  power: number
  heat: number
  passiveScale: number
}

export type EventLogEntry = {
  tick: number
  title: string
  detail: string
  money: number
  power: number
  heat: number
  passive: number
}

export type RecruitDef = {
  id: string
  name: string
  description: string
  baseCost: number
  costMult: number
  powerPerClick: number
  powerPerSecond: number
  /** Multiplier on this row’s passive power (flavor / role tint). Default 1. */
  passivePowerPersonaMult?: number
  /** Multiplier on this row’s click power from recruits. Default 1. */
  clickPowerPersonaMult?: number
}

export type BusinessDef = {
  id: string
  name: string
  description: string
  baseCost: number
  costMult: number
  moneyPerClick: number
  moneyPerSecond: number
  /** If set, purchase requires owning this territory (existing level > 0 still counts for legacy saves). */
  unlockTerritoryId?: string
}

export type TerritoryDef = {
  id: string
  name: string
  description: string
  powerRequired: number
  rewardMoney: number
}

/** Result of a stochastic choice (shown in result card + narrator). */
export type EventOutcomeBundle = {
  moneyDelta?: number
  powerDelta?: number
  passiveBonusDelta?: number
  narratorId: string
  resultTitle: string
  resultDetail: string
  /** Notoriety / attention (0–100 cap in engine) */
  heatDelta?: number
  /** Target rival for relationship / power / revenge hooks */
  rivalFactionId?: string
  /** +1 escalate rivalry, -1 soft de-escalate (V1 mostly +1) */
  rivalRelationshipDelta?: number
  /** Negative values hurt the rival’s powerLevel */
  rivalPowerDelta?: number
  territoryPressureDelta?: number
  revengeUnlocked?: boolean
  /** Narrator / FX: nemesis moment */
  nemesisFlag?: boolean
  /** Life-event outcomes (applied after economic fields). */
  affectionDelta?: number
  loyaltyDelta?: number
  happinessDelta?: number
  /** Opens relationship panel track without instantly partnering. */
  relationshipPathUnlock?: boolean
}

/** Optional rival hooks on deterministic event choices (same fields as bundle subset). */
export type RivalChoiceHooks = {
  heatDelta?: number
  rivalFactionId?: string
  rivalRelationshipDelta?: number
  rivalPowerDelta?: number
  territoryPressureDelta?: number
  revengeUnlocked?: boolean
  nemesisFlag?: boolean
}

/** Life: spend scales off current cash (resolved in lifeChoiceCosts). */
export type LifeScaledMoneyCost = {
  fractionOfWealth: number
  floor: number
  cap: number
  /** Also compete with passive $/s × seconds (0 = omit). */
  passiveIncomeSeconds?: number
  /** Raise cap with wealth: max(cap, floor(money × this)). */
  capWealthFraction?: number
}

/** Life: spend scales off current power stockpile. */
export type LifeScaledPowerCost = {
  fractionOfPower: number
  floor: number
  cap: number
  passivePowerSeconds?: number
  capPowerStockFraction?: number
}

export type EventChoiceDef = {
  id: string
  label: string
  /** Legacy deterministic: applied directly when successChance is omitted */
  moneyDelta?: number
  powerDelta?: number
  /** Adds to the event/rival passiveScale modifier (legacy name; not tick-based growth). */
  passiveBonusDelta?: number
  affectionDelta?: number
  loyaltyDelta?: number
  happinessDelta?: number
  /** Legacy narrator key; optional when using stochastic outcomes only */
  narratorId?: string
  /** Up-front cost before roll (stochastic) or before applying legacy deltas */
  costMoney?: number
  costPower?: number
  /** When set, overrides flat costMoney with clamp(round(money * fraction), floor, cap). */
  scaledMoneyCost?: LifeScaledMoneyCost
  /** When set, overrides flat costPower with clamp(round(power * fraction), floor, cap). */
  scaledPowerCost?: LifeScaledPowerCost
  /** If set, successOutcome vs failureOutcome is rolled */
  successChance?: number
  successOutcome?: EventOutcomeBundle
  failureOutcome?: EventOutcomeBundle
  /**
   * Stochastic: on success, extra cash granted = round(stake * mult), stake = effective money paid
   * (scaled or flat). Merged into successOutcome moneyDelta in applyEventChoice.
   */
  successMoneyMultOfStake?: number
  /** Optional copy for deterministic result popup */
  resultTitle?: string
  resultDetail?: string
  /** Life: begin the relationship arc (meet event). */
  unlocksRelationship?: boolean
  /** Life: open the Rival War track against a weighted rival (no auto-repeat with other crews). */
  startsGangWar?: boolean
} & RivalChoiceHooks

/** Multi-round meet flow (blocking modal renders custom UI when set). */
export type MeetConvoChoiceDef = {
  id: string
  label: string
  /** Exactly one per round should be true for scoring. */
  correct?: boolean
}

export type MeetConvoRoundDef = {
  herLine: string
  choices: MeetConvoChoiceDef[]
}

export type MeetConvoContent = {
  introTitle: string
  introBody: string
  rounds: MeetConvoRoundDef[]
}

export type RandomEventDef = {
  id: string
  title: string
  body: string
  choices: EventChoiceDef[]
  eventKind?: 'street' | 'story' | 'rival'
  minHeat?: number
  maxHeat?: number
  requiresRevenge?: boolean
  rivalArchetype?: RivalArchetype
  /** Life-event pacing / weighting (street events ignore). */
  lifeTier?: 'small' | 'medium' | 'major'
  /** If true, only offered when the player has a partner and relationship UI is unlocked. */
  requiresPartner?: boolean
  /** Life: still eligible when relationship-arc UI is otherwise blocking random life picks. */
  bypassRelationshipLock?: boolean
  /** If true, only offered before the first relationship unlock (meet-someone arc). */
  introducesRelationship?: boolean
  /** Used to avoid repeating the same storyline back-to-back. */
  variationGroup?: string
  /** Rival event: pressure at the player’s HQ (requires apartment+). */
  targetsHome?: boolean
  /** Baseline difficulty for home defense rolls (vs aggregated HQ stats). */
  homePressure?: number
  /** Minimum game ticks before this home event can appear (pacing). */
  minTick?: number
  /** Minimum territories owned (pacing). */
  minTerritories?: number
  /** Life events: eligible when player progression tier is in [min, max] (see `getLifeEventTier`). */
  lifeTierMin?: number
  lifeTierMax?: number
  /**
   * Life events: display weighting only. Blocking modal uses `GIRLFRIEND_BLOCKING_LIFE_EVENT_IDS` in `lifeEventFlow`.
   */
  priority?: 'minor' | 'major'
  /** Life: requires at least one living rival (gang / pressure stories). */
  requiresLivingRivals?: boolean
  /** Life: require all of these keys to be true in `lifeBranchFlags` (persistent story forks). */
  requiresLifeBranchKeys?: string[]
  /** Blocking meet: custom conversation UI instead of flat choices. */
  meetConvo?: MeetConvoContent
}

/** Session / lifetime counters for achievements (persisted). */
export type AchievementStats = {
  totalClicks: number
  /** Recent click wall times (ms) for burst detection */
  clickMsRing: number[]
  clicksSincePurchase: number
  /** Successful recruit / business / shop buys */
  totalPurchases: number
  lastClickMs: number
  /** Seconds of idle (tick-based) while no recent clicks */
  consecutiveIdleSeconds: number
  peakIdleSeconds: number
  territoryFailCount: number
  eventsResolved: number
  rainUmbrellasTaken: boolean
  influencerYesTaken: boolean
  /** Rival war track: leaders eliminated (Jr counts as new leader). */
  rivalEliminations: number
  /** Partner break-ups (neglect or choice). */
  relationshipBreakups: number
  /** Hidden: life event easter egg flags */
  eggMidnightTrain: boolean
  eggTrustLedger: boolean
  eggRomanceChaos: boolean
  eggStreetWhisper: boolean
  /** Times rival war pressure collapsed your line (HP hit 0). */
  playerWarMeltdowns: number
}

/** After max heat sits at cap for HEAT_CAP_GRACE_TICKS, a random penalty applies (see heatCrackdownEngine). */
export type HeatMaxDebuffKind = 'police' | 'surveillance' | 'freeze' | 'shakedown' | 'audit'

export type GameState = {
  money: number
  power: number
  recruitLevels: Record<string, number>
  businessLevels: Record<string, number>
  territoriesOwned: Record<string, boolean>
  playerName: string
  age: number
  /** Accumulates from money flow, milestones, events; crossing threshold ages the character. */
  ageProgressPoints: number
  /** Bumps when age increases (subtle UI pulse). */
  agePulseNonce: number
  title: string
  /** GSAP: player title tier increased */
  titlePulseNonce: number
  narratorLine: string
  /** Last narrator template key (for UI tone / bubble styling). */
  narratorEventKey: string | null
  /**
   * Event / rival / card bonus layer on empire scale (starts at 1). No longer drifts from time or click count.
   * Combined with `progressionEmpireScaleMult` in `totalEmpireScaleMultiplier` (see `empireMultiplierSources.ts`).
   */
  passiveScale: number
  tickCount: number
  /** UNIX ms when the game last persisted (offline catch-up window ends here). */
  lastSessionEndedAtMs: number
  /** Exclusive: while `tickCount < streetLuckEndTick`, cash from Hustle + passive is multiplied. */
  streetLuckEndTick: number
  /** Money multiplier during street luck (typically 2–3). */
  streetLuckMoneyMult: number
  secondsUntilEvent: number
  /** Blocking street modal only: rival `eventKind` cards (see `isBlockingStreetEventId`). */
  pendingEventId: string | null
  /** Embedded non-rival street / story / random opportunity cards (no modal, no Hustle block). */
  pendingMinorStreetEventId: string | null
  /** Shelved embedded street while rival street / girlfriend / rival encounter is active. */
  pausedMinorStreetEventId: string | null
  /** When a rival-tagged street event fires, which faction it references (for copy + outcomes). */
  pendingRivalEventContext: null | { rivalId: string }
  /** Bumps when a rival event card opens (GSAP accent). */
  rivalStoryEventNonce: number
  /** Bumps when a rival home-threat street event is queued (HQ pulse). */
  homeThreatPulseNonce: number
  /** Increments when a passive danger ambience fires (visual feedback only). */
  dangerPulseNonce: number
  /** Seconds (ticks) until another danger roll is allowed. */
  dangerCooldownRemaining: number
  /** Cookie-style one-time empire upgrades (id → purchased). */
  shopUpgradesPurchased: Record<string, boolean>
  /** Achievement id → unlocked */
  achievementsUnlocked: Record<string, boolean>
  achievementStats: AchievementStats
  /** Pending toast ids (FIFO); consumed by UI */
  achievementToastQueue: string[]

  /** 0–100; attention from cash, power moves, turf */
  heat: number
  /** Tick index (exclusive): while `tickCount < heatCrackdownEndTick`, crackdown income debuff applies. */
  heatCrackdownEndTick: number
  /** Bumps when max-heat police crackdown fires (screen FX + SFX). */
  heatCrackdownNonce: number
  /**
   * While tickCount < this value, heat stays pegged at HEAT_CAP (see HEAT_CAP_GRACE_TICKS in balanceConfig).
   * 0 = not in the max-heat hold window.
   */
  heatCapGraceEndTick: number
  /** True while heat is pegged at max and the grace countdown runs before the crackdown roll (synced in `tickRivalsAndHeat`). */
  heatGracePeriodActive: boolean
  /** Which random penalty is active for the current heatCrackdownEndTick window; null when no debuff. */
  heatMaxDebuffKind: HeatMaxDebuffKind | null
  /** Latch so heat-warning SFX does not spam until heat drops. */
  heatWarningLatch: boolean
  /** Bumps when crossing high-heat warning threshold (SFX). */
  heatWarningSfxNonce: number
  /** Last `tickCount` when the player manually pressed Hustle (not auto-hustle). Drives idle heat decay. */
  lastManualHustleTick: number
  /** Rival factions keyed by id */
  rivals: Record<string, RivalState>
  /** Seconds until next rival encounter roll */
  secondsUntilRivalCheck: number
  /** Ticks before another rival attack can spawn */
  rivalAttackCooldownTicks: number
  /** Cooldown for ambient “you’re watched” warnings */
  rivalAmbientCooldownTicks: number
  pendingRivalEncounter: PendingRivalEncounter | null
  /** After a failed defense, player can strike back */
  revengeTargetId: string | null
  /** Small permanent income boost from successful revenge (stacks lightly) */
  rivalIncomeMult: number
  /** GSAP: ambient warning pulse + shake */
  rivalWarningNonce: number
  /** GSAP: attack modal opens */
  rivalAttackFlashNonce: number
  /** GSAP: revenge strike animation */
  rivalRevengeNonce: number
  /** GSAP: avatar reaction (identity feedback). */
  avatarReactionNonce: number
  avatarReactionKind: null | 'success' | 'fail' | 'danger' | 'rival' | 'revenge'

  /** Save format version; below 2 triggers housing migration for legacy saves. */
  saveVersion: number

  /** 0–5: homeless → fortress */
  houseLevel: number
  /** When false, relationship UI and partner actions stay hidden until a meet event unlocks. */
  relationshipUnlocked: boolean
  hasPartner: boolean
  partnerName: string
  affection: number
  loyalty: number
  happiness: number
  married: boolean
  /** Family prestige count (marriage + child reset path) */
  lifePrestigeMarried: number
  /** Solo prestige count (weaker reset path) */
  lifePrestigeSolo: number
  secondsUntilLifeEvent: number
  pendingLifeEventId: string | null
  /** Minor life event shelved while street / rival / major life is showing. */
  pausedMinorLifeEventId: string | null
  /** Recent life event ids (anti-repeat / weighting). */
  lifeEventHistory: string[]
  lifeSocialCooldownTicks: number
  /** Last tick when a Date or Gift was used (neglect decay after grace). */
  lastLifePositiveSocialTick: number
  /** Exclusive: grief debuff after break-up (−25% money & power). */
  lifeGriefDebuffEndTick: number
  /** War sidebar: player HP vs active rival pressure. */
  playerWarHp: number
  playerWarMaxHp: number
  /** Each charge absorbs one incoming rival war hit. Legacy — kept for save compat. */
  warIncomingBlocks: number
  /** Reactive incoming strike popup ("they're moving on you, defend or take it"). */
  pendingWarStrike: PendingWarStrike | null
  /** Life-led gang war: only this rival drives war HUD + incoming strikes until the arc ends. */
  gangWarRivalId: string | null
  /**
   * If set, the active war is a SMALL war over a specific territory.
   * Winning transfers this territory to the player; losing bumps its takeover power cost.
   * Null = current war is a big-war / life-arc style (full elimination loop).
   */
  gangWarTargetTerritoryId: string | null
  /** True when the active war is a small territory takeover (drives 2× strike rate + soft win/lose outcomes). */
  gangWarSmallWar: boolean
  /** War-line attacks (including Surge) used this arc — escalates next attack power cost like shop tiers. */
  gangWarAttackUses: number
  /** Incoming strikes blocked with Defend this arc — escalates next defend power cost. */
  gangWarDefendUses: number
  /**
   * Map of territoryId → rival id that owns it. `null` value = unclaimed.
   * Player-owned territories use `state.territoriesOwned[id] = true` like before.
   */
  territoryOwner: Record<string, string | null>
  /**
   * Multiplier on a territory's base power requirement after failed small wars.
   * Stacks +15% per loss; persists across attempts so repeated failures hurt.
   */
  territoryFailMult: Record<string, number>
  /** When set, the next life tick must queue this life event id (gang chain, etc.). */
  lifeEventForcedId: string | null
  /** Intel-only rival during rumor arc (HUD “preparing” strip, not yet open war). */
  gangIntelRivalId: string | null
  /** Next incoming war strike roll is skipped (rumor “get ready”). */
  gangWarStrikePrepared: boolean
  /** Next take-hit from a war strike deals double damage (ignored rumor). */
  gangWarSurpriseDoublePending: boolean

  /** Owned HQ décor (id → purchased). */
  houseOwnedItems: Record<string, boolean>
  /** Grid slot key "r-c" → placed item id. */
  housePlacements: Record<string, string>
  /** GSAP: house item placed or moved. */
  housePlacementNonce: number

  /** Stylized human portrait layers + wardrobe. */
  characterLook: CharacterLook
  characterTheme: CharacterThemeId
  /** GSAP: look/theme change (not bumped on name typing). */
  customizationNonce: number

  /** Increments when capturing a territory unlocks one or more businesses (shop highlight). */
  businessUnlockHighlightNonce: number
  /** Business ids to pulse in the upgrade panel after the latest qualifying capture. */
  businessUnlockHighlightIds: string[]

  /** Territory ids where we already showed the first-capture story beat. */
  territoryFirstCaptureSeen: Record<string, boolean>
  /** Persistent life-event branch flags (snubs, deals, etc.) for follow-up events. */
  lifeBranchFlags: Record<string, boolean>
  /** Cooldown end tick for “launder heat” spend (0 = ready). */
  heatLaunderCooldownEndTick: number

  /** Optional shared goal with partner: bank cash while keeping heat capped until endTick. */
  partnerGoal: null | {
    baselineMoney: number
    targetMoneyDelta: number
    maxHeat: number
    endTick: number
  }

  /** Last few outcome cards (newest first) for quick recall. */
  eventLog: EventLogEntry[]

  /** Brief result card after resolving an event choice (cleared by UI). */
  eventOutcomeBanner: null | {
    title: string
    detail: string
    /** Life-event result cards use shorter auto-dismiss + hover pause in UI. */
    fromLifeEvent?: boolean
    /** Extra line for home-defense outcomes (item credit, partial mitigation). */
    homeDefenseHighlight?: string
    /** Snapshot of economy shifts for this outcome (for the banner + log). */
    statDeltas?: {
      money: number
      power: number
      heat: number
      passiveScale: number
    }
    variant:
      | 'success'
      | 'fail'
      | 'neutral'
      | 'rival-success'
      | 'rival-fail'
      | 'revenge-success'
      | 'revenge-fail'
      | 'home-success'
      | 'home-partial'
      | 'home-fail'
      | 'heat-crackdown'
  }
}
