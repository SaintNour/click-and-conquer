import type { EventLogEntry, GameState, OutcomeStatDeltas } from '../data/types'

export type { OutcomeStatDeltas } from '../data/types'

export type OutcomeBannerCore = {
  title: string
  detail: string
  fromLifeEvent?: boolean
  homeDefenseHighlight?: string
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

function deltasBetween(before: GameState, after: GameState): OutcomeStatDeltas {
  return {
    money: after.money - before.money,
    power: after.power - before.power,
    heat: after.heat - before.heat,
    passiveScale: after.passiveScale - before.passiveScale,
  }
}

/** Merge stat deltas + prepend event log (max 5). */
export function attachOutcomeBanner(
  before: GameState,
  after: GameState,
  banner: OutcomeBannerCore,
): GameState {
  const statDeltas = deltasBetween(before, after)
  const logEntry: EventLogEntry = {
    tick: after.tickCount,
    title: banner.title,
    detail: banner.detail,
    money: statDeltas.money,
    power: statDeltas.power,
    heat: statDeltas.heat,
    passive: statDeltas.passiveScale,
  }
  const prevLog = after.eventLog ?? before.eventLog ?? []
  const eventLog = [logEntry, ...prevLog].slice(0, 5)
  return {
    ...after,
    eventOutcomeBanner: { ...banner, statDeltas },
    eventLog,
  }
}
