import { Application, BlurFilter, Container, Graphics } from 'pixi.js'
import { BUSINESSES } from '../../data/businesses'
import { RECRUITS } from '../../data/recruits'
import type { EmpireSnapshot } from '../../game/visualMetrics'
import {
  AMBIENT_RUNNERS_COUNT,
  MAX_MID_DISTRICT_BUILDINGS,
  MAX_VEHICLES_CAP,
  MAX_VISIBLE_BUSINESS_BUILDINGS,
  MAX_VISIBLE_RECRUIT_UNITS_TOTAL,
  PARTICLE_COUNT_BASE,
  PARTICLE_NEAR_COUNT_BASE,
  VISUAL_BUILDINGS_PER_BUSINESS_KIND,
  VISUAL_UNITS_PER_RECRUIT_KIND,
} from '../../game/visualCaps'

/** Reuse blur filter instance across rebuilds to reduce GC / allocation churn. */
let farSkylineBlurSingleton: BlurFilter | null = null
function getFarSkylineBlur(): BlurFilter {
  if (!farSkylineBlurSingleton) {
    farSkylineBlurSingleton = new BlurFilter({ strength: 1.05, quality: 2, kernelSize: 5 })
  }
  return farSkylineBlurSingleton
}

const C = {
  skyTop: 0x020208,
  skyMid: 0x140a22,
  skyBot: 0x1e1030,
  fog: 0x3d2a55,
  fogFront: 0x1a1530,
  road: 0x080810,
  roadLine: 0x5b5f7a,
  roadSheen: 0x8b5cf6,
  neonPink: 0xff3dac,
  neonBlue: 0x818cf8,
  gold: 0xeab308,
  moneyGreen: 0x34d399,
  powerPurple: 0xc084fc,
}

export type EmpireLayers = {
  sky: Graphics
  skyBloom: Graphics
  stars: Graphics
  farSkyline: Container
  midSkyline: Container
  fog: Graphics
  fogFront: Graphics
  /** Slow scrolling smoke / haze quads */
  hazeSmoke: Graphics
  midDistrict: Container
  road: Graphics
  roadSheen: Graphics
  buildings: Container
  units: Container
  vehicles: Container
  particles: Container
  particlesNear: Container
  territoryGlow: Graphics
  helicopter: Graphics
}

type UnitKind = 'lookout' | 'runner' | 'muscle' | 'fixer'

type UnitAnim = {
  root: Container
  kind: UnitKind
  baseX: number
  baseY: number
  /** runner / muscle: logical track position (sway applied on top). */
  trackX: number
  phase: number
  speed: number
  /** lookout roof side */
  edge: number
  /** runner / muscle horizontal */
  dir: number
  fixerGlow?: Graphics
  /** unique idle (breath / sway) */
  breathHz: number
  breathAmp: number
  swayHz: number
  swayAmp: number
  bobHz: number
  bobAmp: number
}

type VehicleAnim = {
  g: Graphics
  y: number
  speed: number
  w: number
  dir: number
  kind: 'street' | 'patrol'
}

type ParticleAnim = {
  g: Graphics
  vx: number
  vy: number
  x: number
  y: number
  a: number
}

type BuildingAnim = {
  root: Container
  kind: string
  neon?: Graphics
  towerWindows?: Graphics[]
  /** stall warm lamp */
  stallLamp?: Graphics
  /** laundromat rotating sign group */
  laundryRotor?: Container
  /** soft ground glow */
  groundGlow?: Graphics
}

export type EmpireRuntime = {
  units: UnitAnim[]
  vehicles: VehicleAnim[]
  particles: ParticleAnim[]
  particlesNear: ParticleAnim[]
  buildings: BuildingAnim[]
  time: number
  /** 0–6 from total business + recruit levels — drives motion amplitude & density. */
  growthTier: number
  /** 0 when no territories; used for glow brightness + flicker in tick. */
  territoryGlowAmp: number
}

export function createEmpireRuntime(): EmpireRuntime {
  return {
    units: [],
    vehicles: [],
    particles: [],
    particlesNear: [],
    buildings: [],
    time: 0,
    growthTier: 0,
    territoryGlowAmp: 0,
  }
}

/** Visual “empire size” bucket for richer world as upgrades stack. */
function computeGrowthTier(snapshot: EmpireSnapshot): number {
  const b = BUSINESSES.reduce((s, x) => s + (snapshot.businessLevels[x.id] ?? 0), 0)
  const r = RECRUITS.reduce((s, x) => s + (snapshot.recruitLevels[x.id] ?? 0), 0)
  const score = b + r
  if (score >= 120) return 6
  if (score >= 80) return 5
  if (score >= 50) return 4
  if (score >= 30) return 3
  if (score >= 15) return 2
  if (score >= 5) return 1
  return 0
}

function hash(seed: number): number {
  let x = seed ^ 0x9e3779b9
  x = Math.imul(x ^ (x >>> 16), 0x85ebca6b)
  x = Math.imul(x ^ (x >>> 13), 0xc2b2ae35)
  return (x ^ (x >>> 16)) >>> 0
}

function idleFromSeed(seed: number) {
  const h = hash(seed * 31 + 17)
  return {
    breathHz: 0.00175 + (h % 100) * 0.000012,
    breathAmp: 0.02 + (h % 45) * 0.0011,
    swayHz: 0.00028 + ((h >> 8) % 55) * 0.000011,
    swayAmp: 2.2 + (h % 28) * 0.28,
    bobHz: 0.00195 + (h % 35) * 0.00006,
    bobAmp: 0.9 + (h % 22) * 0.11,
  }
}

function drawSky(g: Graphics, w: number, h: number): void {
  g.clear()
  const bands = 7
  for (let i = 0; i < bands; i++) {
    const t0 = i / bands
    const t1 = (i + 1) / bands
    const mix = (a: number, b: number, u: number) => a + (b - a) * u
    const c = mix(C.skyTop, C.skyBot, (t0 + t1) / 2)
    g.rect(0, h * t0, w, h * (t1 - t0) + 1).fill({ color: c, alpha: 1 })
  }
  g.rect(0, h * 0.46, w, 4).fill({ color: C.neonBlue, alpha: 0.14 })
  g.rect(0, h * 0.46, w, 1).fill({ color: C.gold, alpha: 0.06 })
}

