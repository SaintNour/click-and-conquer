/**
 * Babylon.js backdrop: a 1930s Little Italy street at dusk.
 *
 * Everything is procedural (canvas-painted textures + primitives), no external assets.
 * Owned businesses become storefronts on the block, recruits stand on the sidewalk as
 * your crew, territory lights up more festa arches, and heat brings the cops.
 */
import {
  Camera,
  Color3,
  Color4,
  ColorCurves,
  DefaultRenderingPipeline,
  DirectionalLight,
  DynamicTexture,
  Engine,
  FreeCamera,
  GlowLayer,
  HemisphericLight,
  ImageProcessingConfiguration,
  Matrix,
  Mesh,
  MeshBuilder,
  MirrorTexture,
  ParticleSystem,
  Plane,
  PointLight,
  Scene,
  StandardMaterial,
  Texture,
  TransformNode,
  Vector3,
  type AbstractMesh,
} from '@babylonjs/core'
import type { EmpireSnapshot } from '../../game/visualMetrics'

export type CityWorld = {
  scene: Scene
  applySnapshot: (snap: EmpireSnapshot) => void
  tick: (dtSec: number, heat01: number) => void
  resize: () => void
  dispose: () => void
}

type Ctx = CanvasRenderingContext2D

/* ------------------------------------------------------------------ layout */

const TENEMENT_Z = -8.6 // facade line of the background tenements
const BIZ_Z = -7.2 // facade line of owned storefronts (they step forward)
const CURB_FAR = -1.0
const CURB_NEAR = 4.8
const WALK_Y = 0.24
const SERIF = "Georgia, 'Times New Roman', 'DejaVu Serif', serif"

/* ------------------------------------------------------------------ utils */

function mulberry(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function hexRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.replace('#', ''), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

function shade(hex: string, k: number, a = 1) {
  const [r, g, b] = hexRgb(hex)
  const f = (v: number) => Math.max(0, Math.min(255, Math.round(v * k)))
  return `rgba(${f(r)},${f(g)},${f(b)},${a})`
}

function c3(hex: string, k = 1) {
  const [r, g, b] = hexRgb(hex)
  return new Color3((r / 255) * k, (g / 255) * k, (b / 255) * k)
}

function dyn(scene: Scene, name: string, w: number, h: number, alpha = false) {
  const t = new DynamicTexture(name, { width: w, height: h }, scene, true)
  t.hasAlpha = alpha
  return t
}

function ctxOf(t: DynamicTexture) {
  return t.getContext() as unknown as Ctx
}

function fitFont(ctx: Ctx, text: string, weight: string, maxPx: number, maxW: number, family = SERIF) {
  let px = maxPx
  ctx.font = `${weight} ${px}px ${family}`
  while (ctx.measureText(text).width > maxW && px > 8) {
    px -= 2
    ctx.font = `${weight} ${px}px ${family}`
  }
  return px
}

function radialTex(scene: Scene, name: string, stops: [number, string][], w = 128, h = 128) {
  const t = dyn(scene, name, w, h, true)
  const ctx = ctxOf(t)
  ctx.clearRect(0, 0, w, h)
  ctx.save()
  ctx.translate(w / 2, h / 2)
  ctx.scale(w / 2, h / 2)
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 1)
  for (const [o, c] of stops) g.addColorStop(o, c)
  ctx.fillStyle = g
  ctx.fillRect(-1, -1, 2, 2)
  ctx.restore()
  t.update()
  return t
}

/* ------------------------------------------------------------------ facade painter */

type FacadeOpts = {
  wM: number
  hM: number
  wall: string
  stone: boolean
  cols: number
  floors: number
  groundH: number
  corniceH: number
  lit: number
  seed: number
  goods: string
  door: 'shop' | 'garage' | 'grand'
  shopName?: string
  shopBoard?: string
  ghost?: string
  arched?: boolean
}

const SHOP_NAMES = [
  'SALUMERIA', 'PANETTERIA', 'CAFFÈ ROMA', 'BARBIERE', 'PASTICCERIA', 'MACELLERIA',
  'FARMACIA', 'OSTERIA', 'TABACCHI', 'LATTERIA', 'VINI & OLIO', 'PIZZERIA', 'SARTORIA', 'FERRAMENTA',
]
const GHOST_ADS = [
  'ROSSI & SONS · OLIVE OIL', 'GENOVA IMPORTS', 'FERRARA BAKERY', 'BAKING POWDER 5¢', 'MOZZARELLA DAILY', 'TONIC · 10¢',
]
const BOARD_COLORS = ['#173326', '#3b1414', '#1c2a44', '#2a1f14', '#141414', '#3a2a12']

function paintFacade(scene: Scene, name: string, o: FacadeOpts) {
  const rnd = mulberry(o.seed)
  const W = 512
  const H = Math.max(256, Math.min(1024, Math.round((512 * o.hM) / o.wM)))
  const ppmX = W / o.wM
  const ppmY = H / o.hM
  const dt = dyn(scene, `${name}-d`, W, H)
  const et = dyn(scene, `${name}-e`, W, H)
  const d = ctxOf(dt)
  const e = ctxOf(et)
  e.fillStyle = '#000'
  e.fillRect(0, 0, W, H)

  // wall
  if (o.stone) {
    d.fillStyle = o.wall
    d.fillRect(0, 0, W, H)
    const bh = 0.36 * ppmY
    const bw = 0.9 * ppmX
    for (let y = 0, row = 0; y < H; y += bh, row++) {
      for (let x = row % 2 ? -bw / 2 : 0; x < W; x += bw) {
        d.fillStyle = shade(o.wall, 0.9 + rnd() * 0.18)
        d.fillRect(x + 1, y + 1, bw - 2, bh - 2)
      }
    }
  } else {
    d.fillStyle = shade(o.wall, 0.45)
    d.fillRect(0, 0, W, H)
    const course = Math.max(2.5, 0.075 * ppmY)
    const len = Math.max(6, 0.22 * ppmX)
    for (let y = 0, row = 0; y < H; y += course, row++) {
      for (let x = row % 2 ? -len / 2 : 0; x < W; x += len) {
        const k = 0.78 + rnd() * 0.36
        d.fillStyle = shade(o.wall, rnd() < 0.04 ? k * 0.6 : k)
        d.fillRect(x + 0.8, y + 0.8, len - 1.6, course - 1.2)
      }
    }
  }
  // soot + grime streaks
  const soot = d.createLinearGradient(0, 0, 0, H * 0.55)
  soot.addColorStop(0, 'rgba(10,6,4,0.45)')
  soot.addColorStop(1, 'rgba(10,6,4,0)')
  d.fillStyle = soot
  d.fillRect(0, 0, W, H)
  for (let i = 0; i < 14; i++) {
    d.fillStyle = `rgba(15,10,8,${0.05 + rnd() * 0.1})`
    d.fillRect(rnd() * W, rnd() * H * 0.6, 2 + rnd() * 6, H * (0.1 + rnd() * 0.35))
  }

  const top = o.corniceH * ppmY
  const groundTop = H - o.groundH * ppmY
  const floorH = (groundTop - top) / Math.max(1, o.floors)
  const colW = W / o.cols
  const winW = Math.min(0.95 * ppmX, colW * 0.52)
  const winH = floorH * 0.56
  const trim = o.stone ? shade(o.wall, 1.12) : '#c9b48e'
  const ghostFloor = o.ghost ? 0 : -1

  for (let f = 0; f < o.floors; f++) {
    const fy = top + f * floorH
    if (f === ghostFloor && o.ghost) {
      const gx = W * 0.08
      const gw = W * 0.84
      d.fillStyle = 'rgba(232,214,178,0.22)'
      d.fillRect(gx, fy + floorH * 0.12, gw, floorH * 0.76)
      d.fillStyle = 'rgba(130,34,22,0.32)'
      fitFont(d, o.ghost, '700', floorH * 0.42, gw * 0.9)
      d.textAlign = 'center'
      d.textBaseline = 'middle'
      d.fillText(o.ghost, W / 2, fy + floorH * 0.5)
      continue
    }
    for (let c = 0; c < o.cols; c++) {
      const x = c * colW + (colW - winW) / 2
      const y = fy + floorH * 0.22
      // lintel + sill
      d.fillStyle = trim
      d.fillRect(x - 3, y - 6, winW + 6, 6)
      d.fillRect(x - 2, y + winH, winW + 4, 4)
      d.fillStyle = 'rgba(0,0,0,0.35)'
      d.fillRect(x - 2, y + winH + 4, winW + 4, 3)
      const lit = rnd() < o.lit
      const path = (ctx: Ctx) => {
        ctx.beginPath()
        if (o.arched) {
          ctx.moveTo(x, y + winH)
          ctx.lineTo(x, y + winW / 2)
          ctx.arc(x + winW / 2, y + winW / 2, winW / 2, Math.PI, 0)
          ctx.lineTo(x + winW, y + winH)
          ctx.closePath()
        } else ctx.rect(x, y, winW, winH)
      }
      if (lit) {
        const warm = rnd()
        for (const ctx of [d, e]) {
          const g = ctx.createLinearGradient(0, y, 0, y + winH)
          g.addColorStop(0, warm < 0.7 ? '#ffd79a' : '#ffe9c4')
          g.addColorStop(1, warm < 0.7 ? '#e8892f' : '#f0b060')
          ctx.fillStyle = g
          path(ctx)
          ctx.fill()
          // drapes
          ctx.fillStyle = rnd() < 0.5 ? 'rgba(120,32,20,0.75)' : 'rgba(70,44,26,0.75)'
          ctx.fillRect(x, y, winW * 0.22, winH)
          ctx.fillRect(x + winW * 0.78, y, winW * 0.22, winH)
          // pulled shade
          ctx.fillStyle = 'rgba(214,170,110,0.85)'
          ctx.fillRect(x, y, winW, winH * (0.1 + rnd() * 0.35))
        }
        if (rnd() < 0.22) {
          for (const ctx of [d, e]) {
            ctx.fillStyle = 'rgba(30,14,8,0.85)'
            const sx = x + winW * (0.35 + rnd() * 0.3)
            ctx.beginPath()
            ctx.arc(sx, y + winH * 0.55, winW * 0.09, 0, Math.PI * 2)
            ctx.fill()
            ctx.fillRect(sx - winW * 0.16, y + winH * 0.65, winW * 0.32, winH * 0.35)
          }
        }
      } else {
        const g = d.createLinearGradient(x, y, x + winW, y + winH)
        g.addColorStop(0, '#2a3040')
        g.addColorStop(0.5, '#10131b')
        g.addColorStop(1, '#1a1e28')
        d.fillStyle = g
        path(d)
        d.fill()
      }
      // frame + mullions
      d.strokeStyle = '#d8ccb0'
      d.lineWidth = 2
      path(d)
      d.stroke()
      d.beginPath()
      d.moveTo(x + winW / 2, y + (o.arched ? winW / 2 : 0))
      d.lineTo(x + winW / 2, y + winH)
      d.moveTo(x, y + winH * 0.5)
      d.lineTo(x + winW, y + winH * 0.5)
      d.stroke()
      e.strokeStyle = '#000'
      e.lineWidth = 2.5
      e.beginPath()
      e.moveTo(x + winW / 2, y)
      e.lineTo(x + winW / 2, y + winH)
      e.moveTo(x, y + winH * 0.5)
      e.lineTo(x + winW, y + winH * 0.5)
      e.stroke()
      // flower box
      if (rnd() < 0.18) {
        d.fillStyle = '#4a2c1a'
        d.fillRect(x - 2, y + winH + 2, winW + 4, 6)
        for (let k = 0; k < 6; k++) {
          d.fillStyle = rnd() < 0.5 ? '#c43a2a' : '#3f7a3a'
          d.beginPath()
          d.arc(x + (k + 0.5) * (winW / 6), y + winH + 1, 3, 0, Math.PI * 2)
          d.fill()
        }
      }
    }
  }

  // cornice band
  d.fillStyle = trim
  d.fillRect(0, 0, W, top)
  d.fillStyle = 'rgba(0,0,0,0.3)'
  for (let x = 4; x < W; x += 12) d.fillRect(x, top * 0.55, 6, top * 0.3)
  d.fillStyle = 'rgba(0,0,0,0.45)'
  d.fillRect(0, top, W, 5)

  // storefront
  const gTop = groundTop
  const band = 0.9 * ppmY
  d.fillStyle = o.shopBoard ?? '#1a120c'
  d.fillRect(0, gTop, W, band)
  d.fillStyle = 'rgba(0,0,0,0.5)'
  d.fillRect(0, gTop + band, W, 3)
  if (o.shopName) {
    d.textAlign = 'center'
    d.textBaseline = 'middle'
    const px = fitFont(d, o.shopName, '700', band * 0.62, W * 0.8)
    const g = d.createLinearGradient(0, gTop, 0, gTop + band)
    g.addColorStop(0, '#f7e2a0')
    g.addColorStop(1, '#b8862e')
    d.fillStyle = 'rgba(0,0,0,0.6)'
    d.fillText(o.shopName, W / 2 + 2, gTop + band / 2 + 2)
    d.fillStyle = g
    d.fillText(o.shopName, W / 2, gTop + band / 2)
    e.font = d.font
    e.textAlign = 'center'
    e.textBaseline = 'middle'
    e.fillStyle = 'rgba(150,110,40,0.55)'
    e.fillText(o.shopName, W / 2, gTop + band / 2)
    void px
  }
  // pilasters
  const pil = 0.35 * ppmX
  d.fillStyle = o.stone ? shade(o.wall, 0.95) : '#2a1d14'
  d.fillRect(0, gTop + band, pil, H)
  d.fillRect(W - pil, gTop + band, pil, H)
  const winTop = gTop + band + 0.2 * ppmY
  const bulk = H - 0.55 * ppmY
  const doorW = 1.15 * ppmX

  if (o.door === 'garage') {
    const gw = Math.min(W - pil * 2 - 20, 3.6 * ppmX)
    const gx = (W - gw) / 2
    d.fillStyle = '#3a2c20'
    d.fillRect(gx, winTop, gw, H - winTop)
    d.strokeStyle = 'rgba(0,0,0,0.5)'
    d.lineWidth = 2
    for (let x = gx; x < gx + gw; x += 10) {
      d.beginPath()
      d.moveTo(x, winTop)
      d.lineTo(x, H)
      d.stroke()
    }
    for (const ctx of [d, e]) {
      ctx.fillStyle = '#ffcf80'
      for (let k = 0; k < 5; k++) ctx.fillRect(gx + 8 + k * ((gw - 16) / 5), winTop + 8, (gw - 16) / 5 - 6, 14)
    }
    for (const side of [pil + 6, W - pil - 6 - (gx - pil - 18)]) {
      const sw = gx - pil - 18
      if (sw < 12) continue
      for (const ctx of [d, e]) {
        ctx.fillStyle = '#f2b45c'
        ctx.fillRect(side, winTop + 10, sw, (bulk - winTop) * 0.6)
      }
    }
  } else {
    const doorX = o.door === 'grand' ? (W - doorW * 1.6) / 2 : W - pil - doorW - 0.4 * ppmX
    const dw = o.door === 'grand' ? doorW * 1.6 : doorW
    const segs: [number, number][] =
      o.door === 'grand'
        ? [
            [pil + 8, doorX - 10],
            [doorX + dw + 10, W - pil - 8],
          ]
        : [[pil + 8, doorX - 10]]
    for (const [x0, x1] of segs) {
      if (x1 - x0 < 10) continue
      for (const ctx of [d, e]) {
        const g = ctx.createLinearGradient(0, winTop, 0, bulk)
        g.addColorStop(0, shade(o.goods, 1.1))
        g.addColorStop(1, shade(o.goods, 0.7))
        ctx.fillStyle = g
        ctx.fillRect(x0, winTop, x1 - x0, bulk - winTop)
        // shelves + goods silhouettes
        ctx.fillStyle = 'rgba(40,20,10,0.65)'
        for (let s = 1; s <= 2; s++) {
          const sy = winTop + ((bulk - winTop) * s) / 3
          ctx.fillRect(x0, sy, x1 - x0, 3)
          for (let gx = x0 + 4; gx < x1 - 6; gx += 6 + rnd() * 10) {
            const gh = 6 + rnd() * 16
            ctx.fillRect(gx, sy - gh, 3 + rnd() * 5, gh)
          }
        }
        for (let gx = x0 + 8; gx < x1 - 8; gx += 14 + rnd() * 18) {
          ctx.beginPath()
          ctx.ellipse(gx, winTop + 14 + rnd() * 10, 3, 9, 0, 0, Math.PI * 2)
          ctx.fill()
        }
      }
      d.strokeStyle = '#1e140c'
      d.lineWidth = 3
      d.strokeRect(x0, winTop, x1 - x0, bulk - winTop)
    }
    // door with transom
    d.fillStyle = '#2a1a10'
    d.fillRect(doorX, winTop, dw, H - winTop)
    for (const ctx of [d, e]) {
      ctx.fillStyle = '#ffd08a'
      ctx.fillRect(doorX + 5, winTop + 4, dw - 10, 0.35 * ppmY)
      ctx.fillRect(doorX + 8, winTop + 0.5 * ppmY, dw - 16, (H - winTop) * 0.38)
    }
  }
  // bulkhead
  d.fillStyle = '#24170e'
  d.fillRect(pil, bulk, W - pil * 2, H - bulk)
  // lamp-lit warmth near the street
  const warm = d.createLinearGradient(0, H, 0, H * 0.45)
  warm.addColorStop(0, 'rgba(255,170,90,0.16)')
  warm.addColorStop(1, 'rgba(255,170,90,0)')
  d.fillStyle = warm
  d.fillRect(0, 0, W, H)

  dt.update()
  et.update()
  return { dt, et }
}

