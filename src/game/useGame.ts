import { useCallback, useEffect, useRef, useState } from 'react'
import { playClickSfx, playPurchaseSfx, primeGameAudio } from '../audio/gameSfx'
import type { CharacterLook, CharacterThemeId, EventChoiceDef, GameState } from '../data/types'
import { createInitialState } from './initialState'
import { applyOfflineCatchup } from './offlineCatchup'
import { clearSaveFromStorage, loadGame, saveGame } from './save'
import { shiftAchievementToastQueue } from './achievementsEngine'
import {
  applyClick,
  applyEventChoice,
  applyTick,
  completeMeetGirlfriendConvo,
  dismissEventOutcome,
  lifePrestigeChild,
  lifePrestigeSolo,
  lifeSocial,
  marry,
  openRevengeModal,
  placeHouseItem,
  resolveRivalEncounter,
  resolveWarStrikeAction,
  rivalSurrender,
  rivalTruce,
  rivalWarAttack,
  rivalWarSurge,
  setCharacterCustomization,
  startPartnerGoal,
  tryBeginEliminationWar,
  tryBuyBusiness,
  tryBuyHouseItem,
  tryBuyRecruit,
  tryBuyShopUpgrade,
  tryHeatLaunder,
  tryTakeTerritory,
  updateNarrator,
  upgradeHouse,
  type LifeSocialAction,
  type RivalChoiceId,
} from './gameLogic'

