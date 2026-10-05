import { Assets, Texture } from 'pixi.js'

/**
 * Painted scene art for the street backdrop — chroma-keyed PNG sprites in
 * /public/scene/. Everything falls back to procedural Graphics drawing when a
 * texture is missing, so the scene never breaks on a failed fetch.
 */

export type SceneArtKey =
  | 'skyline_far'
  | 'skyline_mid'
  | 'car_street'
  | 'car_patrol'
  | 'sky_pano'

const SPRITE_URLS: Record<SceneArtKey, string> = {
  sky_pano: '/scene/sky_pano.jpg',
  skyline_far: '/scene/skyline_far.png',
  skyline_mid: '/scene/skyline_mid.png',
  car_street: '/scene/car-street.png',
  car_patrol: '/scene/car-patrol.png',
}

/** Business id -> painted building sprite url (all 10 businesses have art). */
export const BUSINESS_SPRITE_URLS: Record<string, string> = {
  stall: '/scene/bld-stall.png',
  laundry: '/scene/bld-laundry.png',
  club: '/scene/bld-club.png',
  tower: '/scene/bld-tower.png',
  garage: '/scene/bld-garage.png',
  warehouse: '/scene/bld-warehouse.png',
  casino: '/scene/bld-casino.png',
  logistics_hub: '/scene/bld-logistics.png',
  skylot_plaza: '/scene/bld-skylot.png',
  charter_row: '/scene/bld-charter.png',
}

const loaded = new Map<string, Texture>()
let loadPromise: Promise<void> | null = null

/** Preload every scene texture. Safe to call repeatedly — deduped. */
export function loadSceneArt(): Promise<void> {
  if (loadPromise) return loadPromise
  const urls = [...Object.values(SPRITE_URLS), ...Object.values(BUSINESS_SPRITE_URLS)]
  loadPromise = Assets.load(urls)
    .then((textures) => {
      for (const url of urls) {
        const t = textures[url]
        if (t) loaded.set(url, t)
      }
    })
    .catch(() => {
      // Keep whatever loaded; missing textures fall back to procedural art.
    })
  return loadPromise
}

export function sceneTex(key: SceneArtKey): Texture | null {
  return loaded.get(SPRITE_URLS[key]) ?? null
}

export function businessTex(businessId: string): Texture | null {
  const url = BUSINESS_SPRITE_URLS[businessId]
  return url ? (loaded.get(url) ?? null) : null
}
