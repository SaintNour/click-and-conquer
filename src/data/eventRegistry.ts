import { RANDOM_EVENTS } from './events'
import { RIVAL_EVENTS } from './rivalEvents'
import { STORY_EVENTS } from './storyEvents'
import type { RandomEventDef } from './types'

const STREET_EVENTS: RandomEventDef[] = [...RANDOM_EVENTS, ...STORY_EVENTS, ...RIVAL_EVENTS]

export function getStreetEventDef(eventId: string): RandomEventDef | undefined {
  return STREET_EVENTS.find((e) => e.id === eventId)
}
