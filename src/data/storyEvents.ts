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
        label: 'Pay {{money}} for the tip (60% good lead)',
        scaledMoneyCost: { fractionOfWealth: 0.0022, floor: 60, cap: 26_000 },
        successChance: 0.6,
        successOutcome: {
          narratorId: 'story_informant_pay_ok',
          resultTitle: 'Lead pans out',
          resultDetail: 'You paid, they talked, and the money moved in your direction.',
          scaledMoneyDelta: { fraction: 0.0075, floor: 110, cap: 90_000 },
          lifeBranchFlagsSet: ['bought_whispers'],
        },
        failureOutcome: {
          narratorId: 'story_informant_pay_fail',
          resultTitle: 'Bad intel',
          resultDetail: 'The tip was vapor. You eat the cost and your pride.',
          scaledMoneyDelta: { fraction: -0.0028, floor: 45, cap: 26_000 },
        },
      },
      {
        id: 'ignore',
        label: 'Ignore the whisper',
        narratorId: 'story_informant_ignore',
        resultTitle: 'No deal',
        resultDetail: 'You walked. Paranoia files that under “maybe later.”',
      },
      {
        id: 'threaten',
        label: 'Threaten answers (risky)',
        scaledPowerCost: { fractionOfPower: 0.02, floor: 5, cap: 300 },
        successChance: 0.45,
        successOutcome: {
          narratorId: 'story_informant_threat_ok',
          resultTitle: 'Fear works',
          resultDetail: 'They stammer out something useful. Morally gray, financially fine.',
          scaledMoneyDelta: { fraction: 0.0045, floor: 60, cap: 50_000 },
          scaledPowerDelta: { fraction: 0.008, floor: 3, cap: 320 },
          lifeBranchFlagsSet: ['feared_rep'],
        },
        failureOutcome: {
          narratorId: 'story_informant_threat_fail',
          resultTitle: 'Wrong audience',
          resultDetail: 'They bolt. You look loud. You feel expensive.',
          scaledMoneyDelta: { fraction: -0.002, floor: 30, cap: 18_000 },
          scaledPowerDelta: { fraction: -0.025, floor: 9, cap: 700 },
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
        label: 'Buy the crate ({{money}}) — 55% clean',
        scaledMoneyCost: { fractionOfWealth: 0.0048, floor: 130, cap: 55_000 },
        successChance: 0.55,
        successOutcome: {
          narratorId: 'story_alley_buy_ok',
          resultTitle: 'Clean score',
          resultDetail: 'Contents resell fast. Your spreadsheet smiles—briefly.',
          scaledMoneyDelta: { fraction: 0.011, floor: 190, cap: 160_000 },
        },
        failureOutcome: {
          narratorId: 'story_alley_buy_fail',
          resultTitle: 'Hot garbage',
          resultDetail: 'It was mostly packing peanuts and regret.',
          scaledMoneyDelta: { fraction: -0.002, floor: 30, cap: 16_000 },
          scaledPowerDelta: { fraction: -0.01, floor: 4, cap: 400 },
        },
      },
      {
        id: 'walk',
        label: 'Walk away',
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
        scaledPowerCost: { fractionOfPower: 0.028, floor: 8, cap: 420 },
        successChance: 0.4,
        successOutcome: {
          narratorId: 'story_wire_ok',
          resultTitle: 'Sparks pay',
          resultDetail: 'It worked. You will not explain how. Ever.',
          scaledMoneyDelta: { fraction: 0.009, floor: 150, cap: 120_000 },
          scaledPowerDelta: { fraction: 0.016, floor: 6, cap: 560 },
        },
        failureOutcome: {
          narratorId: 'story_wire_fail',
          resultTitle: 'Sparks bite',
          resultDetail: 'A short circuit in your plans—and your shoes.',
          scaledMoneyDelta: { fraction: -0.0025, floor: 38, cap: 22_000 },
          scaledPowerDelta: { fraction: -0.032, floor: 12, cap: 950 },
        },
      },
      {
        id: 'nope',
        label: 'Hard no',
        narratorId: 'story_wire_nope',
        resultTitle: 'Declined',
        resultDetail: 'You chose survival statistics over curiosity.',
      },
    ],
  },
]
