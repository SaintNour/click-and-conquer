import type { PendingWarStrike, RivalState } from '../data/rivalTypes'

type Props = {
  strike: PendingWarStrike
  rivals: Record<string, RivalState>
  playerPower: number
  onResolve: (choice: 'defend' | 'take_hit') => void
}

/**
 * Reactive popup for an incoming rival war strike. The rival has decided to move
 * on the player's line — the player must choose to spend power to defend, or
 * take the hit on their war HP.
 */
export function WarStrikeModal({ strike, rivals, playerPower, onResolve }: Props) {
  const rival = rivals[strike.rivalId]
  const name = rival?.name ?? 'A rival crew'
  const canDefend = playerPower >= Math.min(1, strike.defendPowerCost)
  const fullyDefend = playerPower >= strike.defendPowerCost

  return (
    <div
      className="modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="war-strike-title"
    >
      <div className="modal modal--rival modal--war-strike">
        <h2 id="war-strike-title" className="modal__title">
          Incoming strike
        </h2>
        <p className="modal__body">
          <strong>{name}</strong> is moving on you right now. Their crew is in position. Decide fast
          — they aren't waiting.
        </p>
        <ul className="rival-modal__stats">
          <li>
            Incoming damage: <strong>−{strike.incomingDamage} HP</strong> to your war line
          </li>
          <li>
            Defend cost: <strong>{strike.defendPowerCost.toLocaleString()}</strong> power
            {!fullyDefend && playerPower > 0 ? (
              <span className="war-strike-modal__warn"> · short on power, partial block</span>
            ) : null}
          </li>
        </ul>
        <div className="modal__choices">
          <button
            type="button"
            className="modal__choice modal__choice--primary"
            disabled={!canDefend}
            onClick={() => onResolve('defend')}
          >
            Defend ({strike.defendPowerCost.toLocaleString()}⚡)
          </button>
          <button
            type="button"
            className="modal__choice modal__choice--danger"
            onClick={() => onResolve('take_hit')}
          >
            Take the hit (−{strike.incomingDamage} HP)
          </button>
        </div>
      </div>
    </div>
  )
}
