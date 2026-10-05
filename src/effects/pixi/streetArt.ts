import { Assets, Texture } from 'pixi.js'

/** Painted scene assets (public/scene2/*) — generated neon-noir art set. */
export type StreetArtKey =
  | 'skyline_far'
  | 'skyline_mid'
  | 'block_a'
  | 'block_b'
  | 'car_sedan'
  | 'car_patrol'
  | 'car_van'
  | 'ped_a1'
  | 'ped_a2'
  | 'ped_a3'
  | 'ped_b1'
  | 'ped_b2'
  | 'ped_b3'

const SPRITE_URLS: Record<StreetArtKey, string> = {
  skyline_far: '/scene2/skyline_far.png',
  skyline_mid: '/scene2/skyline_mid.png',
  block_a: '/scene2/block_a.png',
  block_b: '/scene2/block_b.png',
  car_sedan: '/scene2/car-sedan.png',
  car_patrol: '/scene2/car-patrol.png',
  car_van: '/scene2/car-van.png',
  ped_a1: '/scene2/ped_a1.png',
  ped_a2: '/scene2/ped_a2.png',
  ped_a3: '/scene2/ped_a3.png',
  ped_b1: '/scene2/ped_b1.png',
  ped_b2: '/scene2/ped_b2.png',
  ped_b3: '/scene2/ped_b3.png',
}

export const BUSINESS_SPRITE_URLS: Record<string, string> = {
  stall: '/scene2/bld-stall.png',
  laundry: '/scene2/bld-laundry.png',
  club: '/scene2/bld-club.png',
  tower: '/scene2/bld-tower.png',
  garage: '/scene2/bld-garage.png',
  warehouse: '/scene2/bld-warehouse.png',
  casino: '/scene2/bld-casino.png',
  logistics_hub: '/scene2/bld-logistics.png',
  skylot_plaza: '/scene2/bld-skylot.png',
  charter_row: '/scene2/bld-charter.png',
}

export const SKY_URL = '/scene2/sky_pano.jpg'

const loaded = new Map<string, Texture>()
let loadPromise: Promise<unknown> | null = null

/** Preload all painted textures once; resolves even on partial failure. */
export function loadSceneArt(): Promise<unknown> {
  if (!loadPromise) {
    const urls = [SKY_URL, ...Object.values(SPRITE_URLS), ...Object.values(BUSINESS_SPRITE_URLS)]
    loadPromise = Assets.load(urls)
      .then((map) => {
        for (const [url, tex] of Object.entries(map)) loaded.set(url, tex as Texture)
      })
      .catch(() => {
        // Partial load — whatever Assets cached is still usable via sceneTex().
      })
  }
  return loadPromise
}

export function streetTex(key: StreetArtKey): Texture | null {
  return loaded.get(SPRITE_URLS[key]) ?? null
}

export function businessTex(businessId: string): Texture | null {
  const url = BUSINESS_SPRITE_URLS[businessId]
  return url ? (loaded.get(url) ?? null) : null
}

export function skyTex(): Texture | null {
  return loaded.get(SKY_URL) ?? null
}
