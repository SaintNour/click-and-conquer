import { lazy, Suspense, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { playDangerFeedback } from './animations/dangerFeedback'
import { playPageIntro } from './animations/pageIntro'
import {
  playRivalAttackFlash,
  playRivalRevengeDramatic,
  playRivalWarning,
} from './animations/rivalFeedback'
import { playHeatCrackdownSfx, playHeatWarningSfx } from './audio/gameSfx'
import { AchievementHud } from './components/AchievementHud'
import { AchievementToast } from './components/AchievementToast'
import { AchievementsModal } from './components/AchievementsModal'
import { AdSenseSideSlot } from './components/AdSenseSideSlot'
import { AppReleaseBar, AppReleaseFooter } from './components/AppReleaseChrome'
import { CharacterModal } from './components/CharacterModal'
import { CityMapModal } from './components/CityMapModal'
import { EventModal } from './components/EventModal'
import { EventOutcomeBanner } from './components/EventOutcomeBanner'
import { GangsModal } from './components/GangsModal'
import { LeftSidebarAccordion } from './components/LeftSidebarAccordion'
import { MainClicker } from './components/MainClicker'
import { MeetGirlfriendModal } from './components/MeetGirlfriendModal'
import { NarratorBar } from './components/NarratorBar'
import { RivalModal } from './components/RivalModal'
import { SettingsModal } from './components/SettingsModal'
import { UpgradePanel } from './components/UpgradePanel'
import { WarStrikeModal } from './components/WarStrikeModal'
import {
  getLifeEventDefById,
  isBlockingLifeEventId,
  isBlockingStreetEventId,
  isGameplayModalBlocking,
} from './game/lifeEventFlow'
import { empireVisualRebuildKey } from './game/visualMetrics'
import { useGame } from './game/useGame'
import './App.css'

const StreetBackground = lazy(async () => {
  const m = await import('./effects/pixi/StreetBackground')
  return { default: m.StreetBackground }
})

function App() {
  const {
    applyImportedState,
    beginEliminationWarFromMap,
    buyBusiness,
    buyHouseItem,
    buyRecruit,
    buyShopUpgrade,
    click,
    completeMeetGirlfriend,
    dismissAchievementToast,
    dismissOutcomeBanner,
    heatLaunder,
    lifePrestigeChild,
    lifePrestigeSolo,
    lifeSocial,
    marry,
    openRevenge,
    placeHouseItem,
    resetSave,
    resolveEvent,
    resolveRival,
    resolveWarStrike,
    rivalSurrender,
    rivalTruce,
    rivalWarAttack,
    rivalWarSurge,
    setCustomization,
    setNarratorKey,
    startPartnerGoal,
    state,
    takeTerritory,
    upgradeHouse,
  } = useGame()

  const [characterOpen, setCharacterOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [achievementsOpen, setAchievementsOpen] = useState(false)
  const [cityMapOpen, setCityMapOpen] = useState(false)
  const [gangsOpen, setGangsOpen] = useState(false)

  const dangerOverlayRef = useRef<HTMLDivElement>(null)
  const rivalFlashRef = useRef<HTMLDivElement>(null)
  const shakeRootRef = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    playPageIntro(shakeRootRef.current)
  }, [])

  useEffect(() => {
    if (state.dangerPulseNonce === 0) return
    playDangerFeedback(dangerOverlayRef.current, shakeRootRef.current)
  }, [state.dangerPulseNonce])

  useEffect(() => {
    if (state.rivalWarningNonce === 0) return
    playRivalWarning(dangerOverlayRef.current, shakeRootRef.current)
  }, [state.rivalWarningNonce])

  useEffect(() => {
    if (state.rivalAttackFlashNonce === 0) return
    playRivalAttackFlash(rivalFlashRef.current)
  }, [state.rivalAttackFlashNonce])

  useEffect(() => {
    if (state.rivalRevengeNonce === 0) return
    playRivalRevengeDramatic(dangerOverlayRef.current, shakeRootRef.current)
  }, [state.rivalRevengeNonce])

  useEffect(() => {
    if (state.heatWarningSfxNonce === 0) return
    queueMicrotask(() => playHeatWarningSfx())
  }, [state.heatWarningSfxNonce])

  useEffect(() => {
    if (state.heatCrackdownNonce === 0) return
    playDangerFeedback(dangerOverlayRef.current, shakeRootRef.current)
    playRivalAttackFlash(rivalFlashRef.current)
    queueMicrotask(() => playHeatCrackdownSfx())
  }, [state.heatCrackdownNonce])

  const girlfriendModalLifeId =
    state.pendingLifeEventId && isBlockingLifeEventId(state.pendingLifeEventId)
      ? state.pendingLifeEventId
      : null
  const meetConvoDef = girlfriendModalLifeId ? getLifeEventDefById(girlfriendModalLifeId) : null
  const meetConvo = meetConvoDef?.meetConvo
  const blockingStreetModalId =
    state.pendingEventId && isBlockingStreetEventId(state.pendingEventId)
      ? state.pendingEventId
      : null
  const blockingEventModalId = girlfriendModalLifeId ?? blockingStreetModalId

  const minorLifeEventId =
    state.pendingLifeEventId && !isBlockingLifeEventId(state.pendingLifeEventId)
      ? state.pendingLifeEventId
      : null
  const embeddedStreetId = state.pendingMinorStreetEventId
  const embeddedEventId =
    !isGameplayModalBlocking(state) && !state.pendingRivalEncounter
      ? (minorLifeEventId ?? embeddedStreetId ?? null)
      : null

  return (
    <div className="app-layout">
      <aside className="app-layout__ad app-layout__ad--left" aria-label="Advertisement">
        <AdSenseSideSlot variant="left" />
      </aside>
      <div className="app-layout__game">
        <div className={`app app--stack app--theme-${state.characterTheme}`}>
          <Suspense fallback={null}>
            <StreetBackground state={state} empireVisualKey={empireVisualRebuildKey(state)} />
          </Suspense>
          <div ref={dangerOverlayRef} className="danger-feedback-overlay" aria-hidden />
          <div ref={rivalFlashRef} className="rival-flash-overlay" aria-hidden />
          <div ref={shakeRootRef} className="app__ui">
            <AppReleaseBar
              onOpenSettings={() => setSettingsOpen(true)}
              inlineHud={
                <>
                  <button
                    type="button"
                    className="city-map-hud-btn"
                    onClick={() => setCityMapOpen(true)}
                    aria-label="Open city map — wards and takeovers"
                    title="City map — hover wards, click to attempt takeover"
                  >
                    <span className="city-map-hud-btn__icon" aria-hidden>
                      ◎
                    </span>
                    <span className="city-map-hud-btn__label">Map</span>
                  </button>
                  <button
                    type="button"
                    className="gangs-hud-btn"
                    onClick={() => setGangsOpen(true)}
                    aria-label="Open gangs roster — crews, leaders, relationships"
                    title="Gangs — leaders, relationship, crew power, elimination"
                  >
                    <span className="gangs-hud-btn__icon" aria-hidden>
                      ★
                    </span>
                    <span className="gangs-hud-btn__label">Gangs</span>
                  </button>
                  <button
                    type="button"
                    className="achievement-hud-btn"
                    onClick={() => setAchievementsOpen(true)}
                    aria-label="Open achievements list"
                  >
                    <AchievementHud state={state} />
                  </button>
                </>
              }
            />
            {state.achievementToastQueue.length > 0 ? (
              <div className="achievement-zone" aria-live="polite">
                <div className="achievement-toast-stack">
                  {state.achievementToastQueue.slice(0, 2).map((id, i) => (
                    <AchievementToast
                      key={`${id}-${i}`}
                      achievementId={id}
                      stackIndex={i}
                      deferAutoDismiss={i > 0}
                      onDismiss={i === 0 ? dismissAchievementToast : () => {}}
                    />
                  ))}
                </div>
              </div>
            ) : null}
            <div className="app__main">
              <header className="app__header">
                <div className="app__left">
                  <LeftSidebarAccordion
                    state={state}
                    onAvatarClick={() => setCharacterOpen(true)}
                    onUpgradeHouse={upgradeHouse}
                    onSocial={lifeSocial}
                    onMarry={marry}
                    onPrestigeChild={lifePrestigeChild}
                    onPrestigeSolo={lifePrestigeSolo}
                    onBuyHouseItem={buyHouseItem}
                    onPlaceHouseItem={placeHouseItem}
                    onOpenRevenge={openRevenge}
                    onRivalWarAttack={rivalWarAttack}
                    onRivalWarSurge={rivalWarSurge}
                    onRivalSurrender={rivalSurrender}
                    onRivalTruce={rivalTruce}
                    onHeatLaunder={heatLaunder}
                    onStartPartnerGoal={startPartnerGoal}
                  />
                </div>
                <MainClicker
                  state={state}
                  onClick={click}
                  embeddedEventId={embeddedEventId}
                  onResolveEmbeddedEvent={resolveEvent}
                />
                <UpgradePanel
                  state={state}
                  onBuyRecruit={buyRecruit}
                  onBuyBusiness={buyBusiness}
                  onBuyShopUpgrade={buyShopUpgrade}
                  onNarratorKey={setNarratorKey}
                />
              </header>
              <NarratorBar line={state.narratorLine} />
            </div>
            <AppReleaseFooter />
            {state.pendingWarStrike ? (
              <WarStrikeModal
                strike={state.pendingWarStrike}
                rivals={state.rivals}
                playerPower={state.power}
                onResolve={resolveWarStrike}
              />
            ) : state.pendingRivalEncounter ? (
              <RivalModal
                encounter={state.pendingRivalEncounter}
                rivals={state.rivals}
                onResolve={resolveRival}
              />
            ) : girlfriendModalLifeId && meetConvo ? (
              <MeetGirlfriendModal content={meetConvo} onComplete={completeMeetGirlfriend} />
            ) : (
              <EventModal eventId={blockingEventModalId} state={state} onResolve={resolveEvent} />
            )}
            {state.eventOutcomeBanner ? (
              <div className="event-outcome-layer" aria-live="polite">
                <EventOutcomeBanner
                  banner={state.eventOutcomeBanner}
                  onDismiss={dismissOutcomeBanner}
                />
              </div>
            ) : null}
            <CharacterModal
              open={characterOpen}
              onClose={() => setCharacterOpen(false)}
              characterLook={state.characterLook}
              characterTheme={state.characterTheme}
              playerName={state.playerName}
              onPatchLook={(patch) => setCustomization({ characterLook: patch })}
              onSetTheme={(id) => setCustomization({ characterTheme: id })}
              onSetPlayerName={(name) => setCustomization({ playerName: name })}
            />
            <SettingsModal
              open={settingsOpen}
              onClose={() => setSettingsOpen(false)}
              state={state}
              onResetSave={resetSave}
              onApplyImport={applyImportedState}
            />
            <AchievementsModal
              open={achievementsOpen}
              onClose={() => setAchievementsOpen(false)}
              state={state}
            />
            <CityMapModal
              open={cityMapOpen}
              onClose={() => setCityMapOpen(false)}
              state={state}
              onTakeTerritory={takeTerritory}
            />
            <GangsModal
              open={gangsOpen}
              onClose={() => setGangsOpen(false)}
              state={state}
              onBeginEliminationWar={beginEliminationWarFromMap}
            />
          </div>
        </div>
      </div>
      <aside className="app-layout__ad app-layout__ad--right" aria-label="Advertisement">
        <AdSenseSideSlot variant="right" />
      </aside>
    </div>
  )
}

export default App
