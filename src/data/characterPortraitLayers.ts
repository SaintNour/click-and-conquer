/**
 * Render order for the stylized SVG portrait (back → front).
 * Offsets for hair/hat live on `CharacterLook` in `characterCustomization.ts`.
 */
export const PORTRAIT_LAYER_ORDER = [
  'background',
  'body',
  'shirt',
  'jacket',
  'neck',
  'head',
  'ears',
  'facialHair',
  'face',
  'glasses',
  'chain',
  'hair',
  'hat',
] as const

export type PortraitLayerId = (typeof PORTRAIT_LAYER_ORDER)[number]
