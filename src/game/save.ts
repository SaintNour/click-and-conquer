import type { GameState } from '../data/types'
import { createInitialState } from './initialState'
import { SAVE_KEY } from './constants'
import { applyOfflineCatchup } from './offlineCatchup'
import { hydrateFromParsedSave } from './saveHydrate'

export {
  hydrateFromParsedSave,
  encodeSaveExport,
  decodeSaveImport,
  SAVE_EXPORT_PREFIX,
} from './saveHydrate'

export function loadGame(): GameState {
  try {
    const raw = localStorage.getItem(SAVE_KEY)
    let out: GameState
    if (!raw) out = applyOfflineCatchup(createInitialState())
    else {
      const parsed = JSON.parse(raw) as unknown
      const h = hydrateFromParsedSave(parsed)
      out = h ? applyOfflineCatchup(h) : applyOfflineCatchup(createInitialState())
    }
    saveGame(out)
    return out
  } catch {
    const out = applyOfflineCatchup(createInitialState())
    saveGame(out)
    return out
  }
}

export function saveGame(state: GameState): void {
  try {
    const payload: GameState = {
      ...state,
      lastSessionEndedAtMs: Date.now(),
      achievementToastQueue: state.achievementToastQueue.slice(0, 12),
      avatarReactionKind: null,
    }
    localStorage.setItem(SAVE_KEY, JSON.stringify(payload))
  } catch {
    /* ignore quota */
  }
}

/** Remove only this game's save key (not all of localStorage). */
export function clearSaveFromStorage(): void {
  try {
    localStorage.removeItem(SAVE_KEY)
  } catch {
    /* ignore */
  }
}
