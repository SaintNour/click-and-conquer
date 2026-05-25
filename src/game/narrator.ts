import type { CharacterThemeId } from '../data/types'
import type { GameState } from '../data/types'

type LineEntry = string | ((state: GameState) => string)

/** Optional per-theme wording; falls back to base `LINES`. */
const THEME_LINE: Partial<Record<string, Partial<Record<CharacterThemeId, LineEntry>>>> = {
  welcome: {
    street: () =>
      'Another day, another questionable life choice. Try not to trip over your ambition—it is lying right there on the floor.',
    business: () =>
      'Morning metrics say you are still breathing. Evening street says you are still in play. Cute contradiction.',
    hacker: () =>
      'Session started. Logs enabled. Deniability disabled. Try not to trip over your own stack trace.',
    elite: () =>
      'Quiet shoes, loud ledger. The city still clocks you—just uses better fonts when it whispers.',
  },
  click: {
    street: () => 'Tap tap tap. If noise could pay rent, you would be a landlord by now.',
    business: () =>
      'Click throughput up. Morale unmeasured. HR would be proud if HR existed out here.',
    hacker: () =>
      'Input registered. RNG smirks. Keep feeding the grind—entropy loves a regular customer.',
    elite: () =>
      'Another tap, another micro-decision. Small moves, expensive habits—exactly your brand.',
  },
  territory_success: {
    street: () => 'You planted a flag. It is cheap plastic, but symbolism counts in this economy.',
    business: () =>
      'Acquisition closed—turf edition. The spreadsheet nods; the block files you under leverage.',
    hacker: () =>
      'Territory write succeeded. Permissions escalated. The map just learned your handle.',
    elite: () =>
      'You expanded the footprint quietly. Power likes whispers until it needs a headline.',
  },
  /** Composed after capture when new business fronts unlock; base line often includes territory_success. */
  territory_unlock_business: {
    street: () =>
      'Turf secured—and a new line of business just opened on your spreadsheet. The block approves the paperwork.',
    business: () =>
      'Acquisition closed. A new asset class appeared on your operating model without a committee vote.',
    hacker: () =>
      'Territory commit merged. Side-channel: fresh business nodes are now addressable in your build.',
    elite: () =>
      'Quiet expansion, loud implications—another revenue line now fits your letterhead.',
  },

  territory_fail: {
    street: () =>
      'That takeover did not take. Maybe try intimidation that does not sound like a podcast.',
    business: () =>
      'Due diligence: failed. Morale: bruised. Try fewer buzzwords and more bruises next time.',
    hacker: () => 'Push rejected. Roll back your ego patch and try again with cleaner opsec.',
    elite: () =>
      'The move looked elegant on paper. The street still prefers receipts over posture.',
  },
  save: {
    street: () => 'Progress saved. The universe remains unimpressed, but your disk is happy.',
    business: () =>
      'Checkpoint stored. Risk committee unavailable—assume you are still the CFO of chaos.',
    hacker: () =>
      'State serialized. If corruption happens, blame cosmic rays—not your life choices.',
    elite: () =>
      'Progress tucked away discreetly. Discretion is a currency—you just minted a coin.',
  },
}

export const DEFAULT_NARRATOR_LINE =
  'Another day, another questionable life choice. Try not to trip over your ambition—it is lying right there on the floor.'

