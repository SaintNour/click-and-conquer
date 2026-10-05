/** Centralized short hover help for major stats (tone: empire / street). */
export const TOOLTIPS = {
  money: 'Cash on hand. Spend it on crews, fronts, life, and heat control.',
  power: 'Street muscle and leverage. Needed to take turf and stare down rivals.',
  heat: 'Attention from your hustle and the street. Every manual Hustle click pushes the bar — click fast and it climbs fast; stop clicking and it bleeds off. Auto-hustle pays out without spiking it. At 100% the crackdown countdown starts: income and crew power are squeezed until it resolves, then you take a cash/power hit and a 60s debuff — police can raid one of your businesses and seize its income while you cool off. When heat is high enough, you can Launder heat in the left column: spend cash on a long cooldown to shave the bar down.',
  passiveScale:
    'Empire rhythm multiplier: grows from turf, crews, businesses, upgrades, HQ, and life meta — not from spamming Hustle. Events and heat can still shift it.',
  autoHustle:
    'Your crew keeps the Hustle warm: free automatic presses per second (scaled from total crew levels). Does not count toward click achievements.',
  streetLuck:
    'Random lucky streaks on the street — temporary bonus to all cash from Hustle and passive fronts. Like finding a dropped roll, except it is your roll.',
  life: 'Your personal life: mood, partner arc, and long-run stability.',
  affection:
    'How close you are romantically. Needs 80%+ to propose; neglect it and the arc can end.',
  loyalty: 'How solid the bond is when pressure hits.',
  happiness: 'Overall mood—life events and choices move this.',
  prestige: 'Reset most of this run for permanent legacy bonuses. First prestige takes a long run.',
  home: 'HQ tier and décor change defense, income, and how heat feels at home.',
  rivalWar:
    'Parallel crew war: spend power to Attack their line, or Defend to block the next hit on yours. If your line breaks, you lose turf and power.',
  grief: 'After a break-up, income and power take a short hit while you reset emotionally.',
  defense: 'How prepared your address is when rivals or threats target home.',
  territories: 'Turf you hold. More territory unlocks fronts and scales passive presence.',
  crew: 'People who passively generate power and back your moves.',
  businesses: 'Fronts that print passive money and scale your click.',
  rival: 'Other outfits sniffing your stack. Heat and choices draw their attention.',
  empireUpgrades: 'One-time empire tech. Unlocks from milestones; stacks for long runs.',
} as const

export type TooltipKey = keyof typeof TOOLTIPS