function drawSkyBloom(g: Graphics, w: number, h: number, growthTier: number): void {
  g.clear()
  const gBoost = 0.035 * growthTier
  g.circle(w * 0.52, h * 0.02, w * (0.65 + growthTier * 0.02)).fill({
    color: 0x7c3aed,
    alpha: 0.14 + gBoost,
  })
  g.circle(w * 0.18, h * 0.12, w * 0.22).fill({ color: 0xf59e0b, alpha: 0.05 + gBoost * 0.5 })
  g.rect(0, 0, w * 0.14, h).fill({ color: 0x000000, alpha: 0.42 })
  g.rect(w * 0.86, 0, w * 0.14, h).fill({ color: 0x000000, alpha: 0.42 })
  g.rect(0, h * 0.78, w, h * 0.22).fill({ color: 0x020204, alpha: 0.55 })
}

function drawStars(g: Graphics, w: number, h: number, growthTier: number): void {
  g.clear()
  const top = h * 0.42
  const count = 72 + growthTier * 12
  for (let i = 0; i < count; i++) {
    const seed = hash(i * 499 + 77)
    const sx = ((seed % 1000) / 1000) * w
    const sy = ((seed >>> 10) % 1000) / 1000
    const y = sy * top
    const s = 0.6 + (seed % 5) * 0.22
    const tw = 0.35 + ((seed >> 3) % 5) * 0.06
    g.circle(sx, y, s).fill({ color: 0xfffbeb, alpha: tw })
  }
}

function drawFarSkyline(parent: Container, w: number, horizonY: number, tier: number): void {
  parent.removeChildren().forEach((c) => c.destroy({ children: true }))
  const n = 16 + tier * 4
  for (let i = 0; i < n; i++) {
    const seed = hash(i * 9973 + tier * 13)
    const bw = 18 + (seed % 48)
    const bh = 28 + (seed % 90) + tier * 14
    const x = (w / (n + 1)) * (i + 1) + ((seed % 31) - 15)
    const g = new Graphics()
    g.roundRect(-bw / 2, -bh, bw, bh, 3).fill({ color: 0x120a1c, alpha: 0.72 })
    g.rect(-bw / 2 + 2, -bh * 0.35, bw - 4, 3).fill({ color: C.neonBlue, alpha: 0.08 })
    g.x = x
    g.y = horizonY
    parent.addChild(g)
  }
}

function drawMidSkyline(parent: Container, w: number, horizonY: number, tier: number): void {
  parent.removeChildren().forEach((c) => c.destroy({ children: true }))
  const n = 12 + tier * 3
  for (let i = 0; i < n; i++) {
    const seed = hash(i * 6829 + tier * 29)
    const bw = 26 + (seed % 38)
    const bh = 42 + (seed % 70) + tier * 10
    const x = (w / (n + 1)) * (i + 1) + ((seed % 27) - 13)
    const g = new Graphics()
    g.roundRect(-bw / 2, -bh, bw, bh, 2).fill({ color: 0x1e1235, alpha: 0.78 })
    for (let k = 0; k < 3; k++) {
      const wy = -bh * (0.25 + k * 0.2)
      g.rect(-bw / 4, wy, 3, 4).fill({ color: 0xfde68a, alpha: 0.06 + (seed % 5) * 0.03 })
    }
    g.x = x
    g.y = horizonY + 4
    parent.addChild(g)
  }
}

function drawFog(g: Graphics, w: number, h: number, horizonY: number): void {
  g.clear()
  g.rect(0, horizonY - 50, w, h - horizonY + 100).fill({
    color: C.fog,
    alpha: 0.22,
  })
  g.rect(0, horizonY + 8, w, 140).fill({ color: 0x0a0618, alpha: 0.28 })
}

function drawFogFront(g: Graphics, w: number, _h: number, horizonY: number, groundY: number): void {
  g.clear()
  g.rect(0, horizonY + 25, w, groundY - horizonY + 20).fill({
    color: C.fogFront,
    alpha: 0.18,
  })
}

function drawHazeSmoke(
  g: Graphics,
  w: number,
  _h: number,
  horizonY: number,
  groundY: number,
): void {
  g.clear()
  const mid = (groundY + horizonY) * 0.5
  for (let i = 0; i < 5; i++) {
    const seed = hash(i * 409 + 601)
    const y = mid + i * 22 + ((seed % 17) - 8)
    const a = 0.035 + (i % 2) * 0.025
    const cx = w * (0.12 + ((seed >>> 3) % 70) / 100)
    g.ellipse(cx, y, w * (0.32 + (seed % 8) * 0.02), 16 + (seed % 9)).fill({
      color: C.fog,
      alpha: a,
    })
    g.ellipse(cx + w * 0.42, y + 10, w * 0.26, 12).fill({ color: C.fogFront, alpha: a * 0.75 })
  }
  g.rect(0, horizonY - 8, w, 14).fill({ color: C.skyBot, alpha: 0.06 })
}

function drawRoad(
  g: Graphics,
  w: number,
  h: number,
  groundY: number,
  roadSpreadStage: number,
): void {
  g.clear()
  g.rect(0, groundY, w, h - groundY).fill({ color: C.road, alpha: 0.97 })
  g.rect(0, groundY, w, 3).fill({ color: 0x4c1d95, alpha: 0.25 })
  const lineGap = Math.max(28, 44 - roadSpreadStage * 5)
  for (let x = -60; x < w + 100; x += lineGap) {
    g.rect(x, groundY + (h - groundY) * 0.52, Math.min(24, 14 + roadSpreadStage * 3), 2).fill({
      color: C.roadLine,
      alpha: 0.32 + roadSpreadStage * 0.03,
    })
  }
}