export function useGame() {
  const [state, setState] = useState<GameState>(() => loadGame())
  const stateRef = useRef(state)
  const clickStreakRef = useRef(0)

  useEffect(() => {
    stateRef.current = state
  }, [state])

  useEffect(() => {
    const id = window.setInterval(() => {
      setState((s) => applyTick(s))
    }, 1000)
    return () => window.clearInterval(id)
  }, [])

  useEffect(() => {
    const id = window.setInterval(() => {
      saveGame(stateRef.current)
    }, 10_000)
    return () => window.clearInterval(id)
  }, [])

  useEffect(() => {
    const persist = () => saveGame(stateRef.current)
    const onVis = () => {
      if (document.visibilityState === 'hidden') persist()
    }
    window.addEventListener('pagehide', persist)
    document.addEventListener('visibilitychange', onVis)
    return () => {
      window.removeEventListener('pagehide', persist)
      document.removeEventListener('visibilitychange', onVis)
    }
  }, [])

  const click = useCallback(() => {
    primeGameAudio()
    queueMicrotask(() => playClickSfx())
    setState((s) => {
      let next = applyClick(s)
      clickStreakRef.current += 1
      if (clickStreakRef.current % 22 === 0) {
        next = updateNarrator(next, 'click')
      }
      return next
    })
  }, [])

  const buyRecruit = useCallback((id: string, qty: number = 1) => {
    setState((s) => {
      const next = tryBuyRecruit(s, id, qty)
      if (next !== s) queueMicrotask(() => playPurchaseSfx())
      return next
    })
  }, [])

  const buyBusiness = useCallback((id: string, qty: number = 1) => {
    setState((s) => {
      const next = tryBuyBusiness(s, id, qty)
      if (next !== s) queueMicrotask(() => playPurchaseSfx())
      return next
    })
  }, [])

  const buyShopUpgrade = useCallback((id: string) => {
    setState((s) => {
      const next = tryBuyShopUpgrade(s, id)
      if (next !== s) queueMicrotask(() => playPurchaseSfx())
      return next
    })
  }, [])

  const takeTerritory = useCallback((id: string) => {
    setState((s) => {
      const next = tryTakeTerritory(s, id)
      if (next !== s) queueMicrotask(() => playPurchaseSfx())
      return next
    })
  }, [])

  const resolveEvent = useCallback((eventId: string, choice: EventChoiceDef) => {
    setState((s) => applyEventChoice(s, eventId, choice))
  }, [])

  const setNarratorKey = useCallback((key: string) => {
    setState((s) => updateNarrator(s, key))
  }, [])

  const dismissAchievementToast = useCallback(() => {
    setState((s) => shiftAchievementToastQueue(s))
  }, [])

  const resolveRival = useCallback((choice: RivalChoiceId) => {
    setState((s) => resolveRivalEncounter(s, choice))
  }, [])

  const openRevenge = useCallback(() => {
    setState((s) => openRevengeModal(s))
  }, [])

  const upgradeHouseCb = useCallback(() => {
    setState((s) => {
      const next = upgradeHouse(s)
      if (next !== s) queueMicrotask(() => playPurchaseSfx())
      return next
    })
  }, [])

  const lifeSocialCb = useCallback((action: LifeSocialAction) => {
    setState((s) => lifeSocial(s, action))
  }, [])

  const marryCb = useCallback(() => {
    setState((s) => marry(s))
  }, [])

  const prestigeChildCb = useCallback(() => {
    setState((s) => lifePrestigeChild(s))
  }, [])

  const prestigeSoloCb = useCallback(() => {
    setState((s) => lifePrestigeSolo(s))
  }, [])

  const completeMeetGirlfriend = useCallback(
    (payload: { correctCount: number; pickedEggSmile: boolean }) => {
      setState((s) => completeMeetGirlfriendConvo(s, payload))
    },
    [],
  )

  const dismissOutcomeBanner = useCallback(() => {
    setState((s) => dismissEventOutcome(s))
  }, [])

  const buyHouseItem = useCallback((itemId: string) => {
    setState((s) => {
      const next = tryBuyHouseItem(s, itemId)
      if (next !== s) queueMicrotask(() => playPurchaseSfx())
      return next
    })
  }, [])

  const placeHouseItemCb = useCallback((slotKey: string, itemId: string | null) => {
    setState((s) => placeHouseItem(s, slotKey, itemId))
  }, [])

  const setCustomization = useCallback(
    (patch: {
      characterLook?: Partial<CharacterLook>
      characterTheme?: CharacterThemeId
      playerName?: string
    }) => {
      setState((s) => setCharacterCustomization(s, patch))
    },
    [],
  )

  const rivalWarAttackCb = useCallback((rivalId: string) => {
    setState((s) => {
      const next = rivalWarAttack(s, rivalId)
      if (next !== s) queueMicrotask(() => playPurchaseSfx())
      return next
    })
  }, [])

  const rivalWarSurgeCb = useCallback((rivalId: string) => {
    setState((s) => {
      const next = rivalWarSurge(s, rivalId)
      if (next !== s) queueMicrotask(() => playPurchaseSfx())
      return next
    })
  }, [])

  const rivalSurrenderCb = useCallback((rivalId: string) => {
    setState((s) => rivalSurrender(s, rivalId))
  }, [])

  const rivalTruceCb = useCallback((rivalId: string) => {
    setState((s) => {
      const next = rivalTruce(s, rivalId)
      if (next !== s) queueMicrotask(() => playPurchaseSfx())
      return next
    })
  }, [])

  const beginEliminationWarFromMap = useCallback((rivalId: string) => {
    setState((s) => {
      const next = tryBeginEliminationWar(s, rivalId)
      if (next !== s) queueMicrotask(() => playPurchaseSfx())
      return next
    })
  }, [])

  const resolveWarStrikeCb = useCallback((choice: 'defend' | 'take_hit') => {
    setState((s) => {
      const next = resolveWarStrikeAction(s, choice)
      if (next !== s && choice === 'defend') queueMicrotask(() => playPurchaseSfx())
      return next
    })
  }, [])

  const heatLaunder = useCallback(() => {
    setState((s) => {
      const next = tryHeatLaunder(s)
      if (next !== s) queueMicrotask(() => playPurchaseSfx())
      return next
    })
  }, [])

  const startPartnerGoalCb = useCallback(() => {
    setState((s) => startPartnerGoal(s))
  }, [])

  const resetSave = useCallback(() => {
    clearSaveFromStorage()
    const fresh = createInitialState()
    setState(fresh)
    saveGame(fresh)
  }, [])

  const applyImportedState = useCallback((game: GameState) => {
    const next = applyOfflineCatchup(game)
    setState(next)
    saveGame(next)
  }, [])

  return {
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
    lifePrestigeChild: prestigeChildCb,
    lifePrestigeSolo: prestigeSoloCb,
    lifeSocial: lifeSocialCb,
    marry: marryCb,
    openRevenge,
    placeHouseItem: placeHouseItemCb,
    resetSave,
    resolveEvent,
    resolveRival,
    resolveWarStrike: resolveWarStrikeCb,
    rivalSurrender: rivalSurrenderCb,
    rivalTruce: rivalTruceCb,
    rivalWarAttack: rivalWarAttackCb,
    rivalWarSurge: rivalWarSurgeCb,
    setCustomization,
    setNarratorKey,
    startPartnerGoal: startPartnerGoalCb,
    state,
    takeTerritory,
    upgradeHouse: upgradeHouseCb,
  }
}
