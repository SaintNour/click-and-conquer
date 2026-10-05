import type { RandomEventDef } from './types'

export const RANDOM_EVENTS: RandomEventDef[] = [
  {
    id: 'auditor',
    title: 'Friendly Auditor',
    body: 'A person in a cheap suit claims they can "smooth" your paperwork for a modest fee. Their smile does not reach their eyes.',
    choices: [
      {
        id: 'pay',
        label: 'Pay them off ({{reward}})',
        scaledMoneyDelta: { fraction: -0.004, floor: 60, cap: 40_000 },
        narratorId: 'event_auditor_pay',
      },
      {
        id: 'bluff',
        label: 'Bluff with confidence',
        scaledPowerDelta: { fraction: -0.012, floor: 3, cap: 350 },
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
        label: 'Buy the tip ({{reward}}, {{preward}})',
        scaledMoneyDelta: { fraction: -0.0025, floor: 40, cap: 22_000 },
        scaledPowerDelta: { fraction: 0.015, floor: 6, cap: 600 },
        lifeBranchFlagsSet: ['bought_whispers'],
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
        scaledPowerDelta: { fraction: -0.004, floor: 2, cap: 200 },
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
        label: 'Sell umbrellas ({{reward}} after costs)',
        scaledMoneyDelta: { fraction: 0.0028, floor: 45, cap: 32_000 },
        narratorId: 'event_rain_umbrellas',
      },
      {
        id: 'sulk',
        label: 'Sulk professionally',
        passiveBonusDelta: 0.008,
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
        label: 'Say yes ({{reward}}, {{preward}})',
        scaledMoneyDelta: { fraction: 0.005, floor: 90, cap: 60_000 },
        scaledPowerDelta: { fraction: -0.02, floor: 8, cap: 800 },
        lifeBranchFlagsSet: ['public_face'],
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