/* ------------------------------------------------------------------ business specs */

type BizSpec = {
  label: string
  sub?: string
  w: number
  h: number
  d: number
  wall: string
  stone?: boolean
  awning?: [string, string]
  board: string
  goods: string
  door: 'shop' | 'garage' | 'grand'
  marquee?: boolean
  blade?: string
  neon?: [string, string]
  roof: 'tank' | 'deco' | 'flag' | 'none'
  columns?: boolean
  prop?: 'crates' | 'pump' | 'carpet'
}

const BIZ: Record<string, BizSpec> = {
  stall: { label: 'FRUTTA & VERDURA', sub: 'fresh every morning', w: 6.5, h: 7.4, d: 6, wall: '#7a3b2a', awning: ['#2f6b3a', '#efe4c6'], board: '#173326', goods: '#ffb860', door: 'shop', roof: 'none', prop: 'crates' },
  laundry: { label: 'LAVANDERIA', sub: 'wash · press · mend', w: 7, h: 10.8, d: 7, wall: '#9a7450', awning: ['#2b4a7a', '#efe4c6'], board: '#1c2a44', goods: '#ffdca8', door: 'shop', roof: 'tank' },
  club: { label: 'THE VELVET ROOM', sub: 'members only', w: 8, h: 11.4, d: 8, wall: '#4e2620', awning: ['#6e1420', '#1a0a0a'], board: '#140808', goods: '#ff9a50', door: 'shop', marquee: true, neon: ['COCKTAILS', '#ff3b2f'], roof: 'none' },
  tower: { label: 'HOTEL PALAZZO', w: 11, h: 30, d: 9, wall: '#b9a688', stone: true, board: '#2a1f14', goods: '#ffd59a', door: 'grand', marquee: true, blade: 'HOTEL', roof: 'deco', columns: true },
  garage: { label: 'AUTO GARAGE', sub: 'repairs · storage', w: 9, h: 7.6, d: 8, wall: '#6b4030', board: '#222222', goods: '#ffc070', door: 'garage', neon: ['GAS', '#ff8a2a'], roof: 'none', prop: 'pump' },
  warehouse: { label: 'DOCKSIDE IMPORTS', w: 12, h: 10.2, d: 11, wall: '#5e3426', board: '#1e1a14', goods: '#f0b060', door: 'garage', roof: 'tank' },
  casino: { label: 'GRAND CASINO', sub: 'by invitation', w: 13, h: 15, d: 10, wall: '#d2c3a2', stone: true, board: '#120c06', goods: '#ffd27a', door: 'grand', marquee: true, blade: 'CASINO', roof: 'flag', columns: true, prop: 'carpet' },
  logistics_hub: { label: 'GENOVA TRUCKING CO.', w: 11, h: 10.4, d: 10, wall: '#6a3a2a', board: '#20301f', goods: '#f2b45c', door: 'garage', roof: 'tank' },
  skylot_plaza: { label: 'BANCA ITALIANA', sub: 'est. 1902', w: 10, h: 21, d: 9, wall: '#c8b898', stone: true, board: '#1a1410', goods: '#ffe0a8', door: 'grand', roof: 'deco', columns: true },
  charter_row: { label: 'ATLANTIC SHIPPING LINE', w: 14, h: 9.6, d: 10, wall: '#54372a', awning: ['#0e2a4a', '#efe4c6'], board: '#0e1c2c', goods: '#ffcf88', door: 'shop', roof: 'flag' },
}

/* ------------------------------------------------------------------ world */

type Person = {
  root: TransformNode
  yaw: TransformNode
  legL: TransformNode
  legR: TransformNode
  armL: TransformNode
  armR: TransformNode
  head: Mesh
  ember: Mesh | null
}

type Walker = Person & { speed: number; dir: 1 | -1; phase: number; z: number }
type Idler = Person & { phase: number; smoke: boolean }

type Car = {
  root: TransformNode
  speed: number
  dir: 1 | -1
  lane: number
  cop: boolean
  copLamp: Mesh | null
}

type Biz = {
  root: TransformNode
  id: string
  x: number
  spawnT: number
  raid: TransformNode
  scale: number
}