const LINES: Record<string, string | ((state: GameState) => string)> = {
  welcome: () => DEFAULT_NARRATOR_LINE,

  click: () => 'Tap tap tap. If noise could pay rent, you would be a landlord by now.',

  buy_recruit: () =>
    'You hired help. Bold. Hope they do not notice your business plan is mostly vibes.',

  buy_business: () =>
    'Congratulations: you now own paperwork with your name on it. The city shrugs.',

  buy_shop_upgrade: () =>
    'You bought an upgrade that is not a person. The universe nods—slowly, like it means it.',

  buy_house_item: () =>
    'You dragged taste into your HQ. It is still yours—even when the city disagrees.',

  shop_purchase_major: () =>
    'That was not a tweak—that was a detour through a richer tax bracket. Feel the curve bend.',

  shop_purchase_legendary: () =>
    'You did not buy an upgrade. You bought a headline. Numbers just apologized for doubting you.',

  shop_unlock_new: () => 'A new lever appeared on your desk. It is unlabeled. Perfect.',

  shop_unlock_notable: () =>
    'Fresh paperwork: another multiplier is on the menu. Try not to grin—it is unprofessional.',

  shop_unlock_spike: () =>
    'Something big just unlocked. Not metaphorically—your spreadsheet can hear it breathing.',

  progress_business_pulse: () =>
    'Your fronts are deep enough that the crew actually listens. Hidden efficiency hums.',

  progress_business_surge: () =>
    'Business footprint crosses a line—recruits ride the slipstream whether they know it or not.',

  progress_runner_muscle: () =>
    'Runners are everywhere now—muscle stops swinging blind. Synergy stops being a buzzword.',

  progress_runner_flood: () =>
    'The streets are loud with runners; your heavy hands finally get decent intel.',

  progress_power_climb: () =>
    'Power stopped being theoretical. You can feel the next tier of nonsense approaching.',

  progress_power_break: () =>
    'You crossed a power band where the city recalculates you. Momentum notices.',

  progress_momentum_shift: () =>
    'This is a new phase: not grind—gravity. Everything heavier lifts a little faster.',

  achievement_economy: () => 'Money is starting to talk. It is rude, but fluent.',

  achievement_power: () =>
    'You are getting dangerous. The block files that under “long-term problem.”',

  achievement_units: () =>
    'Your roster thickens. Loyalty is still negotiable, but headcount is not.',

  achievement_businesses: () => 'Fronts multiply. Paperwork becomes a personality trait.',

  achievement_territories: () => 'Territory tastes like plastic flags and real leverage.',

  achievement_rivals: () => 'Someone else’s crew just learned you do math with knuckles.',

  achievement_special: () => 'A milestone, allegedly. The city pretends it does not care—it does.',

  achievement_hidden_unlock: () =>
    '…I did not expect that. Neither did your spreadsheet. Enjoy the secret shame of success.',

  territory_fail: () =>
    'That takeover did not take. Maybe try intimidation that does not sound like a podcast.',

  territory_success: () =>
    'You planted a flag. It is cheap plastic, but symbolism counts in this economy.',

  title_promotion: (s) =>
    `Your nameplate just outgrew its ego: ${s.title}. The city updates the file whether you asked or not.`,

  save: () => 'Progress saved. The universe remains unimpressed, but your disk is happy.',

  event_auditor_pay: 'You paid for peace of mind. It arrives in 5–10 business emotions.',

  event_auditor_bluff: 'You stared down bureaucracy with sheer audacity. It blinked first. Barely.',

  event_auditor_walk:
    'You left. Sometimes dignity is just strategic cowardice with better branding.',

  event_tip_buy: 'Intel acquired. Whether it is useful is a problem for future-you. Poor soul.',

  event_tip_ignore: 'You ignored the rumor. Your paranoia files that under "missed opportunity."',

  event_tip_egg_whisper: 'You fed them fiction with a straight face. Artistry has a body count.',

  event_rain_umbrellas: 'You monetized misery. Capitalism sends a wet high-five.',

  event_rain_sulk:
    'You chose sulking. Passive income loves a good sulk—it is basically your brand.',

  event_influencer_yes: 'You traded muscle for clout. The algorithm smiles. Your crew does not.',

  event_influencer_no: 'You declined fame. The internet will forget you in roughly twelve seconds.',

  idle: (s) =>
    `Still broke? Power at ${Math.floor(s.power)}. Money at $${Math.floor(s.money)}. The narrator believes in you—sarcastically.`,

  danger_a: () => 'Heads up: something down the block just remembered you exist. Act casual.',

  danger_b: () => 'A siren dopplers past—probably unrelated. Probably.',

  danger_c: () => 'The street feels a degree thinner. Could be wind. Could be consequences.',

  danger_d: () => 'Word travels fast in this zip code. None of it is ever flattering.',

  danger_e: () => 'That quiet? Not peace. It is the city deciding what to charge you next.',

  rival_warning: () =>
    'You are getting attention now—the kind that invoices you in favors and fear.',

  rival_attack: () => 'Heads up: someone with a grudge just remembered your address.',

  rival_loss: () => 'That stung. File it under “lesson with interest.”',

  rival_attack_repelled: () =>
    'You held the line. Applause is for movies—out here, silence means survival.',

  rival_payoff: () => 'You bought breathing room. The meter is still running—just slower.',

  rival_ignore_ok: () => 'Sometimes luck is indifference wearing a trench coat. Take the win.',

  rival_revenge: () => 'Now it is personal. The street loves a sequel.',

  rival_revenge_fail: () =>
    'You swung for the fences. They brought a net. Embarrassing—and expensive.',

  rival_revenge_walk: () => 'You waited. Pride sulks in the corner, but your ribs stay intact.',

  rival_evt_scouts_intel_ok: () =>
    'Intel that actually lands? Rare. Your paranoia just got promoted to strategy.',

  rival_evt_scouts_intel_fail: () => 'You paid for theater. The actors took a bow and your wallet.',

  rival_evt_scouts_muscle_ok: () =>
    'Muscle with posture beats muscle with volume. The block noticed.',

  rival_evt_scouts_muscle_fail: () =>
    'Your crew went loud. Phones ate the story. You paid in narrative tax.',

  rival_evt_scouts_ignore: () => 'You looked away. Denial is free—until it is not.',

  rival_evt_prot_pay: () => 'You paid the toll. Dignity winces, but the door stays shut.',

  rival_evt_prot_refuse: () =>
    'You refused extortion like it owes you money. Respect—and consequences.',

  rival_evt_prot_threat_ok: () =>
    'You stared them down and they blinked. Enjoy it—it does not age well.',

  rival_evt_prot_threat_fail: () =>
    'They called your bluff, then charged admission. Pride is a luxury item.',

  rival_evt_bribe_inv_ok: () => 'You found the leak. Uncomfortable truth beats comfortable lies.',

  rival_evt_bribe_inv_fail: () => 'Your investigation wandered into a scam. Scams tip well.',

  rival_evt_bribe_ex_ok: () => 'Fear as policy. Cruel, efficient, and weirdly popular.',

  rival_evt_bribe_ex_fail: () => 'You made an example of the wrong noun. Crowds remember cruelty.',

  rival_evt_bribe_slide: () =>
    'You swallowed doubt. It sits heavy—like a second stomach for bad decisions.',

  rival_evt_ambush_ok: () => 'You hit the convoy and the ego. Both leaked.',

  rival_evt_ambush_fail: () =>
    'Ambush became lesson: they were ready, you were loud, math stayed honest.',

  rival_evt_ambush_intel_ok: () => 'Patience bought angles. Angles buy wins.',

  rival_evt_ambush_intel_fail: () => 'Intel arrived late with interest. The window slammed shut.',

  rival_evt_ambush_pass: () => 'You passed. Opportunity shrugs and walks away whistling.',

  rival_evt_dirty_absorb: () => 'You ate the loss quietly. Pride is on a diet anyway.',

  rival_evt_dirty_ret_ok: () => 'You hit their money line. Machines remember—and bill.',

  rival_evt_dirty_ret_fail: () => 'Retaliation tax: steep, public, and annoyingly fair.',

  rival_evt_dirty_fix_ok: () => 'Money greased it. For a minute, the gears pretend to like you.',

  rival_evt_dirty_fix_fail: () => 'The fixer fixed you. Middlemen love a two-sided receipt.',

  rival_evt_rumor_pay_ok: () => 'You bought a thread. Pull slow—blood stains.',

  rival_evt_rumor_pay_fail: () => 'That “intel” was fanfiction with a price tag.',

  rival_evt_rumor_ignore: () => 'You ignored the bait. Smart—or lucky. Hard to tell from here.',

  rival_evt_rumor_scout_ok: () =>
    'Your scouts saw something real. Whether it matters is tomorrow’s fight.',

  rival_evt_rumor_scout_fail: () => 'They saw your eyes first. Amateur hour loves a spotlight.',

  rival_evt_revenge_ok: () => 'You hit back like the week owed you interest. They felt it.',

  rival_evt_revenge_fail: () => 'Revenge is a solo—your band showed up late and out of tune.',

  rival_evt_revenge_wait: () => 'You waited. Cold patience is its own kind of threat.',

  rival_home_van_ok: () =>
    'The van suddenly remembers it has somewhere else to be—not your curb, not your nerves. Small mercies, big attitude.',

  rival_home_van_fail: () =>
    'They watched you do panic choreography. Standing ovation from the wrong audience.',

  rival_home_van_intel_ok: () =>
    'Plates stop being noise and start being receipts. Finally—paranoia with a spreadsheet.',

  rival_home_van_intel_fail: () =>
    'You bought a headline that said “van.” Journalism is dead; your wallet helped bury it.',

  rival_home_van_ignore: () =>
    'You looked away like the problem would take the hint. It did not—it took notes.',

  rival_home_breakin_ok: () =>
    'Your threshold kept its word. Their knuckles learned a new vocabulary: not tonight.',

  rival_home_breakin_fail: () =>
    'Something crossed a line—glass, pride, or both. Home stopped feeling like a secret.',

  rival_home_breakin_bar_ok: () =>
    'IKEA became doctrine: heavy, loud, and morally unimpeachable when someone tries the knob.',

  rival_home_breakin_bar_fail: () =>
    'You paid for speed. Speed showed up after the scene wrapped—classic billing.',

  rival_home_watch_ok: () =>
    'You flipped the lens. Being watched is a hobby until you make it a job interview.',

  rival_home_watch_fail: () =>
    'They ghosted your tail and left you holding the tab—confidence tax, due now.',

  rival_home_watch_show: () =>
    'You stepped out like you owned the sidewalk. Heat clocked it. So did every phone.',

  rival_home_guard_ok: () => 'Corridors got boring again—the best compliment security can earn.',

  rival_home_guard_fail: () =>
    'Your sweep collided with someone else’s movie. You still bought popcorn.',

  rival_home_guard_log: () => 'Paper feels adult until the street reads it aloud with teeth.',

  rival_home_dm_ok: () =>
    'You refused to be their prop. Props belong on stages—you live behind a door.',

  rival_home_dm_fail: () =>
    'They wanted a flinch. You gave them a trailer. They saved the whole season.',

  rival_home_dm_frame_ok: () =>
    'Menace became marketing. Gross, yes—but your brand just got sharper teeth.',

  rival_home_dm_frame_fail: () =>
    'Clever picked a fight with cruel. Cruel does cardio and owns the ref.',

  rival_home_revenge_unlock: () =>
    'They did not attack “the game”—they attacked your roof. The street just approved a sequel with your name in the title.',

  life_move_apartment: () =>
    'Four walls and a door that locks. It is not glamour · it is oxygen. You breathe easier anyway.',

  life_early_loose_take: () =>
    'You pocket the windfall. The street pretends it did not see · this time.',

  life_early_loose_leave: () =>
    'You leave it. Small kindnesses compound in places spreadsheets cannot read.',

  life_early_beggar_give: () =>
    'Cash leaves your hand on purpose. Goodwill is a volatile asset. Today it paid a dividend.',

  life_early_beggar_pass: () =>
    'You apologize and keep walking. No drama · just another face in the blur.',

  life_early_boxes_help: () =>
    'You grunt, lift, and earn a nod. Reputation is just muscle memory with witnesses.',

  life_early_boxes_pass: () => 'You keep your pace. The door stays heavy for someone else.',

  life_tier2_tip_pay: () =>
    'You buy the whisper. Half of it is noise · half is leverage. You will sort it later.',

  life_tier2_tip_pass: () => 'You keep the cash and the mystery. Curiosity files a complaint.',

  life_gang_war_declare: () =>
    'You named the beef. One crew owns your attention now · the Rival War tab is live until this line ends.',

  life_gang_war_slide: () =>
    'You ghosted the moment. No crown, no cross · the block forgets faster than it forgives.',

  life_gang_war_redirect: () =>
    'You bought chaos a new address. Your name leaves the group chat · for now.',

  life_gang_rumor_spy: () =>
    'You paid for eyes. Now wait and see what stares back through the slats.',

  life_gang_rumor_prepare: () =>
    'You sharpen the crew and shore the doors. The first hit should meet sandbags, not your ribs.',

  life_gang_rumor_ignore: () =>
    'You act unbothered. The street files that under cocky · and bills it later with interest.',

  life_gang_spy_win: () =>
    'The spy whispers a name. You see their table before they pull a chair out for you.',

  life_gang_spy_fail: () =>
    'Coins bought chatter, not proof. You are still guessing in the dark · with receipts.',

  life_gang_prepare: () => 'Training counted. When they move first, your line is already braced.',

  life_gang_ignore: () =>
    'Silence looked brave until the math arrived. The next surprise bite lands twice as hard.',

  life_gang_demand_placeholder: () =>
    'You answer the message · in ink, sweat, or a bruise. The ledger moves either way.',

  life_gang_tribute_paid: () =>
    'Cash leaves your pocket; breath returns to your calendar · for now.',

  life_gang_power_tribute: () =>
    'You hand over leverage. They grin like wolves who just got fed on schedule.',

  life_gang_cede_turf: () =>
    'A pin drops off your map. Pride stings less than an open war · barely.',

  life_gang_cede_none: () => 'They wanted dirt you do not own. The moment folds back into threat.',

  life_gang_prepare_war: () =>
    'No more tribute talk · this is tempo and sirens. War goes hot on your terms.',

  life_gang_strike_first: () =>
    'You swing before the sermon ends. Heat spikes · so does respect, maybe.',

  life_meet_convo_fail: () =>
    'She tips an imaginary hat and melts into the crowd. Not every chapter starts on page one.',

  life_meet_convo_win_low: () =>
    'Two good beats and a stumble still opened the door. The bond is real · just a little thinner at the edges.',

  life_meet_convo_win_high: () =>
    'Three for three. Chemistry did the paperwork · the Life tab just got heavier in a good way.',

  rival_war_first_strike_blocked: () =>
    'Their first swing meets air—you braced for it. Good. Now make them pay for the rehearsal.',

  life_meet_flirt_path: () =>
    'You kept it human sized · no instant “we.” The Life tab might grow a thread from this, slow and small.',

  life_meet_vibe_hit: () => 'The vibe landed. Compatibility nudged up; labels did not.',

  life_meet_vibe_miss: () => 'Timing missed. No tragedy · just a smaller chapter than you hoped.',

  life_meet_professional: () => 'You steered it to business. Safe · and the spark stays unspent.',

  life_meet_walk: () => 'You vanished back into the noise. The street shrugs; doors stay unopened.',

  life_meet_egg_smile:
    'Silence became a weapon. They blinked first. The city writes fanfiction about moments like this.',

  life_early_loose_egg: 'You tipped fate back a few bucks. Karma does bookkeeping in pencil.',

  life_early_boxes_egg:
    'You caught the wrong train on purpose. Nobody saw the dodge · everybody felt it.',

  life_meet_talk: () =>
    'You opened a door you cannot price-tag. The story starts here · messy, human, yours.',

  life_meet_ignore: () =>
    'You looked through them. The street files that under “later,” and later is expensive.',

  life_meet_dismiss: () => 'You cut the moment off. Safety is a feeling, not a guarantee.',

  life_house_upgrade: () =>
    'You upgraded the roof over your head. The street notices · quietly, like a tabloid.',

  life_age_year: (s) =>
    `The calendar steals another page · you are ${s.age} now. The city does not clap; it just updates its file on you.`,

  life_date: () => 'You went on a date. Romance is just scheduling with better lighting.',

  life_gift: () =>
    'You gave a gift. Capitalism would call it “customer retention.” You call it hope.',

  life_ignore: () => 'You ignored them. Silence is a currency · volatile, but spendable.',

  life_marry: () =>
    'You married. Paperwork now includes feelings. Congratulations · and condolences.',

  life_breakup: () =>
    'They walked. The street keeps your secrets, but it does not keep your warmth. Grieve fast · money still moves.',

  rival_war_hit: () => 'You hit their line. They stagger—then remember your address.',

  rival_war_eliminated: () =>
    'That face is done—but bloodlines do billing. A successor already texts the crew chat.',

  rival_war_collapse: () =>
    'Your line broke. Turf slips through your fingers while you rebuild your nerve.',

  rival_war_hit_taken: () =>
    'You took it on the chin. The line buckled but held. Make them regret leaving you breathing.',

  rival_war_broken: () =>
    'Their power pool just snapped. The crew still swings, but the muscle behind it is gone — push or call truce.',

  rival_war_surge: () =>
    'You burned a stockpile on one move. The street felt it. They are blinking now.',

  rival_war_surrender: () =>
    'You folded. The tribute hurts—pride hurts more. Mark the name. Revenge starts cold.',

  rival_war_truce: () =>
    'Broken crews talk on their knees. They pay, you walk—line stands down with your name on the receipt.',

  rival_war_territory_open: () =>
    'You moved on their corner. The block heard it before the sirens did — keep swinging until they fold.',

  rival_war_territory_won: () =>
    'Their flag came down on that turf. They will remember the day; you should remember the receipts.',

  rival_war_territory_lost: () =>
    'They beat you back at the line. The corner stays theirs, and your next push pays more.',

  rival_elimination_war_start: () =>
    'No corners left to hide behind—just you and a nemesis with nothing to lose. Finish it.',

  life_prestige_child: () =>
    'A new generation inherits your chaos. The grind resets · your legend does not.',

  life_prestige_solo: () => 'You rebuild alone. Smaller spark, same stubborn fire.',

  life_event_text_warm: () => 'You replied warm. The phone exhales like it was holding its breath.',

  life_event_text_emoji: () => 'You sent an emoji. Poetry for people who fear paragraphs.',

  life_event_text_mute: () => 'You muted the night. Tomorrow will ask rude questions.',

  life_event_dinner_charm: () => 'You charmed the table. Forks paused. Judgment blinked.',

  life_event_dinner_deflect: () => 'You deflected with humor. Truth took the night off · paid.',

  life_event_dinner_honest: () => 'You were honest. The room learned a new temperature.',

  life_event_jealousy_reassure: () =>
    'You reassured out loud. Jealousy shrank · did not disappear, just dressed better.',

  life_event_jealousy_joke: () =>
    'You laughed it off. Danger sulked in the corner like a kicked cat.',

  life_event_jealousy_cold: () => 'You went cold. Love files that under “pending review.”',

  life_side_bet_win: () =>
    'The ticket cleared. The block pretends it does not keep score · but you just saw the receipt.',

  life_side_bet_lose: () =>
    'The ticket lied. You paid for a lesson in odds · still cheaper than pride.',

  life_side_bet_walk: () =>
    'You kept your cash and your pace. The bookie shrugs · another face, another night.',

  life_health_care: () =>
    'You bought rest like it is inventory. The mirror thanks you in smaller sighs.',

  life_health_skip: () => 'You ran on fumes. The calendar applauds · your body files a complaint.',

  life_press_donate: () =>
    'You bought shine for a good headline. The empire gets a softer edge · for a price.',

  life_press_decline: () => 'You declined with polish. Cameras sulk · gossip fills the gap.',

  life_clone_cease: () =>
    'Paperwork and posture did the talking. Copycats blink first when the bill arrives.',

  life_clone_ignore: () =>
    'You let them choke on their own echo. Noise is not the same as leverage.',

  life_tab_tip_pay: () => 'You bought quiet. The bar remembers favors longer than fights.',

  life_tab_tip_charm: () =>
    'You smiled your way out of the invoice. It worked · until the next round.',

  life_tab_tip_walk: () =>
    'You left the glass half full and the story half told. Curiosity follows you home.',

  life_date_surprise_fund: () =>
    'You funded the rescue. Flowers and timing arrive like muscle memory.',

  life_date_surprise_wing: () =>
    'You winged it. Chaos laughed · your partner rolled their eyes with love mixed in.',

  life_date_surprise_honest: () =>
    'You told the truth about the calendar. Respect landed softer than roses, but it landed.',

  territory_first_claim: () =>
    'The map updates quietly. Crews treat this pin like it always belonged in your file.',

  heat_launder_ok: () => 'Paper trails and polite fiction bought the block a quieter night.',

  life_karma_repair: () =>
    'You paid the rumor tax. Pride files a receipt and the block updates your tone.',

  life_karma_own: () =>
    'You leaned into the cold read. The street respects consistency, even when it is rude.',

  life_rooftop_buy: () => 'You bought blur. Algorithms move on when the wallet clears its throat.',

  life_rooftop_lean: () => 'You fed the myth oxygen. Fame is noisy; leverage is quieter.',

  life_table_wine: () =>
    'Wine and wire transfers turned interrogation into theater. The table exhales.',

  life_table_deflect: () => 'You laughed the edge off. Truth took a smoke break outside.',

  story_informant_pay_ok: () => 'The intel was real enough to spend. Luck likes invoices.',

  story_informant_pay_fail: () => 'You bought smoke. Expensive smoke. Very on-brand.',

  story_informant_ignore: () => 'You ignored the whisper. Paranoia takes notes anyway.',

  story_informant_threat_ok: () => 'Fear cleared the lane. Ethics took the stairs.',

  story_informant_threat_fail: () => 'You flexed at the wrong mirror. It flexed back.',

  story_alley_buy_ok: () => 'The crate delivered. Your skepticism files an apology.',

  story_alley_buy_fail: () => 'You paid for a mystery box and got a tutorial in regret.',

  story_alley_walk: () => 'You walked. Boring wins more than it admits.',

  story_wire_ok: () => 'Sparks behaved. Physics pretends it did not notice.',

  story_wire_fail: () => 'Sparks misbehaved. Your shoes filed a complaint.',

  story_wire_nope: () => 'You declined chaos. Chaos respects boundaries—sometimes.',
}

/** Narrator keys used by passive danger ambience (random pick). */
export const DANGER_NARRATOR_KEYS = [
  'danger_a',
  'danger_b',
  'danger_c',
  'danger_d',
  'danger_e',
] as const

export function resolveNarratorLine(id: string, state: GameState, fallback?: string): string {
  const theme = state.characterTheme as CharacterThemeId
  const themed = THEME_LINE[id]?.[theme]
  if (themed !== undefined) {
    return typeof themed === 'function' ? themed(state) : themed
  }
  const entry = LINES[id]
  if (entry === undefined) {
    return fallback ?? DEFAULT_NARRATOR_LINE
  }
  return typeof entry === 'function' ? entry(state) : entry
}

export function setNarratorFromKey(state: GameState, key: string, fallback?: string): GameState {
  return {
    ...state,
    narratorLine: resolveNarratorLine(key, state, fallback),
    narratorEventKey: key,
  }
}
