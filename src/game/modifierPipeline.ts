/**
 * Central export surface for cross-system modifiers (businesses, crew, territories,
 * home, life, heat, prestige). Composition happens in `compute.ts` and game tick loops.
 */
export { heatIncomeBonusMultiplier, heatRecruitPowerEfficiency } from './heatSynergy'
export {
  territoryEmpireSynergyMoneyMult,
  territoryEmpireSynergyPowerMult,
} from './synergyModifiers'
export {
  lifeHeatGainMultiplier,
  lifeMetaIncomeMult,
  lifeMetaPowerMult,
  lifeMoneyMultiplier,
  lifePowerMultiplier,
} from './lifeEngine'
export {
  adjustedHomeDefenseChance,
  getHomeDefenseProfile,
  homeDefenseScore,
  softenHomeFailureBundle,
} from './homeDefenseEngine'