function drawRoadSheen(g: Graphics, w: number, h: number, groundY: number): void {
  g.clear()
  const bandH = Math.max(24, (h - groundY) * 0.35)
  g.rect(0, groundY + 8, w, bandH).fill({
    color: C.roadSheen,
    alpha: 0.04,
  })
}

function addStall(
  parent: Container,
  x: number,
  groundY: number,
  seed: number,
  runtime: EmpireRuntime,
): void {
  const root = new Container()
  const glow = new Graphics()
  glow.ellipse(0, -6, 22, 10).fill({ color: C.gold, alpha: 0.12 })
  const lamp = new Graphics()
  lamp.circle(0, -24, 6).fill({ color: C.gold, alpha: 0.28 })
  const g = new Graphics()
  g.roundRect(-9, -20, 18, 20, 2).fill({ color: 0x3d2f1a, alpha: 0.95 })
  g.rect(-10, -22, 20, 4).fill({ color: C.gold, alpha: 0.52 })
  g.rect(-4, -14, 8, 6).fill({ color: 0xfff7ed, alpha: 0.22 + (seed % 5) * 0.03 })
  root.addChild(glow)
  root.addChild(lamp)
  root.addChild(g)
  root.x = x
  root.y = groundY
  parent.addChild(root)
  runtime.buildings.push({
    root,
    kind: 'stall',
    stallLamp: lamp,
    groundGlow: glow,
  })
}

function addLaundry(
  parent: Container,
  x: number,
  groundY: number,
  seed: number,
  runtime: EmpireRuntime,
): void {
  const root = new Container()
  const groundGlow = new Graphics()
  groundGlow.ellipse(0, -4, 26, 12).fill({ color: C.neonBlue, alpha: 0.1 })
  const body = new Graphics()
  body.roundRect(-14, -34, 28, 34, 2).fill({ color: 0x1e3a4f, alpha: 0.96 })
  const rotor = new Container()
  const sign = new Graphics()
  sign.roundRect(-10, -40, 20, 6, 1).fill({ color: 0x38bdf8, alpha: 0.65 })
  sign.rect(-6, -36, 12, 2).fill({ color: 0xffffff, alpha: 0.45 + (seed % 3) * 0.1 })
  const drum = new Graphics()
  drum.roundRect(-6, -30, 12, 10, 2).stroke({ width: 1, color: 0x94a3b8, alpha: 0.4 })
  drum.arc(0, -25, 5, 0, Math.PI * 1.2).stroke({ width: 1, color: 0xe2e8f0, alpha: 0.35 })
  rotor.addChild(sign)
  rotor.addChild(drum)
  const frame = new Graphics()
  frame.roundRect(-15, -35, 30, 36, 3).stroke({ width: 1, color: C.neonBlue, alpha: 0.22 })
  root.addChild(groundGlow)
  root.addChild(frame)
  root.addChild(body)
  root.addChild(rotor)
  root.x = x
  root.y = groundY
  parent.addChild(root)
  runtime.buildings.push({
    root,
    kind: 'laundry',
    laundryRotor: rotor,
    groundGlow,
  })
}

function addClub(
  parent: Container,
  x: number,
  groundY: number,
  _seed: number,
  runtime: EmpireRuntime,
): void {
  const root = new Container()
  const groundGlow = new Graphics()
  groundGlow.ellipse(0, -4, 34, 14).fill({ color: C.neonPink, alpha: 0.14 })
  const body = new Graphics()
  body.roundRect(-16, -44, 32, 44, 3).fill({ color: 0x4a1545, alpha: 0.98 })
  const neon = new Graphics()
  neon.roundRect(-17, -45, 34, 46, 4).stroke({ width: 2, color: C.neonPink, alpha: 0.75 })
  neon.roundRect(-12, -38, 24, 8, 2).fill({ color: C.neonPink, alpha: 0.38 })
  root.addChild(groundGlow)
  root.addChild(body)
  root.addChild(neon)
  root.x = x
  root.y = groundY
  parent.addChild(root)
  runtime.buildings.push({ root, kind: 'club', neon, groundGlow })
}

function addTower(
  parent: Container,
  x: number,
  groundY: number,
  seed: number,
  runtime: EmpireRuntime,
): void {
  const root = new Container()
  const bw = 22
  const bh = 72 + (seed % 44)
  const groundGlow = new Graphics()
  groundGlow.ellipse(0, -6, bw * 1.1, 14).fill({ color: C.gold, alpha: 0.08 })
  const body = new Graphics()
  body.roundRect(-bw / 2, -bh, bw, bh, 2).fill({ color: 0x0f172a, alpha: 0.98 })
  body.roundRect(-bw / 2 - 1, -bh - 1, bw + 2, bh + 2, 3).stroke({
    width: 1,
    color: C.gold,
    alpha: 0.15,
  })
  root.addChild(groundGlow)
  root.addChild(body)
  const wins: Graphics[] = []
  const rows = 5 + (seed % 3)
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < 2; c++) {
      const win = new Graphics()
      const wx = -bw / 4 + c * (bw / 2.2)
      const wy = -bh * (0.18 + r * 0.16)
      win.rect(wx, wy, 4, 6).fill({ color: 0xfef9c3, alpha: 0.18 + (seed % 7) * 0.05 })
      root.addChild(win)
      wins.push(win)
    }
  }
  root.x = x
  root.y = groundY
  parent.addChild(root)
  runtime.buildings.push({ root, kind: 'tower', towerWindows: wins, groundGlow })
}

