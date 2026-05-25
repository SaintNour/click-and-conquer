import type { RandomEventDef } from './types'

/** Weighted random outcomes; merged into street event pool (low pick rate in gameLogic). */
export const STORY_EVENTS: RandomEventDef[] = [
  {
    id: 'story_shady_informant',
    title: 'Shady Informant',
    body: 'A whisper in your ear offers “premium intel.” The price is cash up front. The truth is negotiable.',
    choices: [
      {
        id: 'pay',
        label: 'Pay $300 for the tip (60% good lead)',
        costMoney: 300,
        successChance: 0.6,
        successOutcome: {
          narratorId: 'story_informant_pay_ok',
          resultTitle: 'Lead pans out',
          resultDetail: 'You paid, they talked, and the money moved in your direction.',
          moneyDelta: 780,
        },
        failureOutcome: {
          narratorId: 'story_informant_pay_fail',
          resultTitle: 'Bad intel',
          resultDetail: 'The tip was vapor. You eat the cost and your pride.',
          moneyDelta: -320,
        },
      },
      {
        id: 'ignore',
        label: 'Ignore the whisper',
        moneyDelta: 0,
        narratorId: 'story_informant_ignore',
        resultTitle: 'No deal',
        resultDetail: 'You walked. Paranoia files that under “maybe later.”',
      },
      {
        id: 'threaten',
        label: 'Threaten answers (risky)',
        costPower: 12,
        successChance: 0.45,
        successOutcome: {
          narratorId: 'story_informant_threat_ok',
          resultTitle: 'Fear works',
          resultDetail: 'They stammer out something useful. Morally gray, financially fine.',
          moneyDelta: 420,
          powerDelta: 6,
        },
        failureOutcome: {
          narratorId: 'story_informant_threat_fail',
          resultTitle: 'Wrong audience',
          resultDetail: 'They bolt. You look loud. You feel expensive.',
          moneyDelta: -180,
          powerDelta: -22,
        },
      },
    ],
  },
  {
    id: 'story_back_alley',
    title: 'Back Alley Deal',
    body: 'A crate appears where crates should not appear. No receipt, no witnesses—just appetite.',
    choices: [
      {
        id: 'buy',
        label: 'Buy the crate ($650) — 55% clean',
        costMoney: 650,
        successChance: 0.55,
        successOutcome: {
          narratorId: 'story_alley_buy_ok',
          resultTitle: 'Clean score',
          resultDetail: 'Contents resell fast. Your spreadsheet smiles—briefly.',
          moneyDelta: 1400,
        },
        failureOutcome: {
          narratorId: 'story_alley_buy_fail',
          resultTitle: 'Hot garbage',
          resultDetail: 'It was mostly packing peanuts and regret.',
          moneyDelta: -200,
          powerDelta: -8,
        },
      },
      {
        id: 'walk',
        label: 'Walk away',
        moneyDelta: 0,
        narratorId: 'story_alley_walk',
        resultTitle: 'Discipline',
        resultDetail: 'You chose oxygen over adrenaline. Boring. Healthy.',
      },
    ],
  },
  {
    id: 'story_leaky_wire',
    title: 'Leaky Wire',
    body: 'Someone offers a “small favor” that involves electricity and poor life choices.',
    choices: [
      {
        id: 'assist',
        label: 'Assist carefully (40% bonus)',
        costPower: 18,
        successChance: 0.4,
        successOutcome: {
          narratorId: 'story_wire_ok',
          resultTitle: 'Sparks pay',
          resultDetail: 'It worked. You will not explain how. Ever.',
          moneyDelta: 1100,
          powerDelta: 14,
        },
        failureOutcome: {
          narratorId: 'story_wire_fail',
          resultTitle: 'Sparks bite',
          resultDetail: 'A short circuit in your plans—and your shoes.',
          moneyDelta: -260,
          powerDelta: -30,
        },
      },
      {
        id: 'nope',
        label: 'Hard no',
        moneyDelta: 0,
        narratorId: 'story_wire_nope',
        resultTitle: 'Declined',
        resultDetail: 'You chose survival statistics over curiosity.',
      },
    ],
  },
]