export function createCityWorld(canvas: HTMLCanvasElement, initialSnap: EmpireSnapshot): CityWorld {
  const engine = new Engine(canvas, true, { preserveDrawingBuffer: false, stencil: true, antialias: true }, true)
  const dpr = window.devicePixelRatio || 1
  if (dpr > 2) engine.setHardwareScalingLevel(dpr / 2)
  const small = Math.min(window.innerWidth, window.innerHeight) < 700

  const scene = new Scene(engine)
  scene.skipPointerMovePicking = true
  scene.clearColor = new Color4(0.05, 0.035, 0.04, 1)
  scene.ambientColor = new Color3(0.12, 0.08, 0.06)
  scene.fogMode = Scene.FOGMODE_EXP2
  scene.fogDensity = 0.0075
  scene.fogColor = new Color3(0.2, 0.12, 0.1)

  const rnd = mulberry(1931)
  const disposers: (() => void)[] = []

  /* camera */
  const cam = new FreeCamera('cam', new Vector3(0, 4.4, 21), scene)
  cam.minZ = 0.3
  cam.maxZ = 700
  cam.setTarget(new Vector3(0, 7, -14))
  cam.inputs.clear()
  const fitFov = () => {
    const aspect = engine.getRenderWidth() / Math.max(1, engine.getRenderHeight())
    if (aspect < 1) {
      cam.fovMode = Camera.FOVMODE_HORIZONTAL_FIXED
      cam.fov = 1.2
    } else {
      cam.fovMode = Camera.FOVMODE_VERTICAL_FIXED
      cam.fov = 0.9
    }
  }
  fitFov()

  /* lights: keep <= 4 (materials use maxSimultaneousLights = 4) */
  const hemi = new HemisphericLight('hemi', new Vector3(0.1, 1, 0.3), scene)
  hemi.intensity = 0.5
  hemi.diffuse = new Color3(0.75, 0.62, 0.55)
  hemi.groundColor = new Color3(0.28, 0.16, 0.1)
  hemi.specular = new Color3(0.1, 0.08, 0.06)
  const moon = new DirectionalLight('moon', new Vector3(0.45, -0.6, -0.65), scene)
  moon.intensity = 0.32
  moon.diffuse = new Color3(0.62, 0.66, 0.9)
  moon.specular = new Color3(0.3, 0.32, 0.45)
  const fill = new PointLight('fill', new Vector3(0, 6.5, 1.5), scene)
  fill.intensity = 1.1
  fill.range = 70
  fill.diffuse = new Color3(1, 0.68, 0.38)
  fill.specular = new Color3(1, 0.7, 0.4)
  const strobe = new PointLight('strobe', new Vector3(0, 3, -4), scene)
  strobe.intensity = 0
  strobe.range = 26
  strobe.diffuse = new Color3(1, 0.1, 0.06)

  /* materials */
  const matCache = new Map<string, StandardMaterial>()
  const M = (hex: string, glow = 0.16, spec = 0.08) => {
    const key = `${hex}|${glow}|${spec}`
    let m = matCache.get(key)
    if (!m) {
      m = new StandardMaterial(`m-${key}`, scene)
      m.diffuseColor = c3(hex)
      m.emissiveColor = c3(hex, glow)
      m.specularColor = new Color3(spec, spec, spec)
      m.maxSimultaneousLights = 4
      matCache.set(key, m)
    }
    return m
  }
  const E = (hex: string, k = 1) => {
    const key = `E${hex}|${k}`
    let m = matCache.get(key)
    if (!m) {
      m = new StandardMaterial(`e-${key}`, scene)
      m.disableLighting = true
      m.emissiveColor = c3(hex, k)
      m.diffuseColor = Color3.Black()
      m.specularColor = Color3.Black()
      matCache.set(key, m)
    }
    return m
  }
  const iron = M('#141210', 0.05, 0.25)
  const chrome = M('#b8b0a0', 0.12, 0.9)
  const glass = M('#1a1c22', 0.05, 0.9)
  const lampGlass = E('#ffcf86', 1.25)
  const glowMeshes: AbstractMesh[] = []
  const mirrorMeshes: AbstractMesh[] = []

  const softDot = radialTex(scene, 'soft', [
    [0, 'rgba(255,255,255,1)'],
    [0.4, 'rgba(255,255,255,0.45)'],
    [1, 'rgba(255,255,255,0)'],
  ], 64, 64)
  const poolTex = radialTex(scene, 'pool', [
    [0, 'rgba(255,190,110,0.85)'],
    [0.35, 'rgba(255,150,70,0.35)'],
    [1, 'rgba(255,120,50,0)'],
  ])
  const shadowTex = radialTex(scene, 'shadow', [
    [0, 'rgba(0,0,0,0.75)'],
    [0.6, 'rgba(0,0,0,0.35)'],
    [1, 'rgba(0,0,0,0)'],
  ], 64, 64)
  const additive = (name: string, tex: Texture, k = 1) => {
    const m = new StandardMaterial(name, scene)
    m.disableLighting = true
    m.emissiveTexture = tex
    m.opacityTexture = tex
    m.emissiveColor = new Color3(k, k, k)
    m.diffuseColor = Color3.Black()
    m.specularColor = Color3.Black()
    m.alphaMode = Engine.ALPHA_ADD
    m.disableDepthWrite = true
    m.backFaceCulling = false
    m.fogEnabled = false
    return m
  }
  const poolMat = additive('pool-m', poolTex, 0.9)
  const haloMat = additive('halo-m', softDot, 0.35)
  haloMat.emissiveColor = new Color3(1, 0.7, 0.4).scale(0.45)
  const shadowMat = new StandardMaterial('shadow-m', scene)
  shadowMat.disableLighting = true
  shadowMat.diffuseColor = Color3.Black()
  shadowMat.emissiveColor = Color3.Black()
  shadowMat.opacityTexture = shadowTex
  shadowMat.disableDepthWrite = true
  shadowMat.specularColor = Color3.Black()
  const decal = (name: string, mat: StandardMaterial, w: number, h: number, x: number, y: number, z: number, parent?: TransformNode) => {
    const p = MeshBuilder.CreateGround(name, { width: w, height: h }, scene)
    p.material = mat
    p.position.set(x, y, z)
    if (parent) p.parent = parent
    p.isPickable = false
    return p
  }

  /* ---------------------------------------------------------------- sky */
  {
    const t = dyn(scene, 'sky', 1024, 512)
    const ctx = ctxOf(t)
    const g = ctx.createLinearGradient(0, 0, 0, 512)
    g.addColorStop(0, '#070814')
    g.addColorStop(0.35, '#1c1530')
    g.addColorStop(0.62, '#4a2a3a')
    g.addColorStop(0.82, '#a8563a')
    g.addColorStop(1, '#e09a55')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, 1024, 512)
    const sr = mulberry(77)
    for (let i = 0; i < 260; i++) {
      const y = sr() * 260
      ctx.fillStyle = `rgba(255,240,220,${(0.25 + sr() * 0.6) * (1 - y / 300)})`
      const s = sr() < 0.08 ? 2 : 1
      ctx.fillRect(sr() * 1024, y, s, s)
    }
    for (let i = 0; i < 9; i++) {
      const cy = 230 + sr() * 150
      const cg = ctx.createLinearGradient(0, cy - 12, 0, cy + 12)
      cg.addColorStop(0, 'rgba(60,30,40,0)')
      cg.addColorStop(0.5, `rgba(60,28,36,${0.25 + sr() * 0.25})`)
      cg.addColorStop(1, 'rgba(60,30,40,0)')
      ctx.fillStyle = cg
      ctx.fillRect(sr() * 900 - 200, cy - 12, 300 + sr() * 400, 24)
    }
    t.update()
    const sky = MeshBuilder.CreatePlane('sky', { width: 900, height: 330 }, scene)
    sky.position.set(0, 120, -240)
    sky.rotation.y = Math.PI
    const m = new StandardMaterial('sky-m', scene)
    m.disableLighting = true
    m.emissiveTexture = t
    m.diffuseColor = Color3.Black()
    m.specularColor = Color3.Black()
    m.fogEnabled = false
    m.backFaceCulling = false
    sky.material = m
    sky.isPickable = false

    const moonTex = dyn(scene, 'moon', 256, 256, true)
    const mc = ctxOf(moonTex)
    const mg = mc.createRadialGradient(128, 128, 0, 128, 128, 128)
    mg.addColorStop(0, 'rgba(255,246,222,1)')
    mg.addColorStop(0.22, 'rgba(255,238,205,1)')
    mg.addColorStop(0.25, 'rgba(255,220,170,0.35)')
    mg.addColorStop(0.6, 'rgba(255,190,140,0.08)')
    mg.addColorStop(1, 'rgba(255,190,140,0)')
    mc.fillStyle = mg
    mc.fillRect(0, 0, 256, 256)
    mc.fillStyle = 'rgba(200,180,150,0.35)'
    for (const [x, y, r] of [[118, 120, 9], [140, 136, 6], [124, 146, 5], [136, 112, 4]]) {
      mc.beginPath()
      mc.arc(x, y, r, 0, Math.PI * 2)
      mc.fill()
    }
    moonTex.update()
    const moonP = MeshBuilder.CreatePlane('moon', { size: 70 }, scene)
    moonP.position.set(70, 150, -230)
    moonP.rotation.y = Math.PI
    moonP.material = additive('moon-m', moonTex, 1)
    moonP.isPickable = false
  }

  /* ---------------------------------------------------------------- distant skyline */
  const paintSkyline = (seed: number, opts: { color: string; win: string; winRate: number; landmarks: boolean; h: number }) => {
    const W = 2048
    const H = 512
    const t = dyn(scene, `skyline-${seed}`, W, H, true)
    const ctx = ctxOf(t)
    ctx.clearRect(0, 0, W, H)
    const r = mulberry(seed)
    ctx.fillStyle = opts.color
    let x = 0
    const lights: [number, number][] = []
    while (x < W) {
      const bw = 30 + r() * 80
      const bh = opts.h * (0.25 + r() * 0.5)
      ctx.fillRect(x, H - bh, bw + 1, bh)
      if (r() < 0.35) {
        const tx = x + bw * (0.2 + r() * 0.5)
        ctx.fillRect(tx - 1, H - bh - 18, 2, 18)
        ctx.fillRect(tx + 12, H - bh - 18, 2, 18)
        ctx.beginPath()
        ctx.moveTo(tx - 4, H - bh - 18)
        ctx.lineTo(tx + 18, H - bh - 18)
        ctx.lineTo(tx + 18, H - bh - 38)
        ctx.lineTo(tx + 7, H - bh - 46)
        ctx.lineTo(tx - 4, H - bh - 38)
        ctx.fill()
      }
      for (let wy = H - bh + 8; wy < H - 4; wy += 9)
        for (let wx = x + 4; wx < x + bw - 4; wx += 8) if (r() < opts.winRate) lights.push([wx, wy])
      x += bw + (r() < 0.2 ? 6 : 0)
    }
    if (opts.landmarks) {
      // church steeple with cross
      const sx = 560
      ctx.fillRect(sx - 26, H - opts.h * 0.7, 52, opts.h * 0.7)
      ctx.beginPath()
      ctx.moveTo(sx - 30, H - opts.h * 0.7)
      ctx.lineTo(sx, H - opts.h * 1.15)
      ctx.lineTo(sx + 30, H - opts.h * 0.7)
      ctx.fill()
      ctx.fillRect(sx - 2, H - opts.h * 1.28, 4, opts.h * 0.14)
      ctx.fillRect(sx - 10, H - opts.h * 1.24, 20, 4)
      ctx.fillStyle = '#ffd890'
      ctx.beginPath()
      ctx.arc(sx, H - opts.h * 0.6, 9, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = opts.color
      // art-deco spire
      const dx = 1380
      const steps = [[90, 0.75], [70, 0.95], [50, 1.1], [30, 1.22]] as const
      for (const [w, k] of steps) ctx.fillRect(dx - w / 2, H - opts.h * k, w, opts.h * k)
      ctx.beginPath()
      ctx.moveTo(dx - 15, H - opts.h * 1.22)
      ctx.lineTo(dx, H - opts.h * 1.55)
      ctx.lineTo(dx + 15, H - opts.h * 1.22)
      ctx.fill()
      for (let k = 0; k < 40; k++) lights.push([dx - 40 + r() * 80, H - opts.h * (0.1 + r() * 0.8)])
      // suspension bridge
      const b0 = 1650
      const b1 = 2010
      const deck = H - 70
      ctx.fillRect(b0 - 200, deck, b1 - b0 + 400, 8)
      for (const bx of [b0, b1]) {
        ctx.fillRect(bx - 9, deck - 150, 18, 150 + 70)
        ctx.clearRect(bx - 4, deck - 120, 8, 30)
      }
      ctx.strokeStyle = opts.color
      ctx.lineWidth = 3
      ctx.beginPath()
      ctx.moveTo(b0 - 200, deck)
      ctx.quadraticCurveTo(b0 - 60, deck - 60, b0, deck - 148)
      ctx.quadraticCurveTo((b0 + b1) / 2, deck + 30, b1, deck - 148)
      ctx.quadraticCurveTo(b1 + 60, deck - 60, b1 + 200, deck)
      ctx.stroke()
      ctx.fillStyle = '#ffe2a6'
      for (let k = 0; k <= 30; k++) {
        const tt = k / 30
        const px = b0 + (b1 - b0) * tt
        const py = (1 - tt) * (1 - tt) * (deck - 148) + 2 * (1 - tt) * tt * (deck + 30) + tt * tt * (deck - 148)
        ctx.fillRect(px - 1.5, py - 1.5, 3, 3)
        ctx.fillRect(px - 1, deck - 3, 2, 2)
      }
    }
    ctx.fillStyle = opts.win
    for (const [lx, ly] of lights) ctx.fillRect(lx, ly, 3, 4)
    t.update()
    return t
  }
  const skylineLayer = (name: string, tex: DynamicTexture, w: number, h: number, z: number, k: number) => {
    const p = MeshBuilder.CreatePlane(name, { width: w, height: h }, scene)
    p.position.set(0, h / 2 - 1, z)
    p.rotation.y = Math.PI
    const m = new StandardMaterial(`${name}-m`, scene)
    m.disableLighting = true
    m.diffuseTexture = tex
    m.emissiveTexture = tex
    m.opacityTexture = tex
    m.emissiveColor = new Color3(k, k, k)
    m.specularColor = Color3.Black()
    m.fogEnabled = false
    m.backFaceCulling = false
    p.material = m
    p.isPickable = false
  }
  skylineLayer('sky-far', paintSkyline(5, { color: '#3a2433', win: '#ffcf8a', winRate: 0.05, landmarks: true, h: 300 }), 520, 130, -150, 1)
  skylineLayer('sky-mid', paintSkyline(9, { color: '#1c1218', win: '#ffc070', winRate: 0.09, landmarks: false, h: 380 }), 300, 75, -70, 1)

  /* ---------------------------------------------------------------- ground: cobbles, sidewalks */
  const ground = MeshBuilder.CreateGround('ground', { width: 600, height: 300 }, scene)
  ground.position.set(0, -0.02, -120)
  ground.material = M('#120c0a', 0.05, 0)

  const cobbleTex = dyn(scene, 'cobbles', 1024, 512)
  {
    const ctx = ctxOf(cobbleTex)
    ctx.fillStyle = '#0e0b0a'
    ctx.fillRect(0, 0, 1024, 512)
    const cr = mulberry(41)
    const rowH = 18
    for (let y = 0, row = 0; y < 512; y += rowH, row++) {
      for (let x = row % 2 ? -12 : 0; x < 1024; x += 22 + cr() * 6) {
        const k = 0.75 + cr() * 0.5
        ctx.fillStyle = `rgb(${Math.round(70 * k)},${Math.round(60 * k)},${Math.round(54 * k)})`
        ctx.beginPath()
        ctx.roundRect(x + 2, y + 2, 20 + cr() * 4, rowH - 4, 6)
        ctx.fill()
        ctx.fillStyle = 'rgba(255,220,180,0.08)'
        ctx.fillRect(x + 5, y + 4, 10, 3)
      }
    }
    cobbleTex.update()
    cobbleTex.wrapU = Texture.WRAP_ADDRESSMODE
    cobbleTex.wrapV = Texture.WRAP_ADDRESSMODE
  }
  const roadW = CURB_NEAR - CURB_FAR
  const road = MeshBuilder.CreateGround('road', { width: 240, height: roadW }, scene)
  road.position.set(0, 0, (CURB_FAR + CURB_NEAR) / 2)
  const roadMat = new StandardMaterial('road-m', scene)
  roadMat.diffuseTexture = cobbleTex
  cobbleTex.uScale = 240 / 9
  cobbleTex.vScale = roadW / 4.5
  roadMat.specularColor = new Color3(0.45, 0.35, 0.28)
  roadMat.specularPower = 48
  roadMat.emissiveColor = new Color3(0.05, 0.035, 0.03)
  roadMat.maxSimultaneousLights = 4
  const mirror = new MirrorTexture('wet', small ? 256 : 512, scene, true)
  mirror.mirrorPlane = new Plane(0, -1, 0, 0)
  mirror.level = 0.32
  mirror.adaptiveBlurKernel = 24
  roadMat.reflectionTexture = mirror
  road.material = roadMat

  // trolley rails
  for (const rz of [1.25, 2.55]) {
    const rail = MeshBuilder.CreateBox('rail', { width: 240, height: 0.03, depth: 0.08 }, scene)
    rail.position.set(0, 0.015, rz)
    rail.material = chrome
  }
  // manholes
  for (const mx of [-9, 17]) {
    const mh = MeshBuilder.CreateCylinder('manhole', { diameter: 0.9, height: 0.02, tessellation: 20 }, scene)
    mh.position.set(mx, 0.01, 3.3)
    mh.material = iron
  }

  const slabTex = dyn(scene, 'slabs', 512, 512)
  {
    const ctx = ctxOf(slabTex)
    const sr = mulberry(12)
    for (let y = 0; y < 4; y++)
      for (let x = 0; x < 4; x++) {
        const k = 0.8 + sr() * 0.3
        ctx.fillStyle = `rgb(${Math.round(92 * k)},${Math.round(84 * k)},${Math.round(76 * k)})`
        ctx.fillRect(x * 128, y * 128, 128, 128)
        ctx.fillStyle = 'rgba(0,0,0,0.12)'
        for (let i = 0; i < 6; i++) ctx.fillRect(x * 128 + sr() * 120, y * 128 + sr() * 120, 3 + sr() * 12, 2 + sr() * 8)
        ctx.strokeStyle = '#2a2420'
        ctx.lineWidth = 3
        ctx.strokeRect(x * 128, y * 128, 128, 128)
      }
    slabTex.update()
    slabTex.wrapU = Texture.WRAP_ADDRESSMODE
    slabTex.wrapV = Texture.WRAP_ADDRESSMODE
    slabTex.uScale = 240 / 6
    slabTex.vScale = 2
  }
  const walkMat = new StandardMaterial('walk-m', scene)
  walkMat.diffuseTexture = slabTex
  walkMat.specularColor = new Color3(0.08, 0.07, 0.06)
  walkMat.emissiveColor = new Color3(0.06, 0.045, 0.035)
  walkMat.maxSimultaneousLights = 4
  const curbMat = M('#6e655a', 0.1, 0.1)
  const farWalkD = CURB_FAR - TENEMENT_Z
  const farWalk = MeshBuilder.CreateBox('walk-far', { width: 240, height: WALK_Y, depth: farWalkD }, scene)
  farWalk.position.set(0, WALK_Y / 2, (CURB_FAR + TENEMENT_Z) / 2)
  farWalk.material = walkMat
  const nearWalk = MeshBuilder.CreateBox('walk-near', { width: 240, height: WALK_Y, depth: 7 }, scene)
  nearWalk.position.set(0, WALK_Y / 2, CURB_NEAR + 3.5)
  nearWalk.material = walkMat
  for (const cz of [CURB_FAR + 0.1, CURB_NEAR - 0.1]) {
    const curb = MeshBuilder.CreateBox('curb', { width: 240, height: WALK_Y + 0.02, depth: 0.22 }, scene)
    curb.position.set(0, (WALK_Y + 0.02) / 2, cz)
    curb.material = curbMat
  }

  /* ---------------------------------------------------------------- gas lamps */
  {
    const parts: Mesh[] = []
    const base = MeshBuilder.CreateCylinder('lb', { height: 0.7, diameterTop: 0.2, diameterBottom: 0.42, tessellation: 10 }, scene)
    base.position.y = 0.35
    const shaft = MeshBuilder.CreateCylinder('ls', { height: 3.9, diameter: 0.12, tessellation: 8 }, scene)
    shaft.position.y = 2.6
    const collar = MeshBuilder.CreateCylinder('lc', { height: 0.12, diameter: 0.26, tessellation: 10 }, scene)
    collar.position.y = 4.5
    const cap = MeshBuilder.CreateCylinder('lcap', { height: 0.34, diameterTop: 0.04, diameterBottom: 0.62, tessellation: 4 }, scene)
    cap.position.y = 5.32
    cap.rotation.y = Math.PI / 4
    const fin = MeshBuilder.CreateSphere('lf', { diameter: 0.1, segments: 4 }, scene)
    fin.position.y = 5.55
    const frame = MeshBuilder.CreateCylinder('lfr', { height: 0.1, diameterTop: 0.5, diameterBottom: 0.3, tessellation: 4 }, scene)
    frame.position.y = 4.6
    frame.rotation.y = Math.PI / 4
    parts.push(base, shaft, collar, cap, fin, frame)
    const lampIron = Mesh.MergeMeshes(parts, true, true)!
    lampIron.material = iron
    const glassM = MeshBuilder.CreateCylinder('lg', { height: 0.55, diameterTop: 0.56, diameterBottom: 0.36, tessellation: 4 }, scene)
    glassM.position.y = 4.92
    glassM.rotation.y = Math.PI / 4
    glassM.bakeCurrentTransformIntoVertices()
    glassM.material = lampGlass
    glowMeshes.push(glassM)
    const halo = MeshBuilder.CreatePlane('halo', { size: 2.6 }, scene)
    halo.material = haloMat
    halo.billboardMode = Mesh.BILLBOARDMODE_ALL
    halo.position.y = 4.92
    halo.bakeCurrentTransformIntoVertices()
    const poolT = decal('lpool', poolMat, 7, 7, 0, 0, 0)
    const spots: [number, number, number][] = []
    for (let x = -54; x <= 54; x += 12) spots.push([x, WALK_Y, CURB_FAR - 0.45])
    for (const x of [-16, 16]) spots.push([x, WALK_Y, CURB_NEAR + 0.45])
    spots.forEach(([x, y, z], i) => {
      const iro = i === 0 ? lampIron : lampIron.createInstance(`li${i}`)
      const gl = i === 0 ? glassM : glassM.createInstance(`lgi${i}`)
      const ha = i === 0 ? halo : halo.createInstance(`lhi${i}`)
      for (const m of [iro, gl, ha]) m.position.set(x, y, z)
      const p = i === 0 ? poolT : poolT.createInstance(`lpi${i}`)
      p.position.set(x, y + 0.012, z)
      mirrorMeshes.push(gl, ha)
      const rp = poolT.createInstance(`lrp${i}`)
      rp.position.set(x, 0.012, z + (z < 0 ? 2.6 : -2.6))
      rp.scaling.set(0.8, 1, 0.55)
    })
    // hydrant
    const hyd = Mesh.MergeMeshes([
      Object.assign(MeshBuilder.CreateCylinder('h1', { height: 0.6, diameter: 0.28, tessellation: 10 }, scene), {}),
      MeshBuilder.CreateSphere('h2', { diameter: 0.3, segments: 6 }, scene),
    ], true, true)!
    hyd.material = M('#8a1e16', 0.18, 0.3)
    hyd.position.set(-11, WALK_Y + 0.3, CURB_FAR - 0.6)
  }

  /* ---------------------------------------------------------------- props */
  const railTex = dyn(scene, 'railing', 256, 96, true)
  {
    const ctx = ctxOf(railTex)
    ctx.clearRect(0, 0, 256, 96)
    ctx.fillStyle = '#000'
    ctx.fillRect(0, 0, 256, 6)
    ctx.fillRect(0, 88, 256, 8)
    ctx.fillRect(0, 44, 256, 3)
    for (let x = 0; x < 256; x += 12) ctx.fillRect(x, 0, 3, 96)
    railTex.update()
  }
  const railMat = new StandardMaterial('rail-m', scene)
  railMat.diffuseTexture = railTex
  railMat.opacityTexture = railTex
  railMat.diffuseColor = new Color3(0.08, 0.07, 0.06)
  railMat.emissiveColor = new Color3(0.02, 0.015, 0.01)
  railMat.specularColor = new Color3(0.2, 0.2, 0.2)
  railMat.backFaceCulling = false

  const fireEscape = (parent: TransformNode, xc: number, floors: number, floorH: number, groundH: number, faceZ: number) => {
    const iparts: Mesh[] = []
    const rparts: Mesh[] = []
    for (let f = 1; f <= floors; f++) {
      const y = groundH + (f - 1) * floorH + 0.15
      const plat = MeshBuilder.CreateBox('fep', { width: 2.6, height: 0.05, depth: 0.95 }, scene)
      plat.position.set(xc, y, faceZ + 0.47)
      iparts.push(plat)
      const front = MeshBuilder.CreatePlane('fer', { width: 2.6, height: 0.95 }, scene)
      front.position.set(xc, y + 0.48, faceZ + 0.95)
      front.rotation.y = Math.PI
      rparts.push(front)
      for (const sx of [-1.3, 1.3]) {
        const side = MeshBuilder.CreatePlane('fes', { width: 0.95, height: 0.95 }, scene)
        side.position.set(xc + sx, y + 0.48, faceZ + 0.47)
        side.rotation.y = Math.PI / 2
        rparts.push(side)
      }
      if (f < floors) {
        const run = 1.9
        const len = Math.hypot(run, floorH)
        for (const dz of [0.25, 0.7]) {
          const s = MeshBuilder.CreateBox('fest', { width: len, height: 0.05, depth: 0.04 }, scene)
          s.position.set(xc + (f % 2 ? 0.1 : -0.1), y + floorH / 2, faceZ + dz)
          s.rotation.z = (f % 2 ? 1 : -1) * Math.atan2(floorH, run)
          iparts.push(s)
        }
      } else {
        const lad = MeshBuilder.CreateBox('fel', { width: 0.05, height: 0.05, depth: 0.05 }, scene)
        lad.position.set(xc, y + 0.6, faceZ + 0.3)
        iparts.push(lad)
      }
    }
    const drop = MeshBuilder.CreateBox('fed', { width: 0.5, height: 2.2, depth: 0.03 }, scene)
    drop.position.set(xc + 0.9, groundH - 0.95, faceZ + 0.92)
    rparts.push(drop)
    const im = Mesh.MergeMeshes(iparts, true, true)
    if (im) {
      im.material = iron
      im.parent = parent
    }
    const rm = Mesh.MergeMeshes(rparts, true, true)
    if (rm) {
      rm.material = railMat
      rm.parent = parent
    }
  }

  const woodTex = dyn(scene, 'tankwood', 256, 128)
  {
    const ctx = ctxOf(woodTex)
    const wr = mulberry(3)
    for (let x = 0; x < 256; x += 8) {
      ctx.fillStyle = shade('#5a3a24', 0.75 + wr() * 0.4)
      ctx.fillRect(x, 0, 8, 128)
    }
    ctx.fillStyle = '#16100c'
    for (const y of [14, 50, 86, 116]) ctx.fillRect(0, y, 256, 4)
    woodTex.update()
  }
  const tankMat = new StandardMaterial('tank-m', scene)
  tankMat.diffuseTexture = woodTex
  tankMat.emissiveColor = new Color3(0.08, 0.05, 0.04)
  tankMat.specularColor = Color3.Black()

  const waterTower = (parent: TransformNode, x: number, y: number, z: number, s = 1) => {
    const legs: Mesh[] = []
    for (const [lx, lz] of [[-0.7, -0.7], [0.7, -0.7], [-0.7, 0.7], [0.7, 0.7]]) {
      const l = MeshBuilder.CreateCylinder('wtl', { height: 1.8, diameter: 0.1, tessellation: 5 }, scene)
      l.position.set(lx, 0.9, lz)
      legs.push(l)
    }
    const deck = MeshBuilder.CreateCylinder('wtd', { height: 0.1, diameter: 2.3, tessellation: 12 }, scene)
    deck.position.y = 1.8
    legs.push(deck)
    const roof = MeshBuilder.CreateCylinder('wtr', { height: 0.95, diameterTop: 0.05, diameterBottom: 2.25, tessellation: 14 }, scene)
    roof.position.y = 4.55
    legs.push(roof)
    const lm = Mesh.MergeMeshes(legs, true, true)!
    lm.material = iron
    const barrel = MeshBuilder.CreateCylinder('wtb', { height: 2.3, diameter: 2.05, tessellation: 16 }, scene)
    barrel.position.y = 2.95
    barrel.material = tankMat
    const g = new TransformNode('wt', scene)
    lm.parent = g
    barrel.parent = g
    g.parent = parent
    g.position.set(x, y, z)
    g.scaling.setAll(s)
  }

  /* ---------------------------------------------------------------- tenements */
  const tenements = new TransformNode('tenements', scene)
  const smokeSpots: Vector3[] = []
  {
    let x = -78
    let i = 0
    while (x < 78) {
      const w = 7 + rnd() * 4.5
      const floors = 3 + Math.floor(rnd() * 3)
      const floorH = 3.2
      const groundH = 4.3
      const cornice = 1.0
      const h = groundH + floors * floorH + cornice
      const cx = x + w / 2
      const wallHex = ['#7a3b2a', '#8c4a32', '#6a3226', '#9a6a4a', '#5e2e24', '#7e5a44'][Math.floor(rnd() * 6)]
      const depth = 10
      const body = MeshBuilder.CreateBox(`ten${i}`, { width: w, height: h, depth }, scene)
      body.position.set(cx, h / 2, TENEMENT_Z - depth / 2)
      body.material = M(shade(wallHex, 0.5).replace(/rgba\((\d+),(\d+),(\d+),1\)/, (_, r, g, b) => '#' + [r, g, b].map((v) => Number(v).toString(16).padStart(2, '0')).join('')), 0.05, 0)
      body.parent = tenements
      const { dt, et } = paintFacade(scene, `tf${i}`, {
        wM: w,
        hM: h,
        wall: wallHex,
        stone: false,
        cols: Math.max(2, Math.round(w / 1.7)),
        floors,
        groundH,
        corniceH: cornice,
        lit: 0.42,
        seed: 100 + i,
        goods: ['#ffb860', '#ffd08a', '#f2a050', '#ffe0b0'][i % 4],
        door: 'shop',
        shopName: SHOP_NAMES[i % SHOP_NAMES.length],
        shopBoard: BOARD_COLORS[i % BOARD_COLORS.length],
        ghost: rnd() < 0.25 ? GHOST_ADS[i % GHOST_ADS.length] : undefined,
        arched: rnd() < 0.3,
      })
      const face = MeshBuilder.CreatePlane(`tface${i}`, { width: w, height: h }, scene)
      face.position.set(cx, h / 2, TENEMENT_Z + 0.02)
      face.rotation.y = Math.PI
      const fm = new StandardMaterial(`tface-m${i}`, scene)
      fm.diffuseTexture = dt
      fm.emissiveTexture = et
      fm.emissiveColor = new Color3(1, 1, 1)
      fm.specularColor = new Color3(0.05, 0.05, 0.05)
      fm.maxSimultaneousLights = 4
      face.material = fm
      face.parent = tenements
      mirrorMeshes.push(face)
      const corn = MeshBuilder.CreateBox('corn', { width: w + 0.3, height: 0.45, depth: 0.7 }, scene)
      corn.position.set(cx, h - 0.2, TENEMENT_Z + 0.25)
      corn.material = M('#b8a07c', 0.12, 0.05)
      corn.parent = tenements
      const storeCorn = MeshBuilder.CreateBox('scorn', { width: w, height: 0.2, depth: 0.35 }, scene)
      storeCorn.position.set(cx, groundH, TENEMENT_Z + 0.15)
      storeCorn.material = M('#2a1d14', 0.08, 0.1)
      storeCorn.parent = tenements
      if (w > 7.5) fireEscape(tenements, cx + (rnd() < 0.5 ? -w * 0.22 : w * 0.22), floors, floorH, groundH, TENEMENT_Z)
      if (rnd() < 0.5) waterTower(tenements, cx + (rnd() - 0.5) * w * 0.4, h, TENEMENT_Z - 4, 0.9 + rnd() * 0.3)
      const ch = MeshBuilder.CreateBox('chim', { width: 0.7, height: 1.4, depth: 0.7 }, scene)
      const chx = cx + (rnd() - 0.5) * w * 0.7
      ch.position.set(chx, h + 0.7, TENEMENT_Z - 2 - rnd() * 5)
      ch.material = M('#4a2a20', 0.06, 0)
      ch.parent = tenements
      if (Math.abs(chx) < 30) smokeSpots.push(new Vector3(chx, h + 1.5, ch.position.z))
      // alley + laundry line
      const gap = rnd() < 0.35 ? 1.6 + rnd() * 1.2 : 0
      if (gap > 0) {
        for (const ly of [6.5 + rnd(), 9.5 + rnd()]) {
          const a = new Vector3(x + w, ly, TENEMENT_Z - 1.5)
          const b = new Vector3(x + w + gap, ly - 0.1, TENEMENT_Z - 1.5)
          const line = MeshBuilder.CreateLines('cl', { points: [a, Vector3.Lerp(a, b, 0.5).add(new Vector3(0, -0.2, 0)), b] }, scene)
          line.color = new Color3(0.5, 0.45, 0.4)
          line.parent = tenements
          for (let k = 0; k < 2; k++) {
            const cloth = MeshBuilder.CreatePlane('cloth', { width: 0.45, height: 0.6 }, scene)
            cloth.position.set(x + w + gap * (0.3 + k * 0.4), ly - 0.5, TENEMENT_Z - 1.5)
            cloth.rotation.y = Math.PI
            cloth.material = M(['#e8e0d0', '#b84a3a', '#d8c8a0', '#4a6a8a'][Math.floor(rnd() * 4)], 0.2, 0)
            cloth.material.backFaceCulling = false
            cloth.parent = tenements
          }
        }
      }
      x += w + gap
      i++
    }
  }

  /* ---------------------------------------------------------------- festa lights */
  const bulbMesh = (name: string, hex: string) => {
    const m = MeshBuilder.CreateSphere(name, { diameter: 0.14, segments: 3 }, scene)
    m.material = E(hex, 1.3)
    glowMeshes.push(m)
    mirrorMeshes.push(m)
    return m
  }
  const BULB_HEX = ['#ffd9a0', '#ff4a36', '#5ad26a']
  type BulbSet = { add: (c: number, p: Vector3) => void; commit: (parent?: TransformNode) => Mesh[] }
  const bulbSet = (name: string): BulbSet => {
    const pts: Matrix[][] = [[], [], []]
    return {
      add: (c, p) => pts[c].push(Matrix.Translation(p.x, p.y, p.z)),
      commit: (parent) =>
        pts
          .map((list, c) => {
            if (!list.length) return null
            const m = bulbMesh(`${name}-${c}`, BULB_HEX[c])
            m.thinInstanceAdd(list)
            m.thinInstanceRefreshBoundingInfo()
            if (parent) m.parent = parent
            return m
          })
          .filter((m): m is Mesh => !!m),
    }
  }
  const sag = (a: Vector3, b: Vector3, depth: number, n: number) => {
    const out: Vector3[] = []
    for (let k = 0; k < n; k++) {
      const t = k / (n - 1)
      out.push(Vector3.Lerp(a, b, t).add(new Vector3(0, -depth * 4 * t * (1 - t), 0)))
    }
    return out
  }
  {
    const set = bulbSet('strings')
    let c = 0
    for (let x = -48; x <= 48; x += 12) {
      const a = new Vector3(x + 6, 7.4, TENEMENT_Z + 0.3)
      const b = new Vector3(x + 9, 6.6, 11)
      const pts = sag(a, b, 1.1, 36)
      const wire = MeshBuilder.CreateLines('wire', { points: pts }, scene)
      wire.color = new Color3(0.06, 0.05, 0.04)
      pts.forEach((p, k) => {
        if (k % 1 === 0) set.add([0, 0, 1, 0, 0, 2][(c + k) % 6], p.add(new Vector3(0, -0.08, 0)))
      })
      c++
    }
    // along the far facades above the awnings
    for (let x = -60; x < 60; x += 6) {
      const pts = sag(new Vector3(x, 5.0, TENEMENT_Z + 1.4), new Vector3(x + 6, 5.0, TENEMENT_Z + 1.4), 0.5, 10)
      const wire = MeshBuilder.CreateLines('wire2', { points: pts }, scene)
      wire.color = new Color3(0.06, 0.05, 0.04)
      pts.forEach((p, k) => k > 0 && set.add(k % 3 === 0 ? 1 + (k % 2) : 0, p.add(new Vector3(0, -0.08, 0))))
    }
    set.commit()
  }
  const arches: TransformNode[] = []
  for (const ax of [-15, 15, -33, 33]) {
    const node = new TransformNode(`arch${ax}`, scene)
    node.position.set(ax, 0, 0)
    const set = bulbSet(`arch${ax}`)
    const zc = (CURB_FAR + CURB_NEAR) / 2
    const half = (CURB_NEAR - CURB_FAR) / 2 + 0.3
    const spring = 4.6
    for (const [r, col] of [[half, 0], [half - 0.55, 1], [half - 1.1, 0]] as const) {
      const n = Math.round(r * 9)
      for (let k = 0; k <= n; k++) {
        const a = Math.PI * (k / n)
        set.add(col === 1 ? (k % 2 ? 1 : 2) : 0, new Vector3(0, spring + Math.sin(a) * r * 0.85, zc + Math.cos(a) * r))
      }
    }
    for (const side of [-half, half]) for (let y = 0.6; y < spring; y += 0.35) set.add(0, new Vector3(0, y, zc + side))
    for (let s = 0; s < 9; s++) {
      const a = Math.PI * (s / 8)
      for (let k = 1; k <= 3; k++) set.add(s % 2 ? 1 : 2, new Vector3(0, spring + Math.sin(a) * k * 0.55, zc + Math.cos(a) * k * 0.55))
    }
    for (let k = 0; k < 12; k++) {
      const a = (k / 12) * Math.PI * 2
      set.add(k % 2 ? 1 : 0, new Vector3(0, spring + half * 0.85 + 0.75 + Math.sin(a) * 0.45, zc + Math.cos(a) * 0.45))
    }
    const posts = MeshBuilder.CreateCylinder('archpost', { height: spring, diameter: 0.08, tessellation: 5 }, scene)
    posts.position.set(0, spring / 2, zc - half)
    posts.material = iron
    posts.parent = node
    const post2 = posts.clone('archpost2', node)
    post2.position.z = zc + half
    set.commit(node)
    node.setEnabled(false)
    arches.push(node)
  }

  /* ---------------------------------------------------------------- people */
  const SKIN = ['#e0b48f', '#c99872', '#a87652', '#f0c8a8', '#8a5a3a']
  const COATS = ['#2b2b2e', '#3a2f28', '#1f2a38', '#4a3b2a', '#55504a', '#2e3a2a', '#5a2a24', '#6b5a44']
  const PANTS = ['#1e1e22', '#2d2a26', '#3a3530', '#23262e']
  const HATS = ['#1a1a1a', '#3a3028', '#4b4038', '#2a2a30', '#7a6a52']
  const DRESS = ['#7a2a2a', '#2a4a6a', '#5a4a2a', '#3a5a3a', '#6a3a5a', '#8a6a4a']

  type Look = {
    coat: string
    pants: string
    skin: string
    hat: 'fedora' | 'cap' | 'cloche' | 'bowler' | 'police' | 'none'
    hatHex: string
    long: boolean
    dress: boolean
    scale: number
    tie: string
    prop?: 'paper' | 'case' | 'smoke'
    bulk?: number
  }

  const randomLook = (r: () => number): Look => {
    const dress = r() < 0.3
    if (dress)
      return { coat: DRESS[Math.floor(r() * DRESS.length)], pants: '#c8a080', skin: SKIN[Math.floor(r() * SKIN.length)], hat: 'cloche', hatHex: HATS[Math.floor(r() * HATS.length)], long: false, dress: true, scale: 0.93 + r() * 0.06, tie: '#e8e0d0' }
    const kid = r() < 0.12
    return {
      coat: COATS[Math.floor(r() * COATS.length)],
      pants: PANTS[Math.floor(r() * PANTS.length)],
      skin: SKIN[Math.floor(r() * SKIN.length)],
      hat: kid ? 'cap' : r() < 0.75 ? 'fedora' : r() < 0.5 ? 'bowler' : 'cap',
      hatHex: HATS[Math.floor(r() * HATS.length)],
      long: !kid && r() < 0.6,
      dress: false,
      scale: kid ? 0.74 : 0.97 + r() * 0.08,
      tie: ['#7a1a1a', '#1a2a4a', '#3a3a1a', '#5a1a3a'][Math.floor(r() * 4)],
      prop: kid ? 'paper' : r() < 0.15 ? 'case' : undefined,
    }
  }

  const buildPerson = (name: string, look: Look): Person => {
    const root = new TransformNode(name, scene)
    const yaw = new TransformNode(`${name}-yaw`, scene)
    yaw.parent = root
    const bulk = look.bulk ?? 1
    const coatM = M(look.coat, 0.2, 0.05)
    const skinM = M(look.skin, 0.22, 0.05)
    const hatM = M(look.hatHex, 0.18, 0.06)
    const pantsM = M(look.pants, 0.18, 0.04)
    const shoeM = M('#0e0a08', 0.05, 0.5)

    const parts: Mesh[] = []
    const add = (m: Mesh, mat: StandardMaterial) => {
      m.material = mat
      parts.push(m)
      return m
    }
    const torso = add(MeshBuilder.CreateCylinder('t', { height: 0.58, diameterTop: 0.44 * bulk, diameterBottom: 0.36 * bulk, tessellation: 12 }, scene), coatM)
    torso.position.y = 1.2
    torso.scaling.z = 0.62
    const sh = add(MeshBuilder.CreateSphere('sh', { diameter: 0.46 * bulk, segments: 8 }, scene), coatM)
    sh.position.y = 1.47
    sh.scaling.set(1, 0.32, 0.6)
    if (look.dress) {
      const sk = add(MeshBuilder.CreateCylinder('sk', { height: 0.62, diameterTop: 0.32, diameterBottom: 0.6, tessellation: 12 }, scene), coatM)
      sk.position.y = 0.66
      sk.scaling.z = 0.75
    } else if (look.long) {
      const sk = add(MeshBuilder.CreateCylinder('sk', { height: 0.5, diameterTop: 0.37 * bulk, diameterBottom: 0.47 * bulk, tessellation: 12 }, scene), coatM)
      sk.position.y = 0.73
      sk.scaling.z = 0.7
    } else {
      const belt = add(MeshBuilder.CreateCylinder('bt', { height: 0.14, diameter: 0.36 * bulk, tessellation: 12 }, scene), pantsM)
      belt.position.y = 0.9
      belt.scaling.z = 0.62
    }
    const shirt = add(MeshBuilder.CreateBox('sv', { width: 0.11, height: 0.22, depth: 0.02 }, scene), M('#e6dccb', 0.25, 0))
    shirt.position.set(0, 1.38, 0.135 * bulk)
    if (!look.dress) {
      const tie = add(MeshBuilder.CreateBox('ti', { width: 0.045, height: 0.24, depth: 0.02 }, scene), M(look.tie, 0.2, 0.1))
      tie.position.set(0, 1.35, 0.145 * bulk)
    }
    const neck = add(MeshBuilder.CreateCylinder('n', { height: 0.1, diameter: 0.1, tessellation: 8 }, scene), skinM)
    neck.position.y = 1.55
    const head = add(MeshBuilder.CreateSphere('h', { diameter: 0.23, segments: 10 }, scene), skinM)
    head.position.y = 1.68
    head.scaling.set(0.9, 1.06, 1)
    const nose = add(MeshBuilder.CreateBox('no', { width: 0.035, height: 0.06, depth: 0.06 }, scene), skinM)
    nose.position.set(0, 1.665, 0.11)
    switch (look.hat) {
      case 'fedora': {
        const brim = add(MeshBuilder.CreateCylinder('hb', { height: 0.016, diameter: 0.4, tessellation: 18 }, scene), hatM)
        brim.position.set(0, 1.775, 0.01)
        brim.scaling.z = 1.08
        const crown = add(MeshBuilder.CreateCylinder('hc', { height: 0.13, diameterTop: 0.18, diameterBottom: 0.225, tessellation: 14 }, scene), hatM)
        crown.position.y = 1.845
        crown.scaling.z = 1.1
        const band = add(MeshBuilder.CreateCylinder('hbd', { height: 0.03, diameter: 0.229, tessellation: 14 }, scene), M('#0c0a08', 0.05, 0.2))
        band.position.y = 1.798
        band.scaling.z = 1.1
        break
      }
      case 'bowler': {
        const brim = add(MeshBuilder.CreateCylinder('hb', { height: 0.014, diameter: 0.32, tessellation: 16 }, scene), hatM)
        brim.position.y = 1.77
        const dome = add(MeshBuilder.CreateSphere('hd', { diameter: 0.23, segments: 8 }, scene), hatM)
        dome.position.y = 1.8
        dome.scaling.y = 0.75
        break
      }
      case 'cap': {
        const capM = add(MeshBuilder.CreateSphere('cp', { diameter: 0.27, segments: 8 }, scene), hatM)
        capM.position.set(0, 1.77, -0.005)
        capM.scaling.y = 0.45
        const visor = add(MeshBuilder.CreateBox('cv', { width: 0.18, height: 0.014, depth: 0.1 }, scene), hatM)
        visor.position.set(0, 1.755, 0.14)
        break
      }
      case 'cloche': {
        const cl = add(MeshBuilder.CreateSphere('cl', { diameter: 0.27, segments: 8 }, scene), hatM)
        cl.position.y = 1.74
        cl.scaling.y = 0.78
        const br = add(MeshBuilder.CreateCylinder('clb', { height: 0.012, diameter: 0.3, tessellation: 14 }, scene), hatM)
        br.position.y = 1.69
        break
      }
      case 'police': {
        const pc = add(MeshBuilder.CreateCylinder('pc', { height: 0.1, diameterTop: 0.29, diameterBottom: 0.23, tessellation: 14 }, scene), hatM)
        pc.position.y = 1.83
        const visor = add(MeshBuilder.CreateBox('pv', { width: 0.2, height: 0.014, depth: 0.1 }, scene), M('#0a0a0a', 0.05, 0.6))
        visor.position.set(0, 1.78, 0.14)
        const badge = add(MeshBuilder.CreateBox('pb', { width: 0.05, height: 0.04, depth: 0.01 }, scene), M('#e0b040', 0.4, 0.8))
        badge.position.set(0, 1.84, 0.135)
        break
      }
      default: {
        const hair = add(MeshBuilder.CreateSphere('hr', { diameter: 0.24, segments: 8 }, scene), M('#1a120c', 0.1, 0.2))
        hair.position.set(0, 1.72, -0.012)
        hair.scaling.y = 0.72
      }
    }
    const bodyMesh = Mesh.MergeMeshes(parts, true, true, undefined, false, true)!
    bodyMesh.parent = yaw

    const limb = (side: number, kind: 'leg' | 'arm') => {
      const pivot = new TransformNode(`${name}-${kind}${side}`, scene)
      pivot.parent = yaw
      const ps: Mesh[] = []
      if (kind === 'leg') {
        pivot.position.set(side * 0.095 * bulk, 0.92, 0)
        const leg = MeshBuilder.CreateCylinder('lg', { height: 0.88, diameterTop: look.dress ? 0.1 : 0.15, diameterBottom: look.dress ? 0.08 : 0.13, tessellation: 8 }, scene)
        leg.position.y = -0.44
        leg.material = look.dress ? M(look.pants, 0.2, 0.1) : pantsM
        const shoe = MeshBuilder.CreateBox('shoe', { width: 0.1, height: 0.08, depth: 0.25 }, scene)
        shoe.position.set(0, -0.88, 0.05)
        shoe.material = shoeM
        ps.push(leg, shoe)
      } else {
        pivot.position.set(side * 0.25 * bulk, 1.45, 0)
        const arm = MeshBuilder.CreateCylinder('ar', { height: 0.6, diameterTop: 0.12 * bulk, diameterBottom: 0.1 * bulk, tessellation: 8 }, scene)
        arm.position.y = -0.3
        arm.material = coatM
        const hand = MeshBuilder.CreateSphere('hd', { diameter: 0.09, segments: 6 }, scene)
        hand.position.y = -0.62
        hand.material = skinM
        ps.push(arm, hand)
        if (side === 1 && look.prop === 'case') {
          const c = MeshBuilder.CreateBox('case', { width: 0.1, height: 0.3, depth: 0.42 }, scene)
          c.position.set(0, -0.78, 0)
          c.material = M('#4a2a14', 0.15, 0.3)
          ps.push(c)
        }
        if (side === -1 && look.prop === 'paper') {
          const p = MeshBuilder.CreateBox('paper', { width: 0.06, height: 0.24, depth: 0.32 }, scene)
          p.position.set(0, -0.6, 0.08)
          p.material = M('#e6dcc4', 0.3, 0)
          ps.push(p)
        }
      }
      const merged = Mesh.MergeMeshes(ps, true, true, undefined, false, true)!
      merged.parent = pivot
      return pivot
    }
    const legL = limb(-1, 'leg')
    const legR = limb(1, 'leg')
    const armL = limb(-1, 'arm')
    const armR = limb(1, 'arm')
    let ember: Mesh | null = null
    if (look.prop === 'smoke') {
      ember = MeshBuilder.CreateSphere('ember', { diameter: 0.03, segments: 3 }, scene)
      ember.material = E('#ff7a2a', 2)
      ember.parent = armR
      ember.position.set(0, -0.66, 0.05)
      glowMeshes.push(ember)
    }
    const sh2 = decal(`${name}-sh`, shadowMat, 0.8, 0.8, 0, 0.01, 0, root)
    void sh2
    root.scaling.setAll(look.scale)
    return { root, yaw, legL, legR, armL, armR, head: bodyMesh, ember }
  }

  const walkers: Walker[] = []
  const WALKER_LANES: [number, 1 | -1][] = [
    [-2.4, 1],
    [-3.7, -1],
    [-2.9, -1],
    [6.6, 1],
  ]
  const walkerCount = small ? 10 : 18
  for (let i = 0; i < walkerCount; i++) {
    const r = mulberry(500 + i)
    const [z, dir] = WALKER_LANES[i % WALKER_LANES.length]
    const p = buildPerson(`walker${i}`, randomLook(r))
    p.root.position.set(-45 + r() * 90, WALK_Y, z + (r() - 0.5) * 0.4)
    p.yaw.rotation.y = dir === 1 ? Math.PI / 2 : -Math.PI / 2
    walkers.push({ ...p, speed: 1.05 + r() * 0.45, dir, phase: r() * 6, z })
  }

  /* ---------------------------------------------------------------- cars */
  const cars: Car[] = []
  const beamTex = radialTex(scene, 'beam', [
    [0, 'rgba(255,220,160,0.7)'],
    [0.5, 'rgba(255,200,130,0.22)'],
    [1, 'rgba(255,190,120,0)'],
  ], 128, 64)
  const beamMat = additive('beam-m', beamTex, 0.8)
  const checkerTex = dyn(scene, 'checker', 128, 16)
  {
    const ctx = ctxOf(checkerTex)
    for (let x = 0; x < 16; x++)
      for (let y = 0; y < 2; y++) {
        ctx.fillStyle = (x + y) % 2 ? '#111' : '#eee'
        ctx.fillRect(x * 8, y * 8, 8, 8)
      }
    checkerTex.update()
  }
  const buildCar = (kind: 'sedan' | 'taxi' | 'cop' | 'truck', paintHex: string) => {
    const root = new TransformNode(`car-${kind}`, scene)
    const paint = M(paintHex, 0.12, 0.85)
    const dark = M('#0c0b0a', 0.04, 0.3)
    const tire = M('#0a0a0a', 0.02, 0.1)
    const ww = M('#ddd4c0', 0.2, 0.2)
    const parts: Mesh[] = []
    const box = (w: number, h: number, d: number, x: number, y: number, z: number, mat: StandardMaterial) => {
      const b = MeshBuilder.CreateBox('cb', { width: w, height: h, depth: d }, scene)
      b.position.set(x, y, z)
      b.material = mat
      parts.push(b)
      return b
    }
    const blob = (sx: number, sy: number, sz: number, x: number, y: number, z: number, mat: StandardMaterial) => {
      const s = MeshBuilder.CreateSphere('cs', { diameter: 1, segments: 10 }, scene)
      s.scaling.set(sx, sy, sz)
      s.position.set(x, y, z)
      s.material = mat
      parts.push(s)
      return s
    }
    const wheelX = kind === 'truck' ? [1.7, -1.6] : [1.45, -1.35]
    for (const wx of wheelX)
      for (const wz of [-0.78, 0.78]) {
        const t = MeshBuilder.CreateCylinder('w', { diameter: 0.74, height: 0.18, tessellation: 16 }, scene)
        t.rotation.x = Math.PI / 2
        t.position.set(wx, 0.37, wz)
        t.material = tire
        parts.push(t)
        const wwall = MeshBuilder.CreateCylinder('ww', { diameter: 0.5, height: 0.19, tessellation: 16 }, scene)
        wwall.rotation.x = Math.PI / 2
        wwall.position.set(wx, 0.37, wz)
        wwall.material = ww
        parts.push(wwall)
        const hub = MeshBuilder.CreateCylinder('hub', { diameter: 0.22, height: 0.2, tessellation: 10 }, scene)
        hub.rotation.x = Math.PI / 2
        hub.position.set(wx, 0.37, wz)
        hub.material = chrome
        parts.push(hub)
        blob(wx > 0 ? 1.25 : 1.1, 0.55, 0.42, wx + (wx > 0 ? 0.1 : -0.05), 0.62, wz * 1.02, paint)
      }
    box(kind === 'truck' ? 2.4 : 2.0, 0.06, 0.24, 0.05, 0.42, 0.82, dark)
    box(kind === 'truck' ? 2.4 : 2.0, 0.06, 0.24, 0.05, 0.42, -0.82, dark)
    box(1.45, 0.52, 1.0, 1.55, 0.95, 0, paint)
    box(0.1, 0.66, 0.64, 2.3, 0.94, 0, chrome)
    box(0.08, 0.5, 0.54, 2.33, 0.94, 0, dark)
    if (kind === 'truck') {
      box(1.3, 1.25, 1.5, 0.35, 1.3, 0, paint)
      box(1.1, 0.5, 1.52, 0.4, 1.55, 0, glass)
      box(3.2, 0.12, 1.8, -1.6, 0.8, 0, M('#3a2a1c', 0.1, 0.05))
      for (const [cx, cz, s] of [[-0.6, 0.4, 0.6], [-1.3, -0.4, 0.7], [-2.1, 0.3, 0.55], [-2.6, -0.35, 0.6], [-1.5, 0.4, 0.5]])
        box(s, s, s, cx, 0.86 + s / 2, cz, M('#8a6a44', 0.14, 0))
      for (const sz of [-0.88, 0.88]) box(3.2, 0.35, 0.05, -1.6, 1.05, sz, M('#4a3420', 0.1, 0))
    } else {
      box(2.9, 0.62, 1.5, -0.2, 0.86, 0, paint)
      box(1.95, 0.54, 1.38, -0.45, 1.44, 0, glass)
      box(2.05, 0.09, 1.46, -0.45, 1.75, 0, paint)
      box(0.1, 0.54, 1.42, -0.45, 1.44, 0, paint)
      box(0.08, 0.54, 1.42, 0.5, 1.44, 0, paint)
      blob(1.25, 1.05, 1.4, -1.62, 0.98, 0, paint)
      const spare = MeshBuilder.CreateCylinder('sp', { diameter: 0.66, height: 0.16, tessellation: 14 }, scene)
      spare.rotation.z = Math.PI / 2
      spare.position.set(-2.28, 1.0, 0)
      spare.material = tire
      parts.push(spare)
      if (kind === 'taxi') {
        const band = box(2.9, 0.1, 1.52, -0.2, 1.05, 0, new StandardMaterial('chk', scene))
        const cm = band.material as StandardMaterial
        cm.diffuseTexture = checkerTex
        cm.emissiveColor = new Color3(0.15, 0.15, 0.15)
        box(0.5, 0.18, 0.12, -0.45, 1.88, 0, M('#ffe2a0', 0.8, 0))
      }
      if (kind === 'cop') {
        for (const sz of [-0.76, 0.76]) box(1.4, 0.5, 0.02, -0.4, 0.86, sz, M('#e8e2d4', 0.25, 0.4))
        box(0.12, 0.12, 0.12, 1.75, 1.28, 0.5, chrome)
      }
    }
    const merged = Mesh.MergeMeshes(parts, true, true, undefined, false, true)!
    merged.parent = root
    mirrorMeshes.push(merged)
    const lamps: Mesh[] = []
    for (const lz of [-0.52, 0.52]) {
      const hl = MeshBuilder.CreateSphere('hl', { diameter: 0.26, segments: 6 }, scene)
      hl.position.set(2.15, 1.15, lz)
      lamps.push(hl)
    }
    const hlm = Mesh.MergeMeshes(lamps, true, true)!
    hlm.material = E('#fff0c8', 1.6)
    hlm.parent = root
    glowMeshes.push(hlm)
    mirrorMeshes.push(hlm)
    const tails: Mesh[] = []
    for (const lz of [-0.6, 0.6]) {
      const tl = MeshBuilder.CreateSphere('tl', { diameter: 0.1, segments: 4 }, scene)
      tl.position.set(kind === 'truck' ? -3.2 : -2.1, 0.85, lz)
      tails.push(tl)
    }
    const tlm = Mesh.MergeMeshes(tails, true, true)!
    tlm.material = E('#ff2a1a', 1.4)
    tlm.parent = root
    glowMeshes.push(tlm)
    const beam = decal('beam', beamMat, 7, 2.6, 5.4, 0.03, 0, root)
    void beam
    decal('carsh', shadowMat, 5.2, 2.4, 0, 0.012, 0, root)
    let copLamp: Mesh | null = null
    if (kind === 'cop') {
      copLamp = MeshBuilder.CreateSphere('copl', { diameter: 0.22, segments: 6 }, scene)
      copLamp.position.set(-0.3, 1.9, 0)
      copLamp.material = E('#ff2a1a', 0.2).clone('copl-m')
      copLamp.parent = root
      glowMeshes.push(copLamp)
      mirrorMeshes.push(copLamp)
    }
    return { root, copLamp }
  }
  const CAR_DEFS: ['sedan' | 'taxi' | 'truck', string][] = [
    ['sedan', '#111111'],
    ['sedan', '#4a1416'],
    ['taxi', '#d9a520'],
    ['sedan', '#1d3a2a'],
    ['truck', '#2a3a4a'],
    ['sedan', '#d8cba8'],
    ['sedan', '#1b2238'],
  ]
  const LANES: [number, 1 | -1][] = [
    [0.45, -1],
    [3.35, 1],
  ]
  const carCount = small ? 4 : 6
  for (let i = 0; i < carCount; i++) {
    const [kind, hex] = CAR_DEFS[i % CAR_DEFS.length]
    const { root, copLamp } = buildCar(kind, hex)
    const [lane, dir] = LANES[i % 2]
    root.position.set(-60 + rnd() * 120, 0, lane)
    root.rotation.y = dir === 1 ? 0 : Math.PI
    cars.push({ root, speed: 5 + rnd() * 3.5, dir, lane, cop: false, copLamp })
  }
  const patrol = buildCar('cop', '#0d0d0d')
  patrol.root.position.set(-70, 0, LANES[1][0])
  const patrolCar: Car = { root: patrol.root, speed: 6.5, dir: 1, lane: LANES[1][0], cop: true, copLamp: patrol.copLamp }
  cars.push(patrolCar)
  patrolCar.root.setEnabled(false)
  const parked = buildCar('cop', '#0d0d0d')
  parked.root.position.set(7, 0, CURB_FAR + 1.15)
  parked.root.rotation.y = Math.PI
  parked.root.setEnabled(false)
  const beatCop = buildPerson('beatcop', { coat: '#1a2238', pants: '#151a28', skin: SKIN[0], hat: 'police', hatHex: '#151a2a', long: true, dress: false, scale: 1.04, tie: '#111', bulk: 1.12 })
  beatCop.root.position.set(4.2, WALK_Y, CURB_FAR - 0.9)
  beatCop.root.setEnabled(false)

  /* ---------------------------------------------------------------- particles */
  const steam = (pos: Vector3, rate: number, size: [number, number], color: Color4, life: [number, number], speed: number) => {
    const ps = new ParticleSystem('steam', 120, scene)
    ps.particleTexture = softDot
    ps.emitter = pos
    ps.minEmitBox = new Vector3(-0.25, 0, -0.25)
    ps.maxEmitBox = new Vector3(0.25, 0, 0.25)
    ps.color1 = color
    ps.color2 = new Color4(color.r * 0.9, color.g * 0.9, color.b * 0.9, color.a * 0.8)
    ps.colorDead = new Color4(color.r, color.g, color.b, 0)
    ps.minSize = size[0]
    ps.maxSize = size[1]
    ps.minLifeTime = life[0]
    ps.maxLifeTime = life[1]
    ps.emitRate = rate
    ps.direction1 = new Vector3(-0.2, 1, -0.1)
    ps.direction2 = new Vector3(0.3, 1, 0.1)
    ps.minEmitPower = speed * 0.6
    ps.maxEmitPower = speed
    ps.gravity = new Vector3(0.15, 0, 0)
    ps.minAngularSpeed = -0.4
    ps.maxAngularSpeed = 0.4
    ps.blendMode = ParticleSystem.BLENDMODE_STANDARD
    ps.addSizeGradient(0, size[0])
    ps.addSizeGradient(1, size[1] * 2.2)
    ps.start()
    return ps
  }
  steam(new Vector3(-9, 0.05, 3.3), 9, [0.8, 1.4], new Color4(0.85, 0.72, 0.6, 0.18), [3, 5], 0.8)
  steam(new Vector3(17, 0.05, 3.3), 7, [0.8, 1.4], new Color4(0.85, 0.72, 0.6, 0.16), [3, 5], 0.8)
  for (const s of smokeSpots.slice(0, 3)) steam(s, 4, [0.6, 1.2], new Color4(0.35, 0.28, 0.28, 0.25), [5, 8], 0.6)

  const rain = new ParticleSystem('rain', small ? 900 : 2200, scene)
  rain.particleTexture = softDot
  rain.emitter = new Vector3(0, 18, -2)
  rain.minEmitBox = new Vector3(-40, 0, -14)
  rain.maxEmitBox = new Vector3(40, 0, 14)
  rain.color1 = new Color4(1, 0.82, 0.6, 0.35)
  rain.color2 = new Color4(0.8, 0.7, 0.6, 0.25)
  rain.colorDead = new Color4(0.8, 0.7, 0.6, 0)
  rain.minSize = 0.03
  rain.maxSize = 0.05
  rain.minScaleY = 7
  rain.maxScaleY = 12
  rain.minLifeTime = 0.9
  rain.maxLifeTime = 1.2
  rain.direction1 = new Vector3(-1, -20, 0)
  rain.direction2 = new Vector3(-0.6, -22, 0)
  rain.minEmitPower = 1
  rain.maxEmitPower = 1.2
  rain.blendMode = ParticleSystem.BLENDMODE_ADD
  rain.billboardMode = ParticleSystem.BILLBOARDMODE_STRETCHED
  rain.emitRate = 0
  rain.start()

  const dustTex = softDot
  const dustBurst = (x: number, z: number) => {
    const ps = new ParticleSystem('dust', 160, scene)
    ps.particleTexture = dustTex
    ps.emitter = new Vector3(x, 0.4, z)
    ps.minEmitBox = new Vector3(-4, 0, -1)
    ps.maxEmitBox = new Vector3(4, 1, 1)
    ps.color1 = new Color4(1, 0.82, 0.55, 0.5)
    ps.color2 = new Color4(0.7, 0.55, 0.4, 0.35)
    ps.colorDead = new Color4(0.5, 0.4, 0.3, 0)
    ps.minSize = 0.4
    ps.maxSize = 1.4
    ps.minLifeTime = 1
    ps.maxLifeTime = 2.4
    ps.direction1 = new Vector3(-2, 2, 1)
    ps.direction2 = new Vector3(2, 4, 2)
    ps.gravity = new Vector3(0, -0.6, 0)
    ps.manualEmitCount = 120
    ps.targetStopDuration = 0.4
    ps.disposeOnStop = true
    ps.blendMode = ParticleSystem.BLENDMODE_STANDARD
    ps.start()
  }

  // searchlights (heat)
  const beams: Mesh[] = []
  {
    const t = dyn(scene, 'search', 64, 256, true)
    const ctx = ctxOf(t)
    const g = ctx.createLinearGradient(0, 0, 0, 256)
    g.addColorStop(0, 'rgba(255,240,210,0)')
    g.addColorStop(0.55, 'rgba(255,236,200,0.08)')
    g.addColorStop(1, 'rgba(255,236,200,0.2)')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, 64, 256)
    t.update()
    const m = additive('search-m', t, 0.5)
    for (const bx of [-30, 24]) {
      const cone = MeshBuilder.CreateCylinder('beam', { height: 90, diameterTop: 12, diameterBottom: 0.8, tessellation: 18, cap: Mesh.NO_CAP }, scene)
      cone.setPivotPoint(new Vector3(0, -45, 0))
      cone.position.set(bx, 45, -30)
      cone.material = m
      cone.visibility = 0
      beams.push(cone)
    }
  }

  /* ---------------------------------------------------------------- businesses */
  const marqA = E('#ffd27a', 1.4)
  const marqB = E('#ffd27a', 1.4).clone('marqB')
  const signBoardTex = (name: string, spec: BizSpec, w: number, h: number) => {
    const W = 1024
    const H = Math.max(64, Math.round((1024 * h) / w))
    const t = dyn(scene, name, W, H)
    const ctx = ctxOf(t)
    const g = ctx.createLinearGradient(0, 0, 0, H)
    g.addColorStop(0, shade(spec.board, 1.35))
    g.addColorStop(1, shade(spec.board, 0.8))
    ctx.fillStyle = g
    ctx.fillRect(0, 0, W, H)
    ctx.strokeStyle = '#c99a3c'
    ctx.lineWidth = 4
    ctx.strokeRect(10, 8, W - 20, H - 16)
    ctx.lineWidth = 1.5
    ctx.strokeRect(18, 15, W - 36, H - 30)
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    const hasSub = !!spec.sub
    fitFont(ctx, spec.label, '700', H * (hasSub ? 0.5 : 0.62), W * 0.86)
    const tg = ctx.createLinearGradient(0, H * 0.15, 0, H * 0.75)
    tg.addColorStop(0, '#fff2c0')
    tg.addColorStop(0.5, '#e8b850')
    tg.addColorStop(1, '#9a6a20')
    const ty = hasSub ? H * 0.42 : H * 0.53
    ctx.fillStyle = 'rgba(0,0,0,0.7)'
    ctx.fillText(spec.label, W / 2 + 3, ty + 3)
    ctx.fillStyle = tg
    ctx.fillText(spec.label, W / 2, ty)
    if (spec.sub) {
      fitFont(ctx, spec.sub, 'italic 400', H * 0.2, W * 0.6)
      ctx.fillStyle = '#e8d6a8'
      ctx.fillText(spec.sub, W / 2, H * 0.78)
    }
    t.update()
    return t
  }
  const neonTex = (name: string, text: string, hex: string) => {
    const t = dyn(scene, name, 512, 160, true)
    const ctx = ctxOf(t)
    ctx.clearRect(0, 0, 512, 160)
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    fitFont(ctx, text, 'italic 700', 96, 470, "'Brush Script MT', 'Segoe Script', " + SERIF)
    ctx.shadowColor = hex
    ctx.shadowBlur = 22
    ctx.strokeStyle = hex
    ctx.lineWidth = 7
    ctx.strokeText(text, 256, 82)
    ctx.shadowBlur = 0
    ctx.strokeStyle = '#fff4e8'
    ctx.lineWidth = 2
    ctx.strokeText(text, 256, 82)
    t.update()
    return t
  }
  const awningTex = (name: string, a: string, b: string) => {
    const t = dyn(scene, name, 256, 64, true)
    const ctx = ctxOf(t)
    for (let x = 0; x < 16; x++) {
      ctx.fillStyle = x % 2 ? b : a
      ctx.fillRect(x * 16, 0, 16, 64)
    }
    t.update()
    return t
  }
  const valanceTex = (name: string, a: string, b: string) => {
    const t = dyn(scene, name, 256, 32, true)
    const ctx = ctxOf(t)
    ctx.clearRect(0, 0, 256, 32)
    for (let x = 0; x < 16; x++) {
      ctx.fillStyle = x % 2 ? b : a
      ctx.beginPath()
      ctx.moveTo(x * 16, 0)
      ctx.lineTo(x * 16 + 16, 0)
      ctx.lineTo(x * 16 + 16, 18)
      ctx.arc(x * 16 + 8, 18, 8, 0, Math.PI)
      ctx.closePath()
      ctx.fill()
    }
    t.update()
    return t
  }
  const paperTex = (() => {
    const t = dyn(scene, 'notice', 256, 180)
    const ctx = ctxOf(t)
    ctx.fillStyle = '#efe6cf'
    ctx.fillRect(0, 0, 256, 180)
    ctx.fillStyle = '#1a1410'
    ctx.textAlign = 'center'
    ctx.font = `700 26px ${SERIF}`
    ctx.fillText('CLOSED', 128, 44)
    ctx.font = `400 16px ${SERIF}`
    ctx.fillText('BY ORDER OF THE', 128, 82)
    ctx.font = `700 22px ${SERIF}`
    ctx.fillText('POLICE DEPT.', 128, 112)
    ctx.font = `italic 400 13px ${SERIF}`
    ctx.fillText('Prohibition Unit · 1931', 128, 150)
    t.update()
    return t
  })()
  const barricadeTex = (() => {
    const t = dyn(scene, 'barricade', 256, 32)
    const ctx = ctxOf(t)
    for (let x = -32; x < 256; x += 32) {
      ctx.fillStyle = '#eee6d0'
      ctx.fillRect(0, 0, 256, 32)
    }
    ctx.fillStyle = '#121212'
    for (let x = -32; x < 288; x += 40) {
      ctx.beginPath()
      ctx.moveTo(x, 32)
      ctx.lineTo(x + 20, 0)
      ctx.lineTo(x + 34, 0)
      ctx.lineTo(x + 14, 32)
      ctx.fill()
    }
    ctx.fillStyle = '#8a1a14'
    ctx.fillRect(86, 4, 84, 24)
    ctx.fillStyle = '#fff'
    ctx.font = `700 16px ${SERIF}`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('POLICE', 128, 17)
    t.update()
    return t
  })()

  const buildBusiness = (id: string, x: number): Biz | null => {
    const spec = BIZ[id]
    if (!spec) return null
    const root = new TransformNode(`biz-${id}`, scene)
    root.position.set(x, 0, BIZ_Z)
    const { w, h, d } = spec
    const groundH = Math.min(4.6, h * 0.55)
    const cornice = 1.0
    const floors = Math.max(1, Math.round((h - groundH - cornice) / 3.3))
    const body = MeshBuilder.CreateBox(`bb-${id}`, { width: w, height: h, depth: d }, scene)
    body.position.set(0, h / 2, -d / 2)
    body.material = M(spec.wall, 0.06, 0)
    body.parent = root
    const { dt, et } = paintFacade(scene, `bf-${id}`, {
      wM: w,
      hM: h,
      wall: spec.wall,
      stone: !!spec.stone,
      cols: Math.max(2, Math.round(w / 1.8)),
      floors,
      groundH,
      corniceH: cornice,
      lit: 0.62,
      seed: id.length * 31 + Math.round(x),
      goods: spec.goods,
      door: spec.door,
      shopBoard: spec.board,
      arched: !!spec.stone,
    })
    const face = MeshBuilder.CreatePlane(`bface-${id}`, { width: w, height: h }, scene)
    face.position.set(0, h / 2, 0.02)
    face.rotation.y = Math.PI
    const fm = new StandardMaterial(`bface-m-${id}`, scene)
    fm.diffuseTexture = dt
    fm.emissiveTexture = et
    fm.emissiveColor = new Color3(1.1, 1.05, 1)
    fm.specularColor = new Color3(0.05, 0.05, 0.05)
    fm.maxSimultaneousLights = 4
    face.material = fm
    face.parent = root
    mirrorMeshes.push(face)
    const trimM = M(spec.stone ? shade(spec.wall, 1.1).replace(/rgba\((\d+),(\d+),(\d+),1\)/, (_, r, g, b) => '#' + [r, g, b].map((v) => Number(v).toString(16).padStart(2, '0')).join('')) : '#b8a07c', 0.12, 0.05)
    const corn = MeshBuilder.CreateBox('bcorn', { width: w + 0.5, height: 0.5, depth: 0.8 }, scene)
    corn.position.set(0, h - 0.22, 0.3)
    corn.material = trimM
    corn.parent = root
    const corn2 = MeshBuilder.CreateBox('bcorn2', { width: w + 0.2, height: 0.18, depth: 0.5 }, scene)
    corn2.position.set(0, h - 0.6, 0.18)
    corn2.material = trimM
    corn2.parent = root

    // sign board
    const bw = Math.min(w * 0.86, 12)
    const bh = 0.9
    const board = MeshBuilder.CreatePlane(`board-${id}`, { width: bw, height: bh }, scene)
    board.position.set(0, groundH - 0.45, 0.14)
    board.rotation.y = Math.PI
    const bm = new StandardMaterial(`board-m-${id}`, scene)
    const st = signBoardTex(`board-t-${id}`, spec, bw, bh)
    bm.diffuseTexture = st
    bm.emissiveTexture = st
    bm.emissiveColor = new Color3(0.75, 0.7, 0.62)
    bm.specularColor = new Color3(0.3, 0.25, 0.15)
    bm.backFaceCulling = false
    board.material = bm
    board.parent = root
    mirrorMeshes.push(board)
    const boardFrame = MeshBuilder.CreateBox('bframe', { width: bw + 0.14, height: bh + 0.14, depth: 0.1 }, scene)
    boardFrame.position.set(0, groundH - 0.45, 0.08)
    boardFrame.material = M('#1a120a', 0.05, 0.2)
    boardFrame.parent = root

    if (spec.marquee) {
      const a: Matrix[] = []
      const b: Matrix[] = []
      const per = Math.round((bw + bh) * 2 * 3.2)
      for (let k = 0; k < per; k++) {
        const t = k / per
        const L = (bw + bh) * 2
        let s = t * L
        let px: number
        let py: number
        if (s < bw) {
          px = -bw / 2 + s
          py = bh / 2 + 0.1
        } else if ((s -= bw) < bh) {
          px = bw / 2 + 0.1
          py = bh / 2 - s
        } else if ((s -= bh) < bw) {
          px = bw / 2 - s
          py = -bh / 2 - 0.1
        } else {
          s -= bw
          px = -bw / 2 - 0.1
          py = -bh / 2 + s
        }
        ;(k % 2 ? a : b).push(Matrix.Translation(px, groundH - 0.45 + py, 0.2))
      }
      for (const [list, mat] of [[a, marqA], [b, marqB]] as const) {
        const m = MeshBuilder.CreateSphere('mq', { diameter: 0.1, segments: 3 }, scene)
        m.material = mat
        m.thinInstanceAdd(list)
        m.thinInstanceRefreshBoundingInfo()
        m.parent = root
        glowMeshes.push(m)
        mirrorMeshes.push(m)
      }
    }

    if (spec.awning) {
      const aw = Math.min(w * 0.92, bw + 0.6)
      const y0 = groundH - 1.0
      const out = 1.7
      const awn = MeshBuilder.CreateRibbon('awn', {
        pathArray: [
          [new Vector3(aw / 2, y0, 0.05), new Vector3(-aw / 2, y0, 0.05)],
          [new Vector3(aw / 2, y0 - 0.65, out), new Vector3(-aw / 2, y0 - 0.65, out)],
        ],
        sideOrientation: Mesh.DOUBLESIDE,
      }, scene)
      const am = new StandardMaterial(`awn-m-${id}`, scene)
      const at = awningTex(`awn-t-${id}`, spec.awning[0], spec.awning[1])
      am.diffuseTexture = at
      am.emissiveTexture = at
      am.emissiveColor = new Color3(0.32, 0.28, 0.24)
      am.specularColor = Color3.Black()
      am.backFaceCulling = false
      am.maxSimultaneousLights = 4
      awn.material = am
      awn.parent = root
      const val = MeshBuilder.CreateRibbon('val', {
        pathArray: [
          [new Vector3(aw / 2, y0 - 0.65, out), new Vector3(-aw / 2, y0 - 0.65, out)],
          [new Vector3(aw / 2, y0 - 0.95, out), new Vector3(-aw / 2, y0 - 0.95, out)],
        ],
        sideOrientation: Mesh.DOUBLESIDE,
      }, scene)
      const vm = new StandardMaterial(`val-m-${id}`, scene)
      const vt = valanceTex(`val-t-${id}`, spec.awning[0], spec.awning[1])
      vm.diffuseTexture = vt
      vm.opacityTexture = vt
      vm.emissiveTexture = vt
      vm.emissiveColor = new Color3(0.32, 0.28, 0.24)
      vm.specularColor = Color3.Black()
      vm.backFaceCulling = false
      val.material = vm
      val.parent = root
    }

    if (spec.neon) {
      const np = MeshBuilder.CreatePlane(`neon-${id}`, { width: 1.9, height: 0.6 }, scene)
      np.position.set(spec.door === 'garage' ? w * 0.3 : w * 0.18, groundH * 0.55, 0.12)
      np.rotation.y = Math.PI
      const nt = neonTex(`neon-t-${id}`, spec.neon[0], spec.neon[1])
      const nm = new StandardMaterial(`neon-m-${id}`, scene)
      nm.disableLighting = true
      nm.emissiveTexture = nt
      nm.opacityTexture = nt
      nm.emissiveColor = new Color3(1.4, 1.4, 1.4)
      nm.backFaceCulling = false
      np.material = nm
      np.parent = root
      glowMeshes.push(np)
      mirrorMeshes.push(np)
    }

    if (spec.blade) {
      const bladeH = Math.min(h - groundH - 1.4, 7)
      const bp = MeshBuilder.CreatePlane(`blade-${id}`, { width: 1.1, height: bladeH }, scene)
      bp.position.set(-w / 2 + 0.5, groundH + 0.6 + bladeH / 2, 0.75)
      bp.rotation.y = Math.PI - 0.45
      const t = dyn(scene, `blade-t-${id}`, 128, Math.round(128 * (bladeH / 1.1)))
      const ctx = ctxOf(t)
      const H = t.getSize().height
      ctx.fillStyle = '#1a0e08'
      ctx.fillRect(0, 0, 128, H)
      ctx.fillStyle = '#ffd27a'
      for (let y = 8; y < H - 4; y += 14) {
        ctx.beginPath()
        ctx.arc(8, y, 3.5, 0, Math.PI * 2)
        ctx.arc(120, y, 3.5, 0, Math.PI * 2)
        ctx.fill()
      }
      const letters = spec.blade.split('')
      const step = (H - 30) / letters.length
      ctx.font = `700 ${Math.min(96, step * 0.85)}px ${SERIF}`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillStyle = '#fff0c0'
      ctx.shadowColor = '#ffb040'
      ctx.shadowBlur = 14
      letters.forEach((ch, k) => ctx.fillText(ch, 64, 15 + step * (k + 0.5)))
      t.update()
      const m = new StandardMaterial(`blade-m-${id}`, scene)
      m.disableLighting = true
      m.emissiveTexture = t
      m.emissiveColor = new Color3(0.04, 0.03, 0.02)
      t.level = 1.15
      m.backFaceCulling = false
      bp.material = m
      bp.parent = root
      mirrorMeshes.push(bp)
      const arm = MeshBuilder.CreateBox('bladearm', { width: 0.08, height: 0.08, depth: 1.5 }, scene)
      arm.position.set(-w / 2 + 0.5, groundH + 0.6 + bladeH, 0.75)
      arm.material = iron
      arm.parent = root
    }

    if (spec.columns) {
      const colH = groundH + 1.2
      const n = 4
      for (let k = 0; k < n; k++) {
        const cx = -w * 0.36 + (k * (w * 0.72)) / (n - 1)
        const col = MeshBuilder.CreateCylinder('col', { height: colH, diameter: 0.5, tessellation: 14 }, scene)
        col.position.set(cx, colH / 2 + WALK_Y, 0.5)
        col.material = trimM
        col.parent = root
      }
      const ent = MeshBuilder.CreateBox('entab', { width: w * 0.82, height: 0.55, depth: 0.9 }, scene)
      ent.position.set(0, colH + WALK_Y + 0.2, 0.45)
      ent.material = trimM
      ent.parent = root
      board.position.y = colH + WALK_Y + 0.95
      boardFrame.position.y = board.position.y
      board.position.z = 0.95
      boardFrame.position.z = 0.89
    }

    if (spec.roof === 'tank') waterTower(root, w * 0.2, h, -d * 0.5, 1)
    if (spec.roof === 'deco') {
      const s1 = MeshBuilder.CreateBox('deco1', { width: w * 0.7, height: h * 0.14, depth: d * 0.7 }, scene)
      s1.position.set(0, h + h * 0.07, -d * 0.5)
      s1.material = trimM
      s1.parent = root
      const s2 = MeshBuilder.CreateBox('deco2', { width: w * 0.4, height: h * 0.1, depth: d * 0.4 }, scene)
      s2.position.set(0, h * 1.14 + h * 0.05, -d * 0.5)
      s2.material = trimM
      s2.parent = root
      const sp = MeshBuilder.CreateCylinder('spire', { height: h * 0.22, diameterTop: 0.02, diameterBottom: 0.6, tessellation: 8 }, scene)
      sp.position.set(0, h * 1.24 + h * 0.11, -d * 0.5)
      sp.material = chrome
      sp.parent = root
      const beacon = MeshBuilder.CreateSphere('beacon', { diameter: 0.35, segments: 4 }, scene)
      beacon.position.set(0, h * 1.47, -d * 0.5)
      beacon.material = E('#ff4a2a', 1.6)
      beacon.parent = root
      glowMeshes.push(beacon)
      // flood-lit crown
      const flood = MeshBuilder.CreatePlane('flood', { width: w * 0.7, height: h * 0.14 }, scene)
      flood.position.set(0, h + h * 0.07, -d * 0.5 + d * 0.35 + 0.03)
      flood.rotation.y = Math.PI
      flood.material = additive(`flood-${id}`, poolTex, 0.4)
      flood.parent = root
    }
    if (spec.roof === 'flag') {
      const pole = MeshBuilder.CreateCylinder('pole', { height: 4, diameter: 0.07, tessellation: 6 }, scene)
      pole.position.set(w * 0.3, h + 2, -1)
      pole.material = chrome
      pole.parent = root
      const ft = dyn(scene, `flag-t-${id}`, 96, 64)
      const fc = ctxOf(ft)
      ;['#1f7a3a', '#efe6d0', '#c4281c'].forEach((c, k) => {
        fc.fillStyle = c
        fc.fillRect(k * 32, 0, 32, 64)
      })
      ft.update()
      const flag = MeshBuilder.CreatePlane(`flag-${id}`, { width: 1.5, height: 1 }, scene)
      flag.setPivotPoint(new Vector3(-0.75, 0, 0))
      flag.position.set(w * 0.3 + 0.75, h + 3.4, -1)
      flag.rotation.y = Math.PI
      const fm2 = new StandardMaterial(`flag-m-${id}`, scene)
      fm2.diffuseTexture = ft
      fm2.emissiveTexture = ft
      fm2.emissiveColor = new Color3(0.35, 0.35, 0.35)
      fm2.backFaceCulling = false
      flag.material = fm2
      flag.parent = root
      flag.metadata = { flag: true }
    }

    if (spec.prop === 'crates') {
      for (let k = 0; k < 4; k++) {
        const cx = -w * 0.35 + k * 0.85
        const crate = MeshBuilder.CreateBox('crate', { width: 0.75, height: 0.45, depth: 0.55 }, scene)
        crate.position.set(cx, WALK_Y + 0.45 + (k % 2) * 0.05, 1.1)
        crate.rotation.x = -0.25
        crate.material = M('#7a5432', 0.12, 0)
        crate.parent = root
        const fruit = MeshBuilder.CreateBox('fruit', { width: 0.68, height: 0.1, depth: 0.48 }, scene)
        fruit.position.set(cx, WALK_Y + 0.7 + (k % 2) * 0.05, 1.12)
        fruit.rotation.x = -0.25
        fruit.material = M(['#d8402a', '#f0a020', '#6aa03a', '#e8d040'][k], 0.3, 0.2)
        fruit.parent = root
        const stand = MeshBuilder.CreateBox('stand', { width: 0.8, height: 0.45, depth: 0.5 }, scene)
        stand.position.set(cx, WALK_Y + 0.22, 1.05)
        stand.material = M('#3a2416', 0.08, 0)
        stand.parent = root
      }
    }
    if (spec.prop === 'pump') {
      const pump = MeshBuilder.CreateCylinder('pump', { height: 1.8, diameter: 0.42, tessellation: 12 }, scene)
      pump.position.set(w * 0.42, WALK_Y + 0.9, 1.6)
      pump.material = M('#a01e16', 0.2, 0.4)
      pump.parent = root
      const globe = MeshBuilder.CreateSphere('globe', { diameter: 0.42, segments: 8 }, scene)
      globe.position.set(w * 0.42, WALK_Y + 2.0, 1.6)
      globe.material = E('#fff0d0', 1.1)
      globe.parent = root
      glowMeshes.push(globe)
    }
    if (spec.prop === 'carpet') {
      const carpet = MeshBuilder.CreateGround('carpet', { width: 2.4, height: 5.4 }, scene)
      carpet.position.set(0, WALK_Y + 0.012, 2.7)
      carpet.material = M('#8a1018', 0.25, 0.05)
      carpet.parent = root
      for (const sx of [-1.5, 1.5])
        for (const sz of [1, 3, 5]) {
          const post = MeshBuilder.CreateCylinder('rp', { height: 0.9, diameter: 0.07, tessellation: 6 }, scene)
          post.position.set(sx, WALK_Y + 0.45, sz)
          post.material = M('#d8b040', 0.3, 0.9)
          post.parent = root
        }
    }

    decal(`spill-${id}`, poolMat, w * 1.05, 3.2, 0, WALK_Y + 0.014, 1.7, root).scaling.x = 1

    // raid props
    const raid = new TransformNode(`raid-${id}`, scene)
    raid.parent = root
    for (const [bx, bz, ry] of [[-w * 0.28, 2.6, 0.12], [w * 0.28, 2.9, -0.1]]) {
      const g = new TransformNode('barr', scene)
      g.parent = raid
      g.position.set(bx, WALK_Y, bz)
      g.rotation.y = ry
      const top = MeshBuilder.CreateBox('btop', { width: 2.2, height: 0.26, depth: 0.05 }, scene)
      top.position.y = 0.95
      const tm = new StandardMaterial('btop-m', scene)
      tm.diffuseTexture = barricadeTex
      tm.emissiveTexture = barricadeTex
      tm.emissiveColor = new Color3(0.35, 0.35, 0.35)
      top.material = tm
      top.parent = g
      for (const lx of [-0.85, 0.85])
        for (const lz of [-0.18, 0.18]) {
          const leg = MeshBuilder.CreateBox('bleg', { width: 0.06, height: 1.0, depth: 0.06 }, scene)
          leg.position.set(lx, 0.48, lz)
          leg.rotation.x = lz > 0 ? 0.3 : -0.3
          leg.material = M('#d8d0bc', 0.15, 0)
          leg.parent = g
        }
    }
    const notice = MeshBuilder.CreatePlane('notice', { width: 1.0, height: 0.7 }, scene)
    notice.position.set(spec.door === 'shop' ? w / 2 - 1.2 : 0, groundH * 0.45, 0.16)
    notice.rotation.y = Math.PI
    const nm = new StandardMaterial('notice-m', scene)
    nm.diffuseTexture = paperTex
    nm.emissiveTexture = paperTex
    nm.emissiveColor = new Color3(0.5, 0.5, 0.5)
    notice.material = nm
    notice.parent = raid
    raid.setEnabled(false)

    for (const m of root.getChildMeshes()) m.isPickable = false
    return { root, id, x, spawnT: 0, raid, scale: 1 }
  }

  /* ---------------------------------------------------------------- crew */
  const CREW_LOOKS: Record<string, Partial<Look>> = {
    lookout: { hat: 'cap', scale: 0.76, coat: '#4a3b2a', prop: 'paper', long: false },
    runner: { hat: 'cap', coat: '#5a4a34', long: false },
    muscle: { hat: 'bowler', coat: '#2a2622', bulk: 1.3, scale: 1.1, long: false },
    fixer: { hat: 'fedora', coat: '#3a3a40', prop: 'case', long: false },
    enforcer: { hat: 'fedora', coat: '#2a221c', long: true, prop: 'smoke', bulk: 1.15 },
    lieutenant: { hat: 'fedora', coat: '#1c2230', long: true, prop: 'smoke' },
    captain: { hat: 'fedora', hatHex: '#d8cfbf', coat: '#2c2c30', long: true, tie: '#8a1a1a' },
    underboss: { hat: 'fedora', hatHex: '#e6dccb', coat: '#121214', long: true, bulk: 1.1, prop: 'smoke', tie: '#c8a040' },
  }
  const CREW_ORDER = Object.keys(CREW_LOOKS)
  let crew: Idler[] = []
  const buildCrew = (snap: EmpireSnapshot, bizXs: number[]) => {
    for (const c of crew) c.root.dispose()
    crew = []
    const owned = CREW_ORDER.filter((id) => (snap.recruitLevels[id] ?? 0) > 0)
    owned.forEach((id, k) => {
      const r = mulberry(900 + k)
      const base = randomLook(r)
      const look: Look = { ...base, dress: false, skin: base.skin, ...CREW_LOOKS[id] } as Look
      const p = buildPerson(`crew-${id}`, look)
      const anchor = bizXs.length ? bizXs[k % bizXs.length] : 0
      const side = k % 2 ? 1 : -1
      const x = anchor + side * (2.2 + Math.floor(k / Math.max(1, bizXs.length)) * 1.4) + (r() - 0.5) * 0.6
      p.root.position.set(x, WALK_Y, BIZ_Z + 1.0 + r() * 0.8)
      p.yaw.rotation.y = (r() - 0.5) * 0.9
      p.armL.rotation.z = -0.08
      p.armR.rotation.z = 0.08
      crew.push({ ...p, phase: r() * 10, smoke: look.prop === 'smoke' })
    })
  }

  /* ---------------------------------------------------------------- snapshot */
  const bizMap = new Map<string, Biz>()
  let time = 0
  let focusX = 0
  let focusTarget = 0
  let focusUntil = 0
  let raidedId: string | null = null
  let built = false

  const slotXs = (n: number) => {
    if (n <= 0) return []
    const spacing = Math.min(15, 84 / Math.max(1, n))
    const start = -((n - 1) * spacing) / 2
    return Array.from({ length: n }, (_, i) => start + i * spacing)
  }

  const applySnapshot = (snap: EmpireSnapshot) => {
    const order = Object.keys(BIZ)
    const owned = order.filter((id) => (snap.businessLevels[id] ?? 0) > 0)
    const xs = slotXs(owned.length)
    const spacing = owned.length > 1 ? xs[1] - xs[0] : 15
    for (const [id, b] of bizMap) {
      if (!owned.includes(id)) {
        b.root.dispose(false, true)
        bizMap.delete(id)
      }
    }
    owned.forEach((id, i) => {
      const x = xs[i]
      let b = bizMap.get(id)
      if (!b) {
        b = buildBusiness(id, x) ?? undefined
        if (!b) return
        bizMap.set(id, b)
        if (built) {
          b.spawnT = time
          b.root.scaling.y = 0.02
          dustBurst(x, BIZ_Z + 1.5)
          focusTarget = x
          focusUntil = time + 5
        }
      }
      b.x = x
      b.root.position.x = x
      const fit = Math.min(1, (spacing - 0.6) / BIZ[id].w)
      b.scale = Math.max(0.55, fit)
      b.root.scaling.x = b.scale
      b.root.scaling.z = b.scale
    })
    raidedId = snap.raidedBusinessId && bizMap.has(snap.raidedBusinessId) ? snap.raidedBusinessId : null
    for (const [id, b] of bizMap) b.raid.setEnabled(id === raidedId)
    const archCount = Math.min(arches.length, 2 + snap.territoryCount)
    arches.forEach((a, i) => a.setEnabled(i < archCount))
    buildCrew(snap, xs)
    built = true
  }
  applySnapshot(initialSnap)

  /* ---------------------------------------------------------------- post */
  const glow = new GlowLayer('glow', scene, { blurKernelSize: small ? 32 : 64, mainTextureRatio: 0.5 })
  glow.intensity = 0.75
  for (const m of glowMeshes) glow.addIncludedOnlyMesh(m as Mesh)
  const refreshGlow = () => {
    for (const m of glowMeshes) if (!m.isDisposed()) glow.addIncludedOnlyMesh(m as Mesh)
  }

  const refreshMirror = () => {
    mirror.renderList = mirrorMeshes.filter((m) => !m.isDisposed())
  }
  refreshMirror()

  const pipeline = new DefaultRenderingPipeline('post', true, scene, [cam])
  pipeline.fxaaEnabled = true
  pipeline.bloomEnabled = true
  pipeline.bloomThreshold = 0.62
  pipeline.bloomWeight = 0.45
  pipeline.bloomKernel = small ? 32 : 64
  pipeline.bloomScale = 0.5
  pipeline.imageProcessingEnabled = true
  const ip = pipeline.imageProcessing
  ip.toneMappingEnabled = true
  ip.toneMappingType = ImageProcessingConfiguration.TONEMAPPING_ACES
  ip.exposure = 1.25
  ip.contrast = 1.2
  ip.vignetteEnabled = true
  ip.vignetteWeight = 3.2
  ip.vignetteColor = new Color4(0.08, 0.03, 0.02, 0)
  ip.vignetteCameraFov = 0.9
  const curves = new ColorCurves()
  curves.globalSaturation = -12
  curves.highlightsHue = 38
  curves.highlightsDensity = 30
  curves.highlightsSaturation = 20
  curves.shadowsHue = 18
  curves.shadowsDensity = 20
  curves.shadowsSaturation = 10
  ip.colorCurvesEnabled = true
  ip.colorCurves = curves
  pipeline.grainEnabled = true
  pipeline.grain.intensity = 10
  pipeline.grain.animated = true
  if (!small) {
    pipeline.chromaticAberrationEnabled = true
    pipeline.chromaticAberration.aberrationAmount = 14
    pipeline.chromaticAberration.radialIntensity = 0.8
  }

  /* ---------------------------------------------------------------- tick */
  let rainLevel = 0
  let rainTarget = 0
  let nextWeather = 25 + rnd() * 40
  let patrolCooldown = 0
  const camTarget = new Vector3()
  const red = new Color3(1, 0.12, 0.06)
  const white = new Color3(1, 0.92, 0.8)
  const off = new Color3(0.2, 0.03, 0.02)

  let slowFor = 0
  let quality = 2
  const degrade = () => {
    quality--
    if (quality === 1) {
      pipeline.chromaticAberrationEnabled = false
      pipeline.grainEnabled = false
      mirror.adaptiveBlurKernel = 0
      engine.setHardwareScalingLevel(Math.max(1, engine.getHardwareScalingLevel()) * 1.35)
    } else {
      roadMat.reflectionTexture = null
      glow.isEnabled = false
      pipeline.bloomEnabled = false
      engine.setHardwareScalingLevel(engine.getHardwareScalingLevel() * 1.3)
    }
  }

  const tick = (dtSec: number, heat01: number) => {
    const dt = Math.min(0.1, dtSec)
    time += dt
    if (quality > 0 && time > 4) {
      slowFor = dtSec > 1 / 24 ? slowFor + dtSec : Math.max(0, slowFor - dtSec)
      if (slowFor > 3) {
        slowFor = 0
        degrade()
      }
    }
    if (glowMeshes.length && time < 0.2) refreshGlow()

    // camera: slow drift, pans to fresh purchases
    if (time > focusUntil) focusTarget = 0
    focusX += (focusTarget * 0.85 - focusX) * Math.min(1, dt * 0.9)
    cam.position.x = focusX + Math.sin(time * 0.05) * 2.2
    cam.position.y = 4.4 + Math.sin(time * 0.09) * 0.18
    camTarget.set(focusX + Math.sin(time * 0.037) * 1.5, 7.2 + Math.sin(time * 0.03) * 0.25, -14)
    cam.setTarget(camTarget)

    // walkers
    for (const w of walkers) {
      w.root.position.x += w.dir * w.speed * dt
      if (w.dir === 1 && w.root.position.x > 48) w.root.position.x = -48
      if (w.dir === -1 && w.root.position.x < -48) w.root.position.x = 48
      w.phase += dt * w.speed * 4.4
      const s = Math.sin(w.phase)
      w.legL.rotation.x = s * 0.5
      w.legR.rotation.x = -s * 0.5
      w.armL.rotation.x = -s * 0.42
      w.armR.rotation.x = s * 0.42
      w.yaw.position.y = Math.abs(Math.cos(w.phase)) * 0.035
      w.yaw.rotation.z = s * 0.02
    }
    // crew idling
    for (const c of crew) {
      c.phase += dt
      c.yaw.position.y = Math.sin(c.phase * 1.3) * 0.006
      c.head.rotation.y = Math.sin(c.phase * 0.35) * 0.12
      if (c.smoke) {
        const cyc = c.phase % 9
        const raise = cyc > 6 && cyc < 8 ? Math.sin(((cyc - 6) / 2) * Math.PI) : 0
        c.armR.rotation.x = -raise * 2.1
        c.armR.rotation.z = 0.08 + raise * 0.35
        if (c.ember) (c.ember.material as StandardMaterial).emissiveColor.set(1.5 + raise * 1.5, 0.5 + raise * 0.4, 0.1)
      }
    }

    // traffic
    const patrolOn = heat01 > 0.3 || !!raidedId
    if (patrolOn && !patrolCar.root.isEnabled()) {
      patrolCooldown -= dt
      if (patrolCooldown <= 0) {
        patrolCar.root.setEnabled(true)
        patrolCar.root.position.x = -62
      }
    }
    for (const c of cars) {
      if (!c.root.isEnabled()) continue
      c.root.position.x += c.dir * c.speed * dt
      if (c.dir === 1 && c.root.position.x > 62) {
        c.root.position.x = -62
        if (c.cop && !patrolOn) {
          c.root.setEnabled(false)
          patrolCooldown = 8
        }
      }
      if (c.dir === -1 && c.root.position.x < -62) c.root.position.x = 62
    }

    // cop lights
    const flash = Math.sin(time * 9) > 0
    const lampColor = flash ? red : off
    if (patrolCar.copLamp) (patrolCar.copLamp.material as StandardMaterial).emissiveColor.copyFrom(lampColor)
    const parkedOn = heat01 > 0.6 || !!raidedId
    parked.root.setEnabled(parkedOn)
    beatCop.root.setEnabled(parkedOn)
    if (parkedOn && parked.copLamp) (parked.copLamp.material as StandardMaterial).emissiveColor.copyFrom(flash ? off : red)
    if (parkedOn) beatCop.head.rotation.y = Math.sin(time * 0.6) * 0.5

    // raid strobe
    const rb = raidedId ? bizMap.get(raidedId) : undefined
    if (rb) {
      strobe.position.set(rb.x, 3, BIZ_Z + 3.5)
      strobe.diffuse.copyFrom(flash ? red : white)
      strobe.intensity = flash ? 3 : 1.4
      if (parkedOn) parked.root.position.x = rb.x + 5
    } else {
      strobe.intensity = heat01 > 0.6 ? (flash ? 1.2 : 0) : 0
      strobe.position.set(7, 2.5, CURB_FAR + 1)
      strobe.diffuse.copyFrom(red)
      if (parkedOn) parked.root.position.x = 7
    }

    // searchlights
    const beamOn = heat01 > 0.45 ? Math.min(0.6, (heat01 - 0.45) * 2) : 0
    beams.forEach((b, i) => {
      b.visibility += (beamOn - b.visibility) * Math.min(1, dt * 1.5)
      b.rotation.z = Math.sin(time * 0.35 + i * 2.1) * 0.5
      b.rotation.x = -0.25 + Math.cos(time * 0.27 + i) * 0.15
    })

    // businesses: rise in, flags wave
    for (const b of bizMap.values()) {
      if (b.spawnT > 0) {
        const t = Math.min(1, (time - b.spawnT) / 1.6)
        const e = 1 - Math.pow(1 - t, 3)
        b.root.scaling.y = 0.02 + 0.98 * e
        if (t >= 1) b.spawnT = 0
      }
    }
    for (const m of scene.meshes) if (m.metadata?.flag) m.rotation.y = Math.PI + Math.sin(time * 2.2 + m.uniqueId) * 0.25

    // marquee chase + festa twinkle + gas flicker
    const chase = Math.floor(time * 4) % 2 === 0
    marqA.emissiveColor.set(chase ? 1.5 : 0.35, chase ? 1.15 : 0.27, chase ? 0.6 : 0.14)
    marqB.emissiveColor.set(chase ? 0.35 : 1.5, chase ? 0.27 : 1.15, chase ? 0.14 : 0.6)
    const flick = 1.2 + Math.sin(time * 13) * 0.03 + Math.sin(time * 7.3) * 0.04
    lampGlass.emissiveColor.set(flick, flick * 0.81, flick * 0.53)

    // weather: an occasional drizzle
    nextWeather -= dt
    if (nextWeather <= 0) {
      rainTarget = rainTarget > 0 ? 0 : 0.5 + rnd() * 0.5
      nextWeather = rainTarget > 0 ? 20 + rnd() * 25 : 50 + rnd() * 60
    }
    rainLevel += (rainTarget - rainLevel) * Math.min(1, dt * 0.3)
    rain.emitRate = rainLevel * (small ? 600 : 1400)
    mirror.level = 0.28 + rainLevel * 0.25
  }

  const origApply = applySnapshot
  const applyAndRefresh = (snap: EmpireSnapshot) => {
    origApply(snap)
    refreshGlow()
    refreshMirror()
  }

  return {
    scene,
    applySnapshot: applyAndRefresh,
    tick,
    resize: () => {
      engine.resize()
      fitFov()
    },
    dispose: () => {
      for (const d of disposers) d()
      engine.stopRenderLoop()
      scene.dispose()
      engine.dispose()
    },
  }
}