function addGenericMid(parent: Container, w: number, groundY: number, businessSum: number): void {
  parent.removeChildren().forEach((c) => c.destroy({ children: true }))
  const n = Math.min(MAX_MID_DISTRICT_BUILDINGS, 4 + Math.floor(businessSum / 3))
  for (let i = 0; i < n; i++) {
    const seed = hash(i * 4441 + businessSum)
    const bw = 22 + (seed % 34)
    const bh = 38 + (seed % 56)
    const x = (w / (n + 1)) * (i + 1) + ((seed % 21) - 10)
    const g = new Graphics()
    g.roundRect(-bw / 2, -bh, bw, bh, 2).fill({ color: 0x251b3d, alpha: 0.82 })
    g.rect(-bw / 4, -bh * 0.4, 4, 5).fill({ color: 0xfbbf24, alpha: 0.07 })
    g.x = x
    g.y = groundY - 10
    parent.addChild(g)
  }
}

function spawnUnit(
  parent: Container,
  kind: UnitKind,
  x: number,
  groundY: number,
  seed: number,
  /** 0–1 strength from owned levels beyond visible cap — denser glow / presence without extra nodes. */
  visualBoost = 0,
): UnitAnim {
  const root = new Container()
  const boost = Math.min(1, Math.max(0, visualBoost))
  root.alpha = 0.82 + boost * 0.18
  const phase = (seed % 1000) * 0.01
  const idle = idleFromSeed(seed)

  if (kind === 'lookout') {
    const pole = new Graphics()
    pole.rect(-1, -28, 2, 28).fill({ color: 0x4b5563, alpha: 0.8 })
    const body = new Graphics()
    body.roundRect(-3, -32, 6, 10, 2).fill({ color: C.powerPurple, alpha: 0.55 })
    const head = new Graphics()
    head.circle(0, -36, 3.5).fill({ color: 0xe9d5ff, alpha: 0.5 })
    root.addChild(pole)
    root.addChild(body)
    root.addChild(head)
    root.x = x
    root.y = groundY - 48
    parent.addChild(root)
    return {
      root,
      kind,
      baseX: x,
      baseY: root.y,
      trackX: x,
      phase,
      speed: 0,
      edge: seed % 2 === 0 ? -1 : 1,
      dir: 0,
      breathHz: idle.breathHz * 1.05,
      breathAmp: idle.breathAmp * 1.15,
      swayHz: idle.swayHz,
      swayAmp: idle.swayAmp * 1.35,
      bobHz: idle.bobHz,
      bobAmp: idle.bobAmp * 1.1,
    }
  }

  if (kind === 'runner') {
    const body = new Graphics()
    body.roundRect(-2.5, -9, 5, 11, 2).fill({ color: C.moneyGreen, alpha: 0.82 })
    const head = new Graphics()
    head.circle(0, -12, 3).fill({ color: 0xd1fae5, alpha: 0.65 })
    root.addChild(body)
    root.addChild(head)
    root.x = x
    root.y = groundY - 2
    parent.addChild(root)
    const dir = seed % 5 === 0 ? -1 : 1
    return {
      root,
      kind,
      baseX: x,
      baseY: root.y,
      trackX: x,
      phase,
      speed: 0.48 + (seed % 5) * 0.08,
      edge: 0,
      dir,
      breathHz: idle.breathHz * 1.2,
      breathAmp: idle.breathAmp * 0.85,
      swayHz: idle.swayHz * 1.15,
      swayAmp: idle.swayAmp * 1.05,
      bobHz: idle.bobHz * 1.4,
      bobAmp: idle.bobAmp * 1.25,
    }
  }

  if (kind === 'muscle') {
    const body = new Graphics()
    body.roundRect(-6, -12, 12, 14, 3).fill({ color: 0x1f2937, alpha: 0.96 })
    const vest = new Graphics()
    vest.roundRect(-6.5, -11, 13, 12, 2).stroke({ width: 1, color: 0x6b7280, alpha: 0.5 })
    const head = new Graphics()
    head.circle(0, -16, 4.5).fill({ color: 0xe5e7eb, alpha: 0.62 })
    root.addChild(body)
    root.addChild(vest)
    root.addChild(head)
    root.x = x
    root.y = groundY - 2
    parent.addChild(root)
    return {
      root,
      kind,
      baseX: x,
      baseY: root.y,
      trackX: x,
      phase,
      speed: 0.16 + (seed % 3) * 0.05,
      edge: 0,
      dir: 1,
      breathHz: idle.breathHz * 0.9,
      breathAmp: idle.breathAmp * 1.25,
      swayHz: idle.swayHz * 0.85,
      swayAmp: idle.swayAmp * 0.75,
      bobHz: idle.bobHz * 0.95,
      bobAmp: idle.bobAmp * 0.9,
    }
  }

  // fixer
  const glow = new Graphics()
  glow.circle(0, -8, 16).fill({ color: C.powerPurple, alpha: 0.2 })
  const body = new Graphics()
  body.roundRect(-4, -11, 8, 13, 2).fill({ color: 0xfae8ff, alpha: 0.35 })
  const coat = new Graphics()
  coat.roundRect(-5, -10, 10, 12, 2).stroke({ width: 1, color: C.neonBlue, alpha: 0.5 })
  const head = new Graphics()
  head.circle(0, -15, 3.2).fill({ color: 0xffffff, alpha: 0.45 })
  root.addChild(glow)
  root.addChild(body)
  root.addChild(coat)
  root.addChild(head)
  root.x = x
  root.y = groundY - 2
  parent.addChild(root)
  return {
    root,
    kind: 'fixer',
    baseX: x,
    baseY: root.y,
    trackX: x,
    phase,
    speed: 0.1 + (seed % 2) * 0.03,
    edge: 0,
    dir: 0,
    fixerGlow: glow,
    breathHz: idle.breathHz,
    breathAmp: idle.breathAmp * 0.95,
    swayHz: idle.swayHz * 1.1,
    swayAmp: idle.swayAmp * 0.65,
    bobHz: idle.bobHz,
    bobAmp: idle.bobAmp * 1.05,
  }
}

