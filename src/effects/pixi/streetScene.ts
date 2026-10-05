import { BlurFilter, Container, Graphics, Sprite, Texture, TilingSprite } from 'pixi.js'
import { BUSINESSES } from '../../data/businesses'
import type { EmpireSnapshot } from '../../game/visualMetrics'
import { businessTex, skyTex, streetTex } from './streetArt'

/**
 * Painted living-street scene (rebuilt from zero).
 *
 * Layers, back → front:
 *   sky (painted pano, slow drift)
 *   farSkyline / midSkyline (painted tiling strips, parallax)
 *   backStreet (ambient painted city block row — always present)
 *   searchlights (heat-driven sky beams)
 *   reflections (mirrored business sprites on wet asphalt)
 *   frontStreet (YOUR businesses as full-size painted buildings)
 *   road (asphalt band, lane marks, curb)
 *   cars (painted traffic + parked cruiser on heat/raid)
 *   people (painted pedestrians walking the sidewalk)
 *   rain (cycling drizzle → rain streaks)
 *   atmos (drifting fog + floating embers/dust)
 *   strobes (heat wash + raid tape + cop flashes)
 */

export type EmpireLayers = {
  sky: Container
  farSkyline: Container
  midSkyline: Container
  backStreet: Container
  searchlights: Container
  reflections: Container
  frontStreet: Container
  road: Container
  cars: Container
  people: Container
  rain: Container
  atmos: Container
  strobes: Container
}

type BldAnim = {
  id: string
  root: Container
  reflect: Sprite | null
  glow: Graphics | null
  phase: number
  neon: boolean
}

type CarAnim = {
  root: Container
  dir: 1 | -1
  speed: number
  patrol: boolean
  parked: boolean
  lightL?: Graphics
  lightR?: Graphics
}

type PedAnim = {
  root: Sprite
  dir: 1 | -1
  speed: number
  baseScale: number
  phase: number
}

type Beam = { g: Graphics; baseAngle: number; phase: number; speed: number }

type Drop = { x: number; y: number; len: number; spd: number }

type Ember = { x: number; y: number; r: number; vy: number; phase: number; warm: boolean }

export type EmpireRuntime = {
  t: number
  w: number
  h: number
  skySpr: Sprite | null
  farTile: TilingSprite | null
  midTile: TilingSprite | null
  backSegs: Sprite[]
  backSegW: number
  buildings: BldAnim[]
  cars: CarAnim[]
  peds: PedAnim[]
  beams: Beam[]
  drops: Drop[]
  rainG: Graphics | null
  embers: Ember[]
  emberG: Graphics | null
  fogs: { g: Graphics; speed: number }[]
  wash: Graphics | null
  raidId: string | null
  raidTape: Container[]
  strobeDots: { l: Graphics; r: Graphics } | null
}

export function createEmpireRuntime(): EmpireRuntime {
  return {
    t: 0,
    w: 0,
    h: 0,
    skySpr: null,
    farTile: null,
    midTile: null,
    backSegs: [],
    backSegW: 1,
    buildings: [],
    cars: [],
    peds: [],
    beams: [],
    drops: [],
    rainG: null,
    embers: [],
    emberG: null,
    fogs: [],
    wash: null,
    raidId: null,
    raidTape: [],
    strobeDots: null,
  }
}

export function createEmpireLayers(): EmpireLayers {
  return {
    sky: new Container(),
    farSkyline: new Container(),
    midSkyline: new Container(),
    backStreet: new Container(),
    searchlights: new Container(),
    reflections: new Container(),
    frontStreet: new Container(),
    road: new Container(),
    cars: new Container(),
    people: new Container(),
    rain: new Container(),
    atmos: new Container(),
    strobes: new Container(),
  }
}

export function mountEmpireLayers(stage: Container, layers: EmpireLayers): void {
  stage.addChild(
    layers.sky,
    layers.farSkyline,
    layers.midSkyline,
    layers.backStreet,
    layers.searchlights,
    layers.reflections,
    layers.frontStreet,
    layers.road,
    layers.cars,
    layers.people,
    layers.rain,
    layers.atmos,
    layers.strobes,
  )
}

