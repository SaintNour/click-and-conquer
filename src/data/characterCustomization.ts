export type CharacterThemeId = 'street' | 'business' | 'hacker' | 'elite'

export const CHARACTER_THEMES: {
  id: CharacterThemeId
  label: string
  hint: string
}[] = [
  { id: 'street', label: 'Street', hint: 'Grime and grit' },
  { id: 'business', label: 'Business', hint: 'Suits and spreadsheets' },
  { id: 'hacker', label: 'Hacker', hint: 'Neon and noise' },
  { id: 'elite', label: 'Elite', hint: 'Quiet money' },
]

export type SkinToneId = 'porcelain' | 'fair' | 'tan' | 'brown' | 'deep'

export type HairStyleId = 'buzz' | 'short' | 'medium' | 'long' | 'fade' | 'slick'

export type FacialHairId = 'none' | 'stubble' | 'goatee' | 'beard' | 'mustache'

export type ShirtId = 'tee' | 'henley' | 'button' | 'tank' | 'turtleneck'

export type JacketId = 'none' | 'leather' | 'bomber' | 'suit' | 'hoodie' | 'trench'

/** Layered look for the stylized human portrait (crime-empire vibe). */
export type CharacterLook = {
  skinTone: SkinToneId
  hair: HairStyleId
  facialHair: FacialHairId
  shirt: ShirtId
  jacket: JacketId
  glasses: boolean
  chain: boolean
  hat: boolean
  /** SVG userSpace offset for hair layer (negative raises toward crown). */
  hairYOffset?: number
  hatYOffset?: number
}

export const DEFAULT_THEME: CharacterThemeId = 'street'

export const DEFAULT_CHARACTER_LOOK: CharacterLook = {
  skinTone: 'tan',
  hair: 'fade',
  facialHair: 'stubble',
  shirt: 'tee',
  jacket: 'none',
  glasses: false,
  chain: false,
  hat: false,
  hairYOffset: -2.5,
  hatYOffset: -1.5,
}

export const SKIN_TONE_OPTIONS: { id: SkinToneId; label: string; preview: string }[] = [
  { id: 'porcelain', label: 'Porcelain', preview: '#f0d4c4' },
  { id: 'fair', label: 'Fair', preview: '#e0b896' },
  { id: 'tan', label: 'Tan', preview: '#c9915e' },
  { id: 'brown', label: 'Brown', preview: '#8b5a3c' },
  { id: 'deep', label: 'Deep', preview: '#4a2c22' },
]

export const HAIR_OPTIONS: { id: HairStyleId; label: string }[] = [
  { id: 'buzz', label: 'Buzz' },
  { id: 'short', label: 'Short' },
  { id: 'medium', label: 'Medium' },
  { id: 'long', label: 'Long' },
  { id: 'fade', label: 'Fade' },
  { id: 'slick', label: 'Slick' },
]

export const FACIAL_HAIR_OPTIONS: { id: FacialHairId; label: string }[] = [
  { id: 'none', label: 'Clean' },
  { id: 'stubble', label: 'Stubble' },
  { id: 'mustache', label: 'Stache' },
  { id: 'goatee', label: 'Goatee' },
  { id: 'beard', label: 'Beard' },
]

export const SHIRT_OPTIONS: { id: ShirtId; label: string }[] = [
  { id: 'tee', label: 'Tee' },
  { id: 'tank', label: 'Tank' },
  { id: 'henley', label: 'Henley' },
  { id: 'button', label: 'Button-up' },
  { id: 'turtleneck', label: 'Turtleneck' },
]

export const JACKET_OPTIONS: { id: JacketId; label: string }[] = [
  { id: 'none', label: 'None' },
  { id: 'hoodie', label: 'Hoodie' },
  { id: 'bomber', label: 'Bomber' },
  { id: 'leather', label: 'Leather' },
  { id: 'trench', label: 'Trench' },
  { id: 'suit', label: 'Suit jacket' },
]

export function mergeCharacterLook(raw: unknown): CharacterLook {
  if (!raw || typeof raw !== 'object') return { ...DEFAULT_CHARACTER_LOOK }
  return { ...DEFAULT_CHARACTER_LOOK, ...(raw as Partial<CharacterLook>) }
}