function allocateCounts(
  levels: Record<string, number>,
  ids: string[],
  perCap: number,
  globalMax: number,
): Record<string, number> {
  const raw: Record<string, number> = {}
  let sum = 0
  for (const id of ids) {
    const n = Math.min(perCap, Math.max(0, levels[id] ?? 0))
    raw[id] = n
    sum += n
  }
  if (sum <= globalMax) return raw
  const scale = globalMax / sum
  const out: Record<string, number> = {}
  let allocated = 0
  for (const id of ids) {
    const v = Math.floor((raw[id] ?? 0) * scale)
    out[id] = v
    allocated += v
  }
  let rem = globalMax - allocated
  for (const id of ids) {
    if (rem <= 0) break
    if ((raw[id] ?? 0) > (out[id] ?? 0)) {
      out[id] = (out[id] ?? 0) + 1
      rem -= 1
    }
  }
  return out
}

function recruitKind(id: string): UnitKind {
  if (id === 'lookout') return 'lookout'
  if (id === 'runner') return 'runner'
  if (id === 'muscle' || id === 'enforcer' || id === 'lieutenant') return 'muscle'
  return 'fixer'
}

function drawTerritoryGlow(
  g: Graphics,
  w: number,
  h: number,
  groundY: number,
  count: number,
  tier: number,
  growthTier: number,
): void {
  g.clear()
  if (count === 0) return
  const gMult = 1 + growthTier * 0.06
  const span = Math.min(1, (0.28 + count * 0.24 + tier * 0.07) * gMult)
  const x0 = w * (0.5 - span / 2)
  const gw = w * span
  g.roundRect(x0, groundY - 10, gw, h - groundY + 18, 0).fill({
    color: 0xa855f7,
    alpha: (0.1 + count * 0.05) * gMult,
  })
  g.roundRect(x0, groundY + 8, gw, 12, 6).fill({
    color: C.gold,
    alpha: (0.08 + tier * 0.04) * gMult,
  })
}

function drawHelicopter(
  g: Graphics,
  w: number,
  groundY: number,
  power: number,
  time: number,
): void {
  g.clear()
  if (power < 420) return
  const hx = ((time * 0.045) % (w + 120)) - 40
  const hy = 36 + Math.sin(time * 0.0005) * 10
  g.ellipse(hx, hy, 16, 6).fill({ color: 0x1f2937, alpha: 0.65 })
  g.circle(hx + 14, hy, 3).fill({ color: 0xfbbf24, alpha: 0.35 })
  g.poly([hx - 22, hy + 5, hx + 60, groundY + 20, hx - 8, groundY + 28], true).fill({
    color: 0xfef08a,
    alpha: 0.06,
  })
}