/* ---------- layout ---------- */
const HORIZON = 0.34
const FAR_BASE = 0.47
const MID_BASE = 0.535
const BACK_BASE = 0.615
const FRONT_BASE = 0.685
const SIDEWALK_Y = 0.70
const ROAD_TOP = 0.71

const NEON_BLD = new Set(['club', 'casino'])
const GLOW_COLOR: Record<string, number> = {
  stall: 0xffb347,
  laundry: 0x35d0ff,
  club: 0xff2bd6,
  tower: 0x35d0ff,
  casino: 0xffc44d,
  skylot_plaza: 0x35d0ff,
  charter_row: 0x9fb4ff,
}

function clearChildren(c: Container) {
  c.removeChildren().forEach((ch) => ch.destroy({ children: true }))
}

function rand(seed: number) {
  let s = seed >>> 0
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 4294967296
  }
}

/* ---------- fallbacks (procedural, only when a texture is missing) ---------- */

function drawSkyFallback(g: Graphics, w: number, h: number) {
  const bands = 24
  for (let i = 0; i < bands; i++) {
    const t = i / (bands - 1)
    const r = Math.round(10 + t * 24)
    const gg = Math.round(6 + t * 10)
    const b = Math.round(30 + (1 - Math.abs(t - 0.6)) * 40)
    g.rect(0, (h * i) / bands, w, h / bands + 1).fill((r << 16) | (gg << 8) | b)
  }
  g.circle(w * 0.72, h * 0.16, h * 0.05).fill({ color: 0xe8ecff, alpha: 0.9 })
  const r2 = rand(7)
  for (let i = 0; i < 60; i++) {
    g.circle(r2() * w, r2() * h * HORIZON * 0.9, 1).fill({ color: 0xffffff, alpha: 0.25 + r2() * 0.4 })
  }
}

function drawSkylineFallback(g: Graphics, w: number, baseY: number, maxH: number, seed: number, lit: number) {
  const r = rand(seed)
  let x = -10
  while (x < w + 10) {
    const bw = 30 + r() * 80
    const bh = maxH * (0.35 + r() * 0.65)
    g.rect(x, baseY - bh, bw, bh).fill(0x0d1024)
    const cols = Math.floor(bw / 9)
    const rows = Math.floor(bh / 11)
    for (let cx = 0; cx < cols; cx++) {
      for (let cy = 0; cy < rows; cy++) {
        if (r() < lit) {
          g.rect(x + 3 + cx * 9, baseY - bh + 4 + cy * 11, 4, 5).fill({
            color: r() < 0.7 ? 0xffca7a : 0x7adfff,
            alpha: 0.8,
          })
        }
      }
    }
    x += bw + 2 + r() * 10
  }
}

function drawBldFallback(parent: Container, x: number, baseY: number, hgt: number, seed: number, accent: number) {
  const r = rand(seed)
  const g = new Graphics()
  const bw = hgt * (0.5 + r() * 0.3)
  g.rect(-bw / 2, -hgt, bw, hgt).fill(0x11142c)
  g.rect(-bw / 2, -hgt * 0.22, bw, hgt * 0.1).fill({ color: accent, alpha: 0.9 })
  for (let yy = 0.3; yy < 0.95; yy += 0.09) {
    for (let xx = -0.42; xx < 0.42; xx += 0.18) {
      if (r() < 0.55) g.rect(bw * xx, -hgt * yy, bw * 0.09, hgt * 0.05).fill({ color: 0xffca7a, alpha: 0.8 })
    }
  }
  g.x = x
  g.y = baseY
  parent.addChild(g)
}

/* ---------- rebuild ---------- */

