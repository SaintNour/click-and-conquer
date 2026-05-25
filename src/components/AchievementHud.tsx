import type { GameState } from '../data/types'
import { ACHIEVEMENTS } from '../data/achievements'
import { unlockedAchievementCount } from '../game/achievementsEngine'

type Props = {
  state: GameState
}

export function AchievementHud({ state }: Props) {
  const u = unlockedAchievementCount(state)
  const total = ACHIEVEMENTS.length
  const pct = total > 0 ? Math.round((u / total) * 100) : 0
  return (
    <div
      className="achievement-hud"
      title={`Achievements: ${u} / ${total} (includes hidden)`}
      role="group"
      aria-label={`Achievements ${u} of ${total}`}
    >
      <span className="achievement-hud__icon" aria-hidden>
        ★
      </span>
      <div className="achievement-hud__body">
        <div className="achievement-hud__row">
          <span className="achievement-hud__count">
            {u}/{total}
          </span>
          <span className="achievement-hud__pct">{pct}%</span>
        </div>
        <div className="achievement-hud__track" aria-hidden>
          <div className="achievement-hud__track-fill" style={{ width: `${pct}%` }} />
        </div>
      </div>
    </div>
  )
}