export function rebuildEmpireScene(
  app: Application,
  layers: EmpireLayers,
  snapshot: EmpireSnapshot,
  runtime: EmpireRuntime,
): void {
  const w = app.screen.width
  const h = app.screen.height
  const horizonY = h * 0.38
  const groundY = h * 0.58
  const businessSum = BUSINESSES.reduce((s, b) => s + (snapshot.businessLevels[b.id] ?? 0), 0)
  const gt = computeGrowthTier(snapshot)
  runtime.growthTier = gt
  const skylineEmphasis =
    snapshot.powerTier + Math.min(2, Math.floor(gt / 2)) + Math.min(4, snapshot.cityDepthTier)

  drawSky(layers.sky, w, h)
  drawSkyBloom(layers.skyBloom, w, h, gt)
  drawStars(layers.stars, w, h, gt)
  drawFarSkyline(layers.farSkyline, w, horizonY, skylineEmphasis)
  layers.farSkyline.filters = [getFarSkylineBlur()]
  layers.farSkyline.alpha = 0.86
  drawMidSkyline(layers.midSkyline, w, horizonY, skylineEmphasis)
  layers.midSkyline.alpha = 0.92
  drawFog(layers.fog, w, h, horizonY)
  drawFogFront(layers.fogFront, w, h, horizonY, groundY)
  drawHazeSmoke(layers.hazeSmoke, w, h, horizonY, groundY)
  addGenericMid(layers.midDistrict, w, groundY - 6, businessSum + gt * 4)
  drawRoad(layers.road, w, h, groundY, snapshot.roadSpreadStage)
  drawRoadSheen(layers.roadSheen, w, h, groundY)

  layers.buildings.removeChildren().forEach((c) => c.destroy({ children: true }))
  layers.units.removeChildren().forEach((c) => c.destroy({ children: true }))
  layers.vehicles.removeChildren().forEach((c) => c.destroy({ children: true }))
  layers.particles.removeChildren().forEach((c) => c.destroy({ children: true }))
  layers.particlesNear.removeChildren().forEach((c) => c.destroy({ children: true }))

  runtime.buildings = []
  runtime.units = []
  runtime.vehicles = []
  runtime.particles = []
  runtime.particlesNear = []

  const bCap = VISUAL_BUILDINGS_PER_BUSINESS_KIND
  const buildingAlloc = allocateCounts(
    snapshot.businessLevels,
    BUSINESSES.map((b) => b.id),
    bCap,
    MAX_VISIBLE_BUSINESS_BUILDINGS,
  )
  const totalBuildSlots = Math.max(
    1,
    BUSINESSES.reduce((s, b) => s + (buildingAlloc[b.id] ?? 0), 0),
  )
  let buildSlot = 0
  for (const b of BUSINESSES) {
    const n = buildingAlloc[b.id] ?? 0
    for (let i = 0; i < n; i++) {
      const seed = hash(buildSlot * 131 + i * 17 + b.id.charCodeAt(0))
      const t = (buildSlot + 1) / (totalBuildSlots + 1)
      const rawLv = snapshot.businessLevels[b.id] ?? 0
      const overflow = Math.max(0, rawLv - VISUAL_BUILDINGS_PER_BUSINESS_KIND)
      const boost = Math.min(1, overflow * 0.04)
      const x = 28 + t * (w - 56) + ((seed % 28) - 14)
      buildSlot += 1
      if (b.id === 'stall') addStall(layers.buildings, x, groundY, seed, runtime)
      else if (b.id === 'laundry') addLaundry(layers.buildings, x, groundY, seed, runtime)
      else if (b.id === 'club') addClub(layers.buildings, x, groundY, seed, runtime)
      else addTower(layers.buildings, x, groundY, seed, runtime)
      const lastB = runtime.buildings[runtime.buildings.length - 1]
      if (lastB?.root) {
        lastB.root.alpha = 0.88 + boost * 0.12
      }
    }
  }

  const rCap = VISUAL_UNITS_PER_RECRUIT_KIND
  const recruitAlloc = allocateCounts(
    snapshot.recruitLevels,
    RECRUITS.map((r) => r.id),
    rCap,
    MAX_VISIBLE_RECRUIT_UNITS_TOTAL,
  )
  let ux = 0
  for (const r of RECRUITS) {
    const n = recruitAlloc[r.id] ?? 0
    const kind = recruitKind(r.id)
    const rawLvR = snapshot.recruitLevels[r.id] ?? 0
    const overflowR = Math.max(0, rawLvR - VISUAL_UNITS_PER_RECRUIT_KIND)
    const rowBoost = Math.min(1, overflowR * 0.05)
    for (let i = 0; i < n; i++) {
      const seed = hash(ux * 311 + i * 53 + r.id.length * 97)
      const spread = w * 0.85
      let x = 40 + ((ux * 47 + seed) % Math.floor(spread))
      if (kind === 'lookout') {
        x = seed % 2 === 0 ? 28 + (seed % 40) : w - 28 - (seed % 40)
      }
      ux += 1
      runtime.units.push(spawnUnit(layers.units, kind, x, groundY, seed, rowBoost))
    }
  }

  for (let a = 0; a < AMBIENT_RUNNERS_COUNT; a++) {
    const seed = hash(8800 + a * 199 + gt * 41)
    const spread = Math.max(80, w - 100)
    const x = 48 + ((seed * 97 + a * 131) % spread)
    runtime.units.push(spawnUnit(layers.units, 'runner', x, groundY, seed ^ 0xbeef))
  }

  const nCars = Math.min(
    MAX_VEHICLES_CAP,
    2 + snapshot.powerTier + Math.floor(snapshot.power / 180) + Math.min(3, Math.floor(gt / 2)),
  )
  const patrolSlots = Math.min(2, 1 + (gt >= 3 ? 1 : 0))
  for (let i = 0; i < nCars; i++) {
    const seed = hash(i * 919 + snapshot.powerTier * 41)
    const car = new Graphics()
    const cw = 28 + (seed % 14)
    const patrol = i < patrolSlots
    if (patrol) {
      car.roundRect(-cw / 2, -7, cw, 14, 3).fill({ color: 0x0f2744, alpha: 0.98 })
      car.rect(-cw / 2 + 2, -9, cw - 4, 3).fill({ color: 0xf8fafc, alpha: 0.55 })
      car.rect(-cw / 2 + 4, 1, 5, 3).fill({ color: 0x3b82f6, alpha: 0.85 })
      car.rect(cw / 2 - 9, 1, 5, 3).fill({ color: 0xef4444, alpha: 0.85 })
      car.rect(-cw / 2 + 3, -5, cw - 6, 5).fill({ color: 0x1e3a5f, alpha: 0.35 })
    } else {
      car.roundRect(-cw / 2, -7, cw, 14, 3).fill({ color: 0x0c1220, alpha: 0.96 })
      car.rect(-cw / 2 + 4, -9, cw - 8, 3).fill({ color: 0xfacc15, alpha: 0.42 })
      car.rect(-cw / 2 + 2, 2, cw - 4, 2).fill({ color: 0xef4444, alpha: 0.35 })
    }
    car.y = groundY + 12 + (seed % 22)
    const dir = seed % 6 === 0 ? -1 : 1
    car.x = dir > 0 ? -40 - (seed % 30) : w + 40 + (seed % 30)
    layers.vehicles.addChild(car)
    runtime.vehicles.push({
      g: car,
      y: car.y,
      speed: (patrol ? 0.26 : 0.32) + (seed % 6) * 0.05 + snapshot.powerTier * 0.045,
      w: cw,
      dir,
      kind: patrol ? 'patrol' : 'street',
    })
  }

  const vp = snapshot.visualPressureBucket ?? 0
  const pc = PARTICLE_COUNT_BASE + gt * 8 + vp * 2
  for (let i = 0; i < pc; i++) {
    const seed = hash(i * 7919 + 3)
    const p = new Graphics()
    const s = 1.1 + (seed % 6) * 0.32
    p.circle(0, 0, s).fill({
      color: seed % 2 === 0 ? C.neonPink : C.powerPurple,
      alpha: 0.16 + (seed % 5) * 0.05,
    })
    p.x = ((seed % 1000) / 1000) * w
    p.y = horizonY + (((seed >>> 8) % 1000) / 1000) * (h - horizonY)
    layers.particles.addChild(p)
    runtime.particles.push({
      g: p,
      vx: ((seed % 11) - 5) * 0.1,
      vy: 0.025 + (seed % 7) * 0.018,
      x: p.x,
      y: p.y,
      a: 0.5,
    })
  }

  const pnc = PARTICLE_NEAR_COUNT_BASE + gt * 5 + vp * 2
  for (let i = 0; i < pnc; i++) {
    const seed = hash(i * 5323 + 99)
    const p = new Graphics()
    const s = 1.4 + (seed % 4) * 0.45
    const warm = seed % 3 === 0
    p.circle(0, 0, s).fill({
      color: warm ? C.gold : 0xf0abfc,
      alpha: 0.22 + (seed % 4) * 0.08,
    })
    p.x = ((seed % 1000) / 1000) * w
    p.y = groundY + 20 + (((seed >>> 7) % 1000) / 1000) * (h - groundY - 30)
    layers.particlesNear.addChild(p)
    runtime.particlesNear.push({
      g: p,
      vx: ((seed % 9) - 4) * 0.12,
      vy: -0.04 - (seed % 5) * 0.02,
      x: p.x,
      y: p.y,
      a: 0.6,
    })
  }

  drawTerritoryGlow(
    layers.territoryGlow,
    w,
    h,
    groundY,
    snapshot.territoryCount,
    snapshot.powerTier,
    gt,
  )
  runtime.territoryGlowAmp =
    snapshot.territoryCount > 0
      ? Math.min(1.15, 0.42 + snapshot.territoryCount * 0.07 + snapshot.powerTier * 0.04)
      : 0

  layers.midDistrict.alpha = 0.94

  layers.sky.zIndex = 0
  layers.skyBloom.zIndex = 1
  layers.stars.zIndex = 2
  layers.farSkyline.zIndex = 3
  layers.midSkyline.zIndex = 4
  layers.fog.zIndex = 5
  layers.fogFront.zIndex = 6
  layers.hazeSmoke.zIndex = 7
  layers.midDistrict.zIndex = 8
  layers.road.zIndex = 9
  layers.roadSheen.zIndex = 10
  layers.territoryGlow.zIndex = 11
  layers.buildings.zIndex = 12
  layers.units.zIndex = 13
  layers.vehicles.zIndex = 14
  layers.particles.zIndex = 15
  layers.particlesNear.zIndex = 16
  layers.helicopter.zIndex = 17
  app.stage.sortableChildren = true
}