export function rebuildEmpireScene(
  app: { screen: { width: number; height: number } },
  layers: EmpireLayers,
  snap: EmpireSnapshot,
  rt: EmpireRuntime,
) {
  const w = Math.max(1, app.screen.width)
  const h = Math.max(1, app.screen.height)
  rt.w = w
  rt.h = h
  rt.buildings = []
  rt.cars = []
  rt.peds = []
  rt.beams = []
  rt.backSegs = []
  rt.fogs = []
  rt.embers = []
  rt.raidTape = []
  rt.raidId = snap.raidedBusinessId
  rt.strobeDots = null

  for (const c of Object.values(layers)) clearChildren(c)

  /* ---- sky ---- */
  const sk = skyTex()
  if (sk) {
    const s = Math.max((w * 1.15) / sk.width, (h * 0.62) / sk.height)
    const spr = new Sprite(sk)
    spr.anchor.set(0.5)
    spr.scale.set(s)
    spr.x = w / 2
    spr.y = h * 0.3
    layers.sky.addChild(spr)
    rt.skySpr = spr
    // deep grade rect so the pano sits darker behind UI
    const shade = new Graphics()
    shade.rect(0, 0, w, h).fill({ color: 0x060818, alpha: 0.28 })
    layers.sky.addChild(shade)
  } else {
    const g = new Graphics()
    drawSkyFallback(g, w, h)
    layers.sky.addChild(g)
    rt.skySpr = null
  }

  /* ---- skyline strips ---- */
  const farT = streetTex('skyline_far')
  if (farT) {
    const targetH = Math.max(90, h * 0.17)
    const sc = targetH / farT.height
    const tile = new TilingSprite({ texture: farT, width: w + 260, height: targetH })
    tile.tileScale.set(sc, sc)
    tile.x = -130
    tile.y = h * FAR_BASE - targetH
    tile.alpha = 0.8
    tile.tint = 0x9aa2cc
    layers.farSkyline.addChild(tile)
    rt.farTile = tile
  } else {
    const g = new Graphics()
    drawSkylineFallback(g, w, h * FAR_BASE, h * 0.15, 11, 0.12)
    g.alpha = 0.8
    layers.farSkyline.addChild(g)
    rt.farTile = null
  }

  const midT = streetTex('skyline_mid')
  if (midT) {
    const targetH = Math.max(110, h * 0.22)
    const sc = targetH / midT.height
    const tile = new TilingSprite({ texture: midT, width: w + 260, height: targetH })
    tile.tileScale.set(sc, sc)
    tile.x = -130
    tile.y = h * MID_BASE - targetH
    tile.alpha = 0.92
    tile.tint = 0xb9b3e0
    layers.midSkyline.addChild(tile)
    rt.midTile = tile
  } else {
    const g = new Graphics()
    drawSkylineFallback(g, w, h * MID_BASE, h * 0.2, 23, 0.2)
    g.alpha = 0.9
    layers.midSkyline.addChild(g)
    rt.midTile = null
  }

  /* ---- ambient back street (always alive) ---- */
  const blockTexs = [streetTex('block_a'), streetTex('block_b')].filter((t): t is Texture => !!t)
  const backBaseY = h * BACK_BASE
  if (blockTexs.length) {
    const segH = Math.max(150, h * 0.34)
    const segW = segH * (blockTexs[0].width / blockTexs[0].height)
    const count = Math.ceil((w + 4 * segW) / segW)
    for (let k = 0; k < count; k++) {
      const tex = blockTexs[k % blockTexs.length]
      const spr = new Sprite(tex)
      spr.anchor.set(0, 1)
      spr.scale.set(segH / tex.height)
      spr.x = k * segW - 2 * segW
      spr.y = backBaseY
      spr.tint = 0xa99fd6
      spr.alpha = 0.92
      layers.backStreet.addChild(spr)
      rt.backSegs.push(spr)
    }
    rt.backSegW = segW
    // dark curb band separating back street from road
    const curb = new Graphics()
    curb.rect(0, backBaseY - h * 0.008, w, h * 0.016).fill({ color: 0x05060f, alpha: 0.85 })
    layers.backStreet.addChild(curb)
  } else {
    const g = new Graphics()
    drawSkylineFallback(g, w, backBaseY, h * 0.3, 41, 0.3)
    layers.backStreet.addChild(g)
    rt.backSegW = 1
  }

  /* ---- searchlight beams (drawn, visibility in tick) ---- */
  for (let b = 0; b < 2; b++) {
    const g = new Graphics()
    const px = b === 0 ? w * 0.12 : w * 0.88
    const len = h * 0.42
    // soft cone: several widening low-alpha wedges
    for (let s2 = 0; s2 < 6; s2++) {
      const t2 = s2 / 6
      const halfW = len * (0.045 + t2 * 0.075)
      const y0 = -len * t2
      const y1 = -len * (t2 + 1 / 6) - 1
      g.poly([-halfW * t2, y0, halfW * t2, y0, halfW * (t2 + 0.17), y1, -halfW * (t2 + 0.17), y1]).fill({
        color: 0xbfd9ff,
        alpha: 0.05,
      })
    }
    g.x = px
    g.y = backBaseY - h * 0.02
    g.blendMode = 'add'
    g.filters = [new BlurFilter({ strength: 10 })]
    layers.searchlights.addChild(g)
    rt.beams.push({ g, baseAngle: b === 0 ? 0.55 : -0.55, phase: b * 2.4, speed: 0.00045 + b * 0.00012 })
  }

  /* ---- front street: owned businesses ---- */
  const owned = BUSINESSES.filter((b) => (snap.businessLevels[b.id] ?? 0) > 0)
  const n = owned.length
  if (n > 0) {
    const baseY = h * FRONT_BASE
    const crowd = Math.max(0, n - 5)
    const bH = Math.max(h * 0.34, h * (0.52 - crowd * 0.035))
    const spread = w * 0.86
    const left = w * 0.07
    owned.forEach((biz, idx) => {
      const tex = businessTex(biz.id)
      const x = n === 1 ? w * 0.5 : left + (spread * idx) / Math.max(1, n - 1)
      const yBase = baseY - (idx % 2) * h * 0.012
      const root = new Container()
      root.x = x
      root.y = yBase

      const accent = GLOW_COLOR[biz.id] ?? 0x7b5cff
      let spr: Sprite | null = null
      if (tex) {
        spr = new Sprite(tex)
        spr.anchor.set(0.5, 1)
        const s = bH / tex.height
        spr.scale.set(idx % 3 === 1 ? -s : s, s)
        root.addChild(spr)
      } else {
        drawBldFallback(root, 0, 0, bH, idx * 31 + 5, accent)
      }

      // ground glow under your property — brighter with power
      const glow = new Graphics()
      const gw = bH * 0.55
      const ga = 0.10 + Math.min(0.12, snap.power * 0.0006)
      glow.ellipse(0, 0, gw, h * 0.018).fill({ color: accent, alpha: ga })
      root.addChild(glow)

      layers.frontStreet.addChild(root)

      // wet reflection — flipped faint copy below the feet line
      let reflect: Sprite | null = null
      if (spr) {
        reflect = new Sprite(spr.texture)
        reflect.anchor.set(0.5, 1)
        const rs = bH / spr.texture.height
        reflect.scale.set(spr.scale.x, -rs * 0.8)
        reflect.x = x
        reflect.y = yBase + h * 0.005
        reflect.alpha = 0.10
        reflect.tint = 0x8fa8ff
        layers.reflections.addChild(reflect)
      }

      // raid tape marker (hidden until raided)
      const tape = new Container()
      const tapeG = new Graphics()
      const bw = tex ? bH * (tex.width / tex.height) : bH * 0.6
      for (let s2 = 0; s2 < 10; s2++) {
        tapeG
          .poly([-bw / 2 + s2 * (bw / 5), -h * 0.028, -bw / 2 + s2 * (bw / 5) + bw / 10, -h * 0.028, -bw / 2 + s2 * (bw / 5) - bw / 20, -h * 0.01, -bw / 2 + s2 * (bw / 5) - bw / 20 - bw / 10, -h * 0.01])
          .fill(s2 % 2 === 0 ? 0xffd23f : 0x141414)
      }
      tapeG.x = x
      tapeG.y = yBase - h * 0.07
      tape.addChild(tapeG)
      const dotL = new Graphics()
      dotL.circle(-bw * 0.3, -h * 0.02, 4).fill(0xff3355)
      dotL.x = x
      dotL.y = yBase - h * 0.1
      const dotR = new Graphics()
      dotR.circle(bw * 0.3, -h * 0.02, 4).fill(0x3fa9ff)
      dotR.x = x
      dotR.y = yBase - h * 0.1
      tape.addChild(dotL, dotR)
      tape.visible = snap.raidedBusinessId === biz.id
      layers.strobes.addChild(tape)
      rt.raidTape.push(tape)
      if (snap.raidedBusinessId === biz.id) rt.strobeDots = { l: dotL, r: dotR }

      rt.buildings.push({
        id: biz.id,
        root,
        reflect,
        glow,
        phase: idx * 1.7,
        neon: NEON_BLD.has(biz.id),
      })
    })
  }

  /* ---- road ---- */
  const roadTop = h * ROAD_TOP
  const road = new Graphics()
  const bands = 14
  for (let i = 0; i < bands; i++) {
    const t = i / (bands - 1)
    const v = Math.round(14 - t * 9)
    road.rect(0, roadTop + ((h - roadTop) * i) / bands, w, (h - roadTop) / bands + 1).fill(
      (v << 16) | (v << 8) | Math.round(v + 6),
    )
  }
  // sidewalk strip + curb
  road.rect(0, h * (FRONT_BASE + 0.004), w, roadTop - h * (FRONT_BASE + 0.004)).fill(0x191a2e)
  road.rect(0, roadTop - h * 0.006, w, h * 0.006).fill({ color: 0x2c2e4d, alpha: 0.9 })
  // lane dashes
  const laneY = h * 0.85
  for (let x = 10; x < w; x += 64) {
    road.rect(x, laneY, 30, Math.max(2, h * 0.004)).fill({ color: 0x9aa3c8, alpha: 0.16 })
  }
  layers.road.addChild(road)

  /* ---- cars ---- */
  const carKinds: { key: 'car_sedan' | 'car_van' | 'car_patrol'; dir: 1 | -1; lane: number }[] = [
    { key: 'car_sedan', dir: -1, lane: h * 0.80 },
    { key: 'car_van', dir: 1, lane: h * 0.90 },
    { key: 'car_sedan', dir: -1, lane: h * 0.80 },
    { key: 'car_van', dir: 1, lane: h * 0.90 },
    { key: 'car_patrol', dir: -1, lane: h * 0.80 },
  ]
  const cr = rand(99)
  carKinds.forEach((ck, idx) => {
    const tex = streetTex(ck.key)
    const root = new Container()
    const cw = Math.max(70, w * (0.09 + cr() * 0.03))
    if (tex) {
      const spr = new Sprite(tex)
      spr.anchor.set(0.5, 1)
      const s = cw / tex.width
      spr.scale.set(ck.dir < 0 ? s : -s, s)
      root.addChild(spr)
    } else {
      const g = new Graphics()
      g.roundRect(-cw / 2, -cw * 0.22, cw, cw * 0.2, 6).fill(ck.key === 'car_patrol' ? 0x223 : 0x2a2d44)
      g.circle(-cw * 0.28, 0, cw * 0.06).fill(0x0a0a12)
      g.circle(cw * 0.28, 0, cw * 0.06).fill(0x0a0a12)
      root.addChild(g)
    }
    // headlight beam + taillight streak (additive)
    const beam = new Graphics()
    beam.poly([ck.dir * cw * 0.42, -cw * 0.1, ck.dir * cw * 0.42, -cw * 0.04, ck.dir * (cw * 0.42 + cw * 0.5), -cw * 0.02, ck.dir * (cw * 0.42 + cw * 0.5), -cw * 0.09]).fill({
      color: 0xfff3c8,
      alpha: 0.10,
    })
    beam.blendMode = 'add'
    root.addChild(beam)
    const streak = new Graphics()
    streak.rect(Math.min(-ck.dir * cw * 0.52, -ck.dir * (cw * 0.52 + cw * 0.35)), -cw * 0.09, cw * 0.35, cw * 0.02).fill({
      color: 0xff5560,
      alpha: 0.14,
    })
    streak.blendMode = 'add'
    root.addChild(streak)

    const isPatrol = ck.key === 'car_patrol'
    let lightL: Graphics | undefined
    let lightR: Graphics | undefined
    if (isPatrol) {
      lightL = new Graphics()
      lightL.circle(-cw * 0.04, -cw * 0.245, 3).fill(0xff3355)
      lightL.blendMode = 'add'
      lightR = new Graphics()
      lightR.circle(cw * 0.04, -cw * 0.245, 3).fill(0x3fa9ff)
      lightR.blendMode = 'add'
      root.addChild(lightL, lightR)
    }
    root.x = cr() * w
    root.y = ck.lane + idx * 2
    layers.cars.addChild(root)
    rt.cars.push({
      root,
      dir: ck.dir,
      speed: 55 + cr() * 75,
      patrol: isPatrol,
      parked: false,
      lightL,
      lightR,
    })
  })

  /* ---- parked police cruiser (only visible at high heat/raid) ---- */
  {
    const tex = streetTex('car_patrol')
    const root = new Container()
    const cw = Math.max(80, w * 0.11)
    if (tex) {
      const spr = new Sprite(tex)
      spr.anchor.set(0.5, 1)
      const s = cw / tex.width
      spr.scale.set(-s, s)
      root.addChild(spr)
    }
    const l = new Graphics()
    l.circle(-cw * 0.04, -cw * 0.25, 4).fill(0xff3355)
    l.blendMode = 'add'
    const rr = new Graphics()
    rr.circle(cw * 0.04, -cw * 0.25, 4).fill(0x3fa9ff)
    rr.blendMode = 'add'
    root.addChild(l, rr)
    root.x = w * 0.08
    root.y = h * 0.755
    root.visible = false
    layers.cars.addChild(root)
    rt.cars.push({ root, dir: -1, speed: 0, patrol: true, parked: true, lightL: l, lightR: rr })
  }

  /* ---- pedestrians ---- */
  const pedKeys = ['ped_a1', 'ped_a2', 'ped_a3', 'ped_b1', 'ped_b2', 'ped_b3'] as const
  const recruitSum = Object.values(snap.recruitLevels).reduce((a2, b2) => a2 + b2, 0)
  const pedCount = Math.min(14, 7 + Math.floor(recruitSum / 5) + snap.cityDepthTier)
  const pr = rand(1337)
  for (let p = 0; p < pedCount; p++) {
    const tex = streetTex(pedKeys[p % pedKeys.length])
    if (!tex) break
    const spr = new Sprite(tex)
    spr.anchor.set(0.5, 1)
    const ph = h * (0.10 + pr() * 0.045)
    const s = ph / tex.height
    const dir: 1 | -1 = pr() < 0.5 ? -1 : 1
    spr.scale.set(dir < 0 ? s : -s, s)
    spr.x = pr() * w
    spr.y = h * SIDEWALK_Y - pr() * h * 0.012
    spr.alpha = 0.9
    layers.people.addChild(spr)
    rt.peds.push({ root: spr, dir, speed: 14 + pr() * 30, baseScale: s, phase: pr() * 6.28 })
  }

  /* ---- rain ---- */
  const rainG = new Graphics()
  layers.rain.addChild(rainG)
  rt.rainG = rainG
  const rr2 = rand(555)
  rt.drops = []
  for (let d = 0; d < 140; d++) {
    rt.drops.push({
      x: rr2() * w,
      y: rr2() * h,
      len: 8 + rr2() * 14,
      spd: 340 + rr2() * 220,
    })
  }

  /* ---- atmos: fog patches + embers ---- */
  const fr = rand(77)
  for (let f = 0; f < 3; f++) {
    const g = new Graphics()
    const frad = w * (0.18 + fr() * 0.14)
    g.ellipse(0, 0, frad, frad * 0.3).fill({ color: 0x8fa0d8, alpha: 0.05 })
    g.filters = [new BlurFilter({ strength: 24 })]
    g.x = fr() * w
    g.y = h * (0.5 + fr() * 0.2)
    layers.atmos.addChild(g)
    rt.fogs.push({ g, speed: 4 + fr() * 6 })
  }
  const emberG = new Graphics()
  layers.atmos.addChild(emberG)
  rt.emberG = emberG
  const er = rand(31)
  for (let e = 0; e < 42; e++) {
    rt.embers.push({
      x: er() * w,
      y: h * 0.3 + er() * h * 0.65,
      r: 0.7 + er() * 1.4,
      vy: 6 + er() * 12,
      phase: er() * 6.28,
      warm: er() < 0.6,
    })
  }

  /* ---- heat strobe wash ---- */
  const wash = new Graphics()
  wash.rect(0, h * 0.55, w, h * 0.45).fill({ color: 0xff3355, alpha: 0 })
  wash.blendMode = 'add'
  layers.strobes.addChild(wash)
  rt.wash = wash
}

