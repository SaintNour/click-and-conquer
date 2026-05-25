import type { PendingRivalEncounter, RivalState } from '../data/rivalTypes'
import type { RivalChoiceId } from '../game/rivalsEngine'

type Props = {
  encounter: PendingRivalEncounter
  rivals: Record<string, RivalState>
  onResolve: (choice: RivalChoiceId) => void
}

export function RivalModal({ encounter, rivals, onResolve }: Props) {
  const r = rivals[encounter.rivalId]
  const name = r?.name ?? 'Unknown crew'

  if (encounter.kind === 'revenge') {
    return (
      <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="rival-title">
        <div className="modal modal--rival modal--revenge">
          <h2 id="rival-title" className="modal__title">
            Revenge on {name}
          </h2>
          <p className="modal__body">
            Strike back hard. Costs power, pays in cash and pride. Walking away keeps your shoes
            clean—barely.
          </p>
          <ul className="rival-modal__stats">
            <li>
              Strike cost: <strong>{encounter.revengePowerCost}</strong> power
            </li>
            <li>
              On success: <strong>+${encounter.revengeRewardMoney.toLocaleString()}</strong> ·{' '}
              <strong>+{encounter.revengeRewardPower}</strong> power · small permanent income boost
            </li>
          </ul>
          <div className="modal__choices">
            <button
              type="button"
              className="modal__choice modal__choice--danger"
              onClick={() => onResolve('revenge_strike')}
            >
              Strike their operation ({encounter.revengePowerCost} power)
            </button>
            <button
              type="button"
              className="modal__choice"
              onClick={() => onResolve('revenge_walk')}
            >
              Walk away for now
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="rival-title">
      <div className="modal modal--rival">
        <h2 id="rival-title" className="modal__title">
          Street skirmish
        </h2>
        <p className="modal__body">
          <strong>{name}</strong> wants a quick shot at your operation—leverage, not a full block
          war.
        </p>
        <ul className="rival-modal__stats">
          <li>
            Defend: need <strong>{encounter.defendPowerCost}</strong> power (you spend ~15% holding
            them off). On success: skim about <strong>5%</strong> of your cash and power as street
            tax back from them.
          </li>
          <li>
            Pay off: <strong>${encounter.payMoneyCost.toLocaleString()}</strong>
          </li>
          <li>
            Ignore: <strong>{Math.round(encounter.ignoreFailChance * 100)}%</strong> chance you eat
            a ~5% loss on cash and power
          </li>
        </ul>
        <div className="modal__choices">
          <button type="button" className="modal__choice" onClick={() => onResolve('defend')}>
            Defend ({encounter.defendPowerCost} power)
          </button>
          <button type="button" className="modal__choice" onClick={() => onResolve('pay')}>
            Pay them off (${encounter.payMoneyCost.toLocaleString()})
          </button>
          <button
            type="button"
            className="modal__choice modal__choice--muted"
            onClick={() => onResolve('ignore')}
          >
            Ignore the threat
          </button>
        </div>
      </div>
    </div>
  )
}
