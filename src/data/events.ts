import type { RandomEventDef } from './types'

export const RANDOM_EVENTS: RandomEventDef[] = [
  {
    id: 'auditor',
    title: 'Friendly Auditor',
    body: 'A person in a cheap suit claims they can "smooth" your paperwork for a modest fee. Their smile does not reach their eyes.',
    choices: [
      {
        id: 'pay',
        label: 'Pay them off ($500)',
        moneyDelta: -500,
        narratorId: 'event_auditor_pay',
      },
      {
        id: 'bluff',
        label: 'Bluff with confidence',
        powerDelta: -5,
        narratorId: 'event_auditor_bluff',
      },
      {
        id: 'walk',
        label: 'Walk away slowly',
        narratorId: 'event_auditor_walk',
      },
    ],
  },
  {
    id: 'tip',
    title: 'Loose Lips',
    body: 'Someone whispers a rumor about a rival stash. It might be true. It might be a trap. Welcome to entrepreneurship.',
    choices: [
      {
        id: 'buy',
        label: 'Buy the tip ($300)',
        moneyDelta: -300,
        powerDelta: 15,
        narratorId: 'event_tip_buy',
      },
      {
        id: 'ignore',
        label: 'Ignore it',
        narratorId: 'event_tip_ignore',
      },
      {
        id: 'egg_whisper',
        label: 'Whisper a fake address — art, not advice',
        powerDelta: -2,
        happinessDelta: 2,
        narratorId: 'event_tip_egg_whisper',
      },
    ],
  },
  {
    id: 'rain',
    title: 'Sudden Downpour',
    body: 'The sky opens up. Your corner looks miserable. Tourists scatter. Opportunity knocks, but it is soaking wet.',
    choices: [
      {
        id: 'umbrellas',
        label: 'Sell umbrellas (net +$250 after costs)',
        moneyDelta: 250,
        narratorId: 'event_rain_umbrellas',
      },
      {
        id: 'sulk',
        label: 'Sulk professionally',
        passiveBonusDelta: 0.02,
        narratorId: 'event_rain_sulk',
      },
    ],
  },
  {
    id: 'influencer',
    title: 'Influencer Offer',
    body: 'A creator wants to film "a day in the life" of your operation. Exposure is on the table. So is chaos.',
    choices: [
      {
        id: 'yes',
        label: 'Say yes (+money, -power)',
        moneyDelta: 600,
        powerDelta: -20,
        narratorId: 'event_influencer_yes',
      },
      {
        id: 'no',
        label: 'Hard no',
        narratorId: 'event_influencer_no',
      },
    ],
  },
]