export function tickEmpire(
  runtime: EmpireRuntime,
  app: Application,
  layers: EmpireLayers,
  deltaMS: number,
  power: number,
): void {
  const w = app.screen.width
  const h = app.screen.height
  const groundY = h * 0.58
  const horizonY = h * 0.38
  const t = (runtime.time += deltaMS)
  const dt = deltaMS / 16
  const amp = 1 + runtime.growthTier * 0.055
  const slow = 1 + runtime.growthTier * 0.02

  const pxFar = 0.34
  const pxMid = 0.58
  const pxMidDist = 0.74
  layers.farSkyline.x = Math.sin(t * 0.000082 * slow) * (11 * amp) * pxFar
  layers.midSkyline.x = Math.sin(t * 0.000108 * slow + 1.1) * (17 * amp) * pxMid
  layers.midDistrict.x = Math.sin(t * 0.000118 * slow + 0.35) * (14 * amp) * pxMidDist
  const fg =
    Math.sin(t * 0.000152 * slow + 0.22) * (20 * amp) + Math.sin(t * 0.000068 + 0.9) * (3.2 * amp)
  layers.buildings.x = fg
  layers.units.x = fg
  layers.vehicles.x = fg
  layers.particlesNear.x = fg * 0.62
  layers.particles.x = fg * 0.42

  layers.fog.x = Math.sin(t * 0.00011 * slow) * (9 * amp) * 0.52
  layers.fog.alpha = 0.94 + Math.sin(t * 0.00022) * 0.04
  layers.fogFront.x = Math.sin(t * 0.000098 * slow + 0.7) * (7 * amp) * 0.68
  layers.fogFront.alpha = 0.88 + Math.sin(t * 0.00018) * 0.06

  layers.hazeSmoke.x = ((t * 0.011) % 200) - 100 + Math.sin(t * 0.000055) * 14
  layers.hazeSmoke.y = Math.sin(t * 0.000088) * 10
  layers.hazeSmoke.alpha = 0.7 + Math.sin(t * 0.00033) * 0.14

  layers.stars.x = Math.sin(t * 0.000042 * slow) * (5.5 * amp) * pxFar
  layers.stars.alpha = 0.8 + Math.sin(t * (0.00035 + runtime.growthTier * 0.00002)) * 0.14
  layers.roadSheen.x = ((t * (0.018 + runtime.growthTier * 0.001)) % 140) - 70 + fg * 0.38
  layers.roadSheen.alpha = 0.06 + Math.sin(t * (0.0015 + runtime.growthTier * 0.0001)) * 0.035

  if (runtime.territoryGlowAmp > 0) {
    layers.territoryGlow.alpha =
      runtime.territoryGlowAmp *
      (0.94 + Math.sin(t * 0.00165) * 0.06 + Math.sin(t * 0.0031) * 0.035)
  } else {
    layers.territoryGlow.alpha = 1
  }

  for (const u of runtime.units) {
    if (u.kind === 'lookout') {
      const breath = Math.sin(t * u.breathHz + u.phase) * u.breathAmp
      u.root.scale.set(1 + breath, 1 + breath * 0.92)
      u.root.x = u.baseX + Math.sin(t * u.swayHz + u.phase) * u.swayAmp * 0.48
      u.root.y = u.baseY + Math.sin(t * u.bobHz + u.phase * 1.2) * 2.4
      u.root.rotation = Math.sin(t * 0.0009 + u.phase) * 0.1 * u.edge
    } else if (u.kind === 'runner') {
      u.trackX += u.speed * u.dir * dt
      if (u.dir > 0 && u.trackX > w + 35) u.trackX = -25
      if (u.dir < 0 && u.trackX < -35) u.trackX = w + 25
      const sway = Math.sin(t * u.swayHz + u.phase) * u.swayAmp * 0.14
      u.root.x = u.trackX + sway
      const runBounce = Math.abs(Math.sin(t * 0.011 + u.phase)) * 0.11
      const breath = Math.sin(t * u.breathHz + u.phase) * u.breathAmp * 0.45
      u.root.scale.y = 1 + runBounce + breath
      u.root.scale.x = 1 - runBounce * 0.24 - breath * 0.35
      u.root.y = u.baseY + Math.sin(t * u.bobHz + u.phase) * u.bobAmp * 0.4
    } else if (u.kind === 'muscle') {
      u.trackX += u.speed * dt * (Math.sin(u.phase + t * 0.0004) > 0 ? 1 : -1)
      if (u.trackX > w + 20) u.trackX = -20
      if (u.trackX < -20) u.trackX = w + 20
      u.root.x = u.trackX + Math.sin(t * u.swayHz * 1.15 + u.phase) * u.swayAmp * 0.11
      const breath = Math.sin(t * u.breathHz + u.phase) * u.breathAmp
      u.root.scale.set(1 + breath * 0.62 + Math.sin(t * 0.002 + u.phase) * 0.014, 1 + breath * 0.55)
      u.root.y = u.baseY + Math.sin(t * u.bobHz + u.phase) * 1.65
    } else if (u.kind === 'fixer') {
      u.root.x =
        u.baseX +
        Math.sin(t * 0.00028 + u.phase) * 0.38 +
        Math.sin(t * u.swayHz + u.phase) * u.swayAmp * 0.09
      const breath = Math.sin(t * u.breathHz + u.phase) * u.breathAmp
      u.root.scale.set(1 + breath * 0.42, 1 + breath * 0.4)
      u.root.y = u.baseY + Math.sin(t * u.bobHz + u.phase * 0.55) * 2.05
      if (u.fixerGlow) {
        u.fixerGlow.alpha = 0.38 + Math.sin(t * 0.0025 + u.phase) * 0.2
      }
    }
  }

  for (const v of runtime.vehicles) {
    v.g.x += v.speed * v.dir * dt
    if (v.dir > 0 && v.g.x > w + 55) v.g.x = -55
    if (v.dir < 0 && v.g.x < -55) v.g.x = w + 55
  }

  for (const p of runtime.particles) {
    p.x += p.vx * dt
    p.y += p.vy * dt
    if (p.x < -10) p.x = w + 10
    if (p.x > w + 10) p.x = -10
    if (p.y > h + 10) p.y = horizonY
    p.g.x = p.x
    p.g.y = p.y
    p.g.alpha = 0.1 + Math.sin(t * 0.0011 + p.x * 0.012) * 0.08
  }

  for (const p of runtime.particlesNear) {
    p.x += p.vx * dt
    p.y += p.vy * dt
    if (p.x < -15) p.x = w + 15
    if (p.x > w + 15) p.x = -15
    if (p.y < horizonY) p.y = h - 20
    p.g.x = p.x
    p.g.y = p.y
    p.g.alpha = 0.18 + Math.sin(t * 0.002 + p.y * 0.015) * 0.1
  }

  const pulse = 0.42 + Math.sin(t * 0.0033) * 0.28
  const neonPulse = 0.55 + Math.sin(t * 0.0042 + 0.4) * 0.38
  let bi = 0
  for (const b of runtime.buildings) {
    const ph = b.root.x * 0.01 + bi * 0.3
    bi += 1
    if (b.kind === 'stall') {
      if (b.stallLamp) {
        b.stallLamp.alpha =
          0.18 + Math.sin(t * 0.0038 + ph) * 0.14 + Math.sin(t * 0.011 + ph) * 0.06
      }
      if (b.groundGlow) {
        b.groundGlow.alpha = 0.08 + Math.sin(t * 0.0024 + ph) * 0.05
      }
    }
    if (b.kind === 'laundry') {
      if (b.laundryRotor) {
        b.laundryRotor.rotation += deltaMS * 0.00055
      }
      if (b.groundGlow) {
        b.groundGlow.alpha = 0.09 + Math.sin(t * 0.0028 + ph) * 0.04
      }
    }
    if (b.kind === 'club' && b.neon) {
      b.neon.alpha = pulse * (0.88 + neonPulse * 0.12)
    }
    if (b.kind === 'club' && b.groundGlow) {
      b.groundGlow.alpha = 0.1 + neonPulse * 0.12 + Math.sin(t * 0.0035 + ph) * 0.06
    }
    if (b.kind === 'tower' && b.towerWindows) {
      b.towerWindows.forEach((win, i) => {
        const base = 0.16 + (i % 4) * 0.03
        win.alpha = base + Math.sin(t * 0.0016 + i * 0.85) * 0.14
      })
    }
    if (b.kind === 'tower' && b.groundGlow) {
      b.groundGlow.alpha = 0.06 + Math.sin(t * 0.0019 + ph) * 0.035
    }
  }

  drawHelicopter(layers.helicopter, w, groundY, power, t)
}