/* ---------- tick ---------- */

export function tickEmpire(
  rt: EmpireRuntime,
  _app: { screen: { width: number; height: number } },
  _layers: EmpireLayers,
  deltaMS: number,
  _power: number,
  heat: number,
) {
  const dt = deltaMS / 1000
  rt.t += deltaMS
  const t = rt.t
  const w = rt.w
  const h = rt.h
  if (w <= 0 || h <= 0) return

  // sky slow breathing drift
  if (rt.skySpr) rt.skySpr.x = w / 2 + Math.sin(t * 0.000055) * 14

  // parallax drift
  if (rt.farTile) rt.farTile.tilePosition.x = -t * 0.0035 - Math.sin(t * 0.00011) * 10
  if (rt.midTile) rt.midTile.tilePosition.x = -t * 0.0075 - Math.sin(t * 0.00016) * 16

  // back street slow crawl
  if (rt.backSegs.length > 0 && rt.backSegW > 1) {
    const loop = rt.backSegW * 2
    const off = (t * 0.011) % loop
    for (let k = 0; k < rt.backSegs.length; k++) {
      const spr = rt.backSegs[k]
      spr.x = k * rt.backSegW - 2 * rt.backSegW - off
    }
  }

  // building neon flicker + reflection shimmer
  for (const b of rt.buildings) {
    if (b.neon) {
      const buzz = Math.sin(t * 0.013 + b.phase) * 0.03 + Math.sin(t * 0.047 + b.phase * 2.3) * 0.02
      const dip = Math.sin(t * 0.0009 + b.phase * 5.1) > 0.985 ? -0.18 : 0
      b.root.alpha = 0.97 + buzz + dip
    }
    if (b.reflect) b.reflect.alpha = 0.09 + 0.03 * Math.sin(t * 0.0028 + b.phase)
    if (b.glow) b.glow.alpha = 0.85 + 0.15 * Math.sin(t * 0.004 + b.phase * 1.3)
  }

  // searchlights sweep when heat climbs
  const heatN = Math.min(100, Math.max(0, heat)) / 100
  const beamVis = heatN > 0.45 ? Math.min(1, (heatN - 0.45) * 2.2) : 0
  for (const b of rt.beams) {
    b.g.alpha = beamVis * 0.75
    b.g.rotation = b.baseAngle + Math.sin(t * b.speed + b.phase) * 0.55
  }

  // cars
  for (const c of rt.cars) {
    if (c.parked) {
      c.root.visible = heatN > 0.6 || rt.raidId !== null
      if (c.lightL && c.lightR) {
        const flip = Math.sin(t * 0.02) > 0
        c.lightL.alpha = flip && c.root.visible ? 0.95 : 0.06
        c.lightR.alpha = !flip && c.root.visible ? 0.95 : 0.06
      }
      continue
    }
    c.root.x += c.dir * c.speed * dt
    if (c.dir < 0 && c.root.x < -160) c.root.x = w + 160
    if (c.dir > 0 && c.root.x > w + 160) c.root.x = -160
    if (c.patrol && c.lightL && c.lightR) {
      if (heatN > 0.3) {
        const flip = Math.sin(t * 0.016) > 0
        c.lightL.alpha = flip ? 0.85 : 0.1
        c.lightR.alpha = flip ? 0.1 : 0.85
      } else {
        c.lightL.alpha = 0.05
        c.lightR.alpha = 0.05
      }
    }
  }

  // pedestrians
  for (const p of rt.peds) {
    p.root.x += p.dir * p.speed * dt
    if (p.dir < 0 && p.root.x < -30) p.root.x = w + 30
    if (p.dir > 0 && p.root.x > w + 30) p.root.x = -30
    const bob = 1 + Math.sin(t * 0.011 + p.phase) * 0.018
    p.root.scale.y = p.baseScale * bob
  }

  // rain — cycles between dry and downpour over ~50s
  if (rt.rainG) {
    const env = Math.max(0, Math.sin(t * 0.00013) * 0.7 + 0.35 - 0.25)
    const g = rt.rainG
    g.clear()
    if (env > 0.02) {
      const active = Math.floor(rt.drops.length * env)
      for (let d = 0; d < active; d++) {
        const dr = rt.drops[d]
        dr.y += dr.spd * dt
        dr.x -= dr.spd * 0.22 * dt
        if (dr.y > h) {
          dr.y = -20
          dr.x = Math.random() * (w + 100)
        }
        if (dr.x < -20) dr.x += w + 40
        g.moveTo(dr.x, dr.y).lineTo(dr.x - dr.len * 0.22, dr.y + dr.len)
      }
      g.stroke({ width: 1, color: 0xa8c4e8, alpha: 0.34 * env })
    }
  }

  // fog drift
  for (const f of rt.fogs) {
    f.g.x += f.speed * dt
    if (f.g.x - w * 0.3 > w) f.g.x = -w * 0.3
  }

  // embers / dust motes
  if (rt.emberG) {
    const g = rt.emberG
    g.clear()
    for (const e of rt.embers) {
      e.y -= e.vy * dt
      e.x += Math.sin(t * 0.0009 + e.phase) * 6 * dt
      if (e.y < h * 0.28) {
        e.y = h * (0.92 + Math.random() * 0.06)
        e.x = Math.random() * w
      }
      const a = 0.25 + 0.3 * Math.sin(t * 0.003 + e.phase * 3)
      if (a > 0.05) g.circle(e.x, e.y, e.r).fill({ color: e.warm ? 0xffb870 : 0x7fd4ff, alpha: a })
    }
  }

  // heat / raid strobes
  const raid = rt.raidId !== null
  const strobe = raid || heatN > 0.72
  if (rt.wash) {
    if (strobe) {
      const flip = Math.sin(t * 0.017) > 0
      rt.wash.clear()
      rt.wash.rect(0, h * 0.5, w, h * 0.5).fill({ color: flip ? 0xff3355 : 0x3fa9ff, alpha: 0.055 + (raid ? 0.04 : 0) })
    } else if (rt.wash.alpha !== 0) {
      rt.wash.clear()
      rt.wash.rect(0, h * 0.5, w, h * 0.5).fill({ color: 0xff3355, alpha: 0 })
    }
  }
  if (rt.strobeDots) {
    const flip = Math.sin(t * 0.019) > 0
    rt.strobeDots.l.alpha = flip ? 1 : 0.1
    rt.strobeDots.r.alpha = flip ? 0.1 : 1
  }
}