export function createEmpireLayers(): EmpireLayers {
  const sky = new Graphics()
  const skyBloom = new Graphics()
  const stars = new Graphics()
  const farSkyline = new Container()
  const midSkyline = new Container()
  const fog = new Graphics()
  const fogFront = new Graphics()
  const hazeSmoke = new Graphics()
  const midDistrict = new Container()
  const road = new Graphics()
  const roadSheen = new Graphics()
  const buildings = new Container()
  const units = new Container()
  const vehicles = new Container()
  const particles = new Container()
  const particlesNear = new Container()
  const territoryGlow = new Graphics()
  const helicopter = new Graphics()

  return {
    sky,
    skyBloom,
    stars,
    farSkyline,
    midSkyline,
    fog,
    fogFront,
    hazeSmoke,
    midDistrict,
    road,
    roadSheen,
    buildings,
    units,
    vehicles,
    particles,
    particlesNear,
    territoryGlow,
    helicopter,
  }
}

export function mountEmpireLayers(stage: Container, layers: EmpireLayers): void {
  stage.removeChildren()
  stage.addChild(layers.sky)
  stage.addChild(layers.skyBloom)
  stage.addChild(layers.stars)
  stage.addChild(layers.farSkyline)
  stage.addChild(layers.midSkyline)
  stage.addChild(layers.fog)
  stage.addChild(layers.fogFront)
  stage.addChild(layers.hazeSmoke)
  stage.addChild(layers.midDistrict)
  stage.addChild(layers.road)
  stage.addChild(layers.roadSheen)
  stage.addChild(layers.territoryGlow)
  stage.addChild(layers.buildings)
  stage.addChild(layers.units)
  stage.addChild(layers.vehicles)
  stage.addChild(layers.particles)
  stage.addChild(layers.particlesNear)
  stage.addChild(layers.helicopter)
}
