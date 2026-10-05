/**
 * Babylon.js 3D night-city background.
 *
 * Replaces the Pixi 2D scene with a real 3D street canyon:
 *  - wet asphalt via planar mirror reflections
 *  - procedural buildings with emissive window facades + neon name signs
 *  - owned businesses rise in with a grow animation + dust burst
 *  - rigged Soldier.glb pedestrians playing the real Walk clip
 *  - procedural traffic with headlights, strobing cop cruisers
 *  - heat gates searchlights / patrol presence; raids tape off a business
 *  - DefaultRenderingPipeline: bloom + ACES + vignette + grain + FXAA
 */
import {
  Color3,
  Color4,
  DirectionalLight,
  DynamicTexture,
  Engine,
  FreeCamera,
  HemisphericLight,
  Mesh,
  MeshBuilder,
  MirrorTexture,
  ParticleSystem,
  Plane,
  PointLight,
  Scene,
  SceneLoader,
  StandardMaterial,
  Texture,
  TransformNode,
  Vector3,
  AnimationGroup,
  DefaultRenderingPipeline,
  GlowLayer,
  type AbstractMesh,
} from '@babylonjs/core'
import '@babylonjs/loaders/glTF'
import type { EmpireSnapshot } from '../../game/visualMetrics'

export type CityWorld = {
  scene: Scene
  applySnapshot: (snap: EmpireSnapshot) => void
  tick: (dtSec: number, heat01: number) => void
  resize: () => void
  dispose: () => void
}

type Ped = { root: TransformNode; speed: number; dir: 1 | -1; lane: number; walk: AnimationGroup | null }
type Car = {
  root: TransformNode
  speed: number
  dir: 1 | -1
  lane: number
  cop: boolean
  strobeA?: PointLight
  strobeB?: PointLight
  headlight?: PointLight
}
type BizBuilding = {
  id: string
  root: TransformNode
  sign: AbstractMesh
  signMat: StandardMaterial
  accent: PointLight
  bornAt: number // for rise-in anim
  h: number
}

const NEON: Record<string, { color: number; label: string; w: number; h: number; d: number; roof: 'antenna' | 'pad' | 'tank' | 'plain' }> = {
  stall: { color: 0xffb347, label: 'TACOS', w: 4.2, h: 3.6, d: 4, roof: 'plain' },
  laundry: { color: 0x35d0ff, label: 'LAUNDRY', w: 6.4, h: 5.4, d: 6, roof: 'tank' },
  club: { color: 0xff2bd6, label: 'VICE', w: 9, h: 7.5, d: 7, roof: 'plain' },
  tower: { color: 0x35d0ff, label: 'APEX', w: 11, h: 26, d: 9, roof: 'pad' },
  garage: { color: 0xff7a3c, label: 'CUSTOMS', w: 8, h: 5.2, d: 7.5, roof: 'plain' },
  warehouse: { color: 0xffb347, label: 'DOCKS', w: 13, h: 7, d: 11, roof: 'antenna' },
  casino: { color: 0xffc44d, label: 'ROYALE', w: 13, h: 13, d: 9, roof: 'antenna' },
  logistics_hub: { color: 0x35ffc8, label: 'LOGISTIX', w: 11, h: 9, d: 10, roof: 'tank' },
  skylot_plaza: { color: 0xb48cff, label: 'SKYLOT', w: 9.5, h: 18, d: 8, roof: 'pad' },
  charter_row: { color: 0x9fb4ff, label: 'CHARTER', w: 15, h: 6.5, d: 10, roof: 'antenna' },
}
const BIZ_ORDER = Object.keys(NEON)
const SLOT_MIN = -36
const SLOT_MAX = 36

// deterministic rng so layout is stable between rebuilds
function mulberry(seed: number) {
  let a = seed >>> 0
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function hex(c: number): string {
  return '#' + c.toString(16).padStart(6, '0')
}

/* ---------- DynamicTexture painters ---------- */

/** Soft radial dot for particles. */
function dotTexture(scene: Scene, name: string, inner = 'rgba(255,255,255,1)', outer = 'rgba(255,255,255,0)'): DynamicTexture {
  const t = new DynamicTexture(name, { width: 64, height: 64 }, scene, true)
  const c = t.getContext() as unknown as CanvasRenderingContext2D
  const g = c.createRadialGradient(32, 32, 2, 32, 32, 30)
  g.addColorStop(0, inner)
  g.addColorStop(1, outer)
  c.clearRect(0, 0, 64, 64)
  c.fillStyle = g
  c.fillRect(0, 0, 64, 64)
  t.update()
  t.hasAlpha = true
  return t
}

/** Building facade: dark wall + random lit window grid (+ storefront strip for businesses). */
function facadeTexture(
  scene: Scene,
  name: string,
  seed: number,
  opts: { base: string; cols: number; rows: number; litRatio: number; storefront?: boolean; storefrontTint?: string },
): DynamicTexture {
  const W = 256
  const H = 256
  const t = new DynamicTexture(name, { width: W, height: H }, scene, true)
  const c = t.getContext() as unknown as CanvasRenderingContext2D
  const rnd = mulberry(seed)
  // wall
  const g = c.createLinearGradient(0, 0, 0, H)
  g.addColorStop(0, opts.base)
  g.addColorStop(1, '#05060d')
  c.fillStyle = g
  c.fillRect(0, 0, W, H)
  // grime streaks
  c.fillStyle = 'rgba(0,0,0,0.25)'
  for (let i = 0; i < 10; i++) {
    const x = rnd() * W
    c.fillRect(x, 0, 2 + rnd() * 5, H * (0.3 + rnd() * 0.7))
  }
  // windows
  const cw = W / opts.cols
  const rh = H / (opts.rows + (opts.storefront ? 1.6 : 0))
  const winW = cw * 0.42
  const winH = rh * 0.44
  for (let r = 0; r < opts.rows; r++) {
    for (let col = 0; col < opts.cols; col++) {
      const x = col * cw + (cw - winW) / 2
      const y = r * rh + (rh - winH) / 2
      if (rnd() < opts.litRatio) {
        const warm = rnd() < 0.65
        const a = 0.5 + rnd() * 0.5
        c.fillStyle = warm ? `rgba(255,196,110,${a})` : `rgba(140,200,255,${a})`
      } else {
        c.fillStyle = `rgba(12,16,30,${0.7 + rnd() * 0.3})`
      }
      c.fillRect(x, y, winW, winH)
      c.fillStyle = 'rgba(0,0,0,0.35)'
      c.fillRect(x, y + winH * 0.48, winW, 1.5)
    }
  }
  if (opts.storefront) {
    // bright ground-floor shopfront band
    const sy = H - rh * 1.6
    const sg = c.createLinearGradient(0, sy, 0, H)
    sg.addColorStop(0, 'rgba(20,20,34,0.95)')
    sg.addColorStop(1, 'rgba(8,8,16,1)')
    c.fillStyle = sg
    c.fillRect(0, sy, W, H - sy)
    const tint = opts.storefrontTint ?? 'rgba(255,180,90,0.75)'
    for (let i = 0; i < 4; i++) {
      const x = W * 0.08 + i * W * 0.24
      c.fillStyle = tint
      c.fillRect(x, sy + rh * 0.35, W * 0.16, rh * 0.9)
      c.fillStyle = 'rgba(0,0,0,0.3)'
      c.fillRect(x, sy + rh * 0.35, W * 0.16, 3)
    }
  }
  t.update()
  return t
}

/** Neon sign text — transparent canvas, big glow (bloom finishes it). */
function signTexture(scene: Scene, name: string, text: string, colorHex: string): DynamicTexture {
  const W = 512
  const H = 160
  const t = new DynamicTexture(name, { width: W, height: H }, scene, true)
  const c = t.getContext() as unknown as CanvasRenderingContext2D
  c.clearRect(0, 0, W, H)
  c.font = `900 ${H * 0.52}px Arial, sans-serif`
  c.textAlign = 'center'
  c.textBaseline = 'middle'
  c.shadowColor = colorHex
  c.shadowBlur = 26
  c.strokeStyle = colorHex
  c.lineWidth = 3
  c.strokeText(text, W / 2, H / 2)
  c.shadowBlur = 10
  c.fillStyle = '#ffffff'
  c.fillText(text, W / 2, H / 2)
  t.update()
  t.hasAlpha = true
  return t
}

/** Caution tape strip texture. */
function tapeTexture(scene: Scene): DynamicTexture {
  const t = new DynamicTexture('tape', { width: 256, height: 32 }, scene, true)
  const c = t.getContext() as unknown as CanvasRenderingContext2D
  c.fillStyle = '#e8c51e'
  c.fillRect(0, 0, 256, 32)
  c.fillStyle = '#111'
  for (let x = -32; x < 280; x += 32) {
    c.beginPath()
    c.moveTo(x, 32)
    c.lineTo(x + 16, 0)
    c.lineTo(x + 28, 0)
    c.lineTo(x + 12, 32)
    c.fill()
  }
  c.fillStyle = '#111'
  c.font = 'bold 13px Arial'
  c.textAlign = 'center'
  c.fillText('POLICE LINE · DO NOT CROSS', 128, 21)
  t.update()
  return t
}

/* ---------- mesh builders ---------- */

function makeFacadeMaterial(scene: Scene, name: string, tex: DynamicTexture, emissive = 0.55): StandardMaterial {
  const m = new StandardMaterial(name, scene)
  m.emissiveTexture = tex
  m.emissiveColor = Color3.White().scale(emissive) // emissiveTexture multiplies emissiveColor
  m.diffuseTexture = tex
  m.diffuseColor = new Color3(0.5, 0.5, 0.55)
  m.specularColor = new Color3(0.05, 0.05, 0.08)
  m.maxSimultaneousLights = 4
  return m
}

function makeSignMaterial(scene: Scene, name: string, tex: DynamicTexture): StandardMaterial {
  const m = new StandardMaterial(name, scene)
  m.emissiveTexture = tex
  m.opacityTexture = tex
  m.emissiveColor = Color3.White()
  m.disableLighting = true
  m.specularColor = Color3.Black()
  m.backFaceCulling = false // plane normal may face away depending on axis convention
  m.alpha = 0.999 // force alpha path so opacityTexture transparency renders
  return m
}

/** One car. dir=+1 drives +x. cop => strobing lightbar. */
function buildCar(scene: Scene, rnd: () => number, cop: boolean): Car {
  const root = new TransformNode('car', scene)
  const paint = cop ? 0xb8c4d8 : [0x2a3450, 0x50323a, 0x1e3a34, 0x3a3a4a][Math.floor(rnd() * 4)]
  const paintMat = new StandardMaterial('paint', scene)
  paintMat.diffuseColor = Color3.FromHexString(hex(paint)).scale(0.35)
  paintMat.specularColor = new Color3(0.4, 0.4, 0.5)
  paintMat.maxSimultaneousLights = 4

  const body = MeshBuilder.CreateBox('body', { width: 4.2, height: 0.85, depth: 1.8 }, scene)
  body.position.y = 0.85
  body.material = paintMat
  body.parent = root
  const cabin = MeshBuilder.CreateBox('cab', { width: 2.2, height: 0.7, depth: 1.6 }, scene)
  cabin.position.set(-0.2, 1.55, 0)
  const glassMat = new StandardMaterial('glass', scene)
  glassMat.diffuseColor = new Color3(0.02, 0.03, 0.06)
  glassMat.emissiveColor = new Color3(0.05, 0.09, 0.14)
  cabin.material = glassMat
  cabin.parent = root

  const wheelMat = new StandardMaterial('wheel', scene)
  wheelMat.diffuseColor = new Color3(0.02, 0.02, 0.03)
  for (const [wx, wz] of [[-1.4, 0.85], [1.4, 0.85], [-1.4, -0.85], [1.4, -0.85]] as const) {
    const w = MeshBuilder.CreateCylinder('wh', { height: 0.3, diameter: 0.62 }, scene)
    w.rotation.x = Math.PI / 2
    w.position.set(wx, 0.31, wz)
    w.material = wheelMat
    w.parent = root
  }

  // head / tail lights (emissive only — bloom sells them)
  const headMat = new StandardMaterial('head', scene)
  headMat.emissiveColor = new Color3(1, 0.95, 0.8)
  headMat.disableLighting = true
  const tailMat = new StandardMaterial('tail', scene)
  tailMat.emissiveColor = new Color3(1, 0.1, 0.1)
  tailMat.disableLighting = true
  for (const z of [-0.6, 0.6]) {
    const h = MeshBuilder.CreateBox('hl', { width: 0.08, height: 0.22, depth: 0.3 }, scene)
    h.position.set(2.12, 0.95, z)
    h.material = headMat
    h.parent = root
    const tl = MeshBuilder.CreateBox('tl', { width: 0.08, height: 0.2, depth: 0.35 }, scene)
    tl.position.set(-2.12, 0.95, z)
    tl.material = tailMat
    tl.parent = root
  }

  let strobeA: PointLight | undefined
  let strobeB: PointLight | undefined
  if (cop) {
    const bar = MeshBuilder.CreateBox('lightbar', { width: 1.1, height: 0.18, depth: 1.2 }, scene)
    bar.position.set(-0.2, 2.0, 0)
    const barMat = new StandardMaterial('bar', scene)
    barMat.diffuseColor = new Color3(0.1, 0.1, 0.12)
    bar.material = barMat
    bar.parent = root
    const ra = MeshBuilder.CreateBox('ra', { width: 0.5, height: 0.14, depth: 1.1 }, scene)
    ra.position.set(0.08, 2.1, 0)
    const raMat = new StandardMaterial('ram', scene)
    raMat.emissiveColor = new Color3(1, 0.05, 0.1)
    raMat.disableLighting = true
    ra.material = raMat
    ra.parent = root
    const rb = MeshBuilder.CreateBox('rb', { width: 0.5, height: 0.14, depth: 1.1 }, scene)
    rb.position.set(-0.48, 2.1, 0)
    const rbMat = new StandardMaterial('rbm', scene)
    rbMat.emissiveColor = new Color3(0.1, 0.3, 1)
    rbMat.disableLighting = true
    rb.material = rbMat
    rb.parent = root
    strobeA = new PointLight('sa', new Vector3(0.08, 2.2, 0), scene)
    strobeA.diffuse = new Color3(1, 0.05, 0.1)
    strobeA.range = 22
    strobeA.parent = root
    strobeB = new PointLight('sb', new Vector3(-0.48, 2.2, 0), scene)
    strobeB.diffuse = new Color3(0.1, 0.3, 1)
    strobeB.range = 22
    strobeB.parent = root
  }

  const headlight = new PointLight('hl', new Vector3(2.4, 1.0, 0), scene)
  headlight.diffuse = new Color3(1, 0.92, 0.7)
  headlight.intensity = 0.55
  headlight.range = 9
  headlight.parent = root

  return { root, speed: 0, dir: 1, lane: 0, cop, strobeA, strobeB, headlight }
}

/** Ambient block building (always present). */
function buildAmbientBlock(
  scene: Scene,
  x: number,
  w: number,
  h: number,
  d: number,
  tex: DynamicTexture,
): Mesh {
  const b = MeshBuilder.CreateBox('amb', { width: w, height: h, depth: d }, scene)
  b.position.set(x, h / 2, -11 - d / 2)
  b.material = makeFacadeMaterial(scene, 'ambm', tex)
  return b
}

/** Owned business building — box + facade + neon sign + accent light + roof detail. */
function buildBusiness(scene: Scene, id: string, x: number, tapeTex: DynamicTexture): BizBuilding | null {
  const spec = NEON[id]
  if (!spec) return null
  const root = new TransformNode(`biz-${id}`, scene)
  root.position.set(x, 0, -11 - spec.d / 2)

  const tex = facadeTexture(scene, `fac-${id}`, id.length * 977 + 31, {
    base: '#0d1020',
    cols: Math.max(3, Math.round(spec.w / 1.7)),
    rows: Math.max(2, Math.round(spec.h / 2.2)),
    litRatio: 0.62,
    storefront: true,
    storefrontTint: hex(spec.color) + 'cc',
  })
  const body = MeshBuilder.CreateBox('b', { width: spec.w, height: spec.h, depth: spec.d }, scene)
  body.position.y = spec.h / 2
  body.material = makeFacadeMaterial(scene, `bm-${id}`, tex, 0.85)
  body.parent = root

  // neon edge strip along the roofline — each business reads its own color
  const edge = MeshBuilder.CreateBox('edge', { width: spec.w * 1.02, height: 0.16, depth: 0.2 }, scene)
  edge.position.set(0, spec.h + 0.05, spec.d / 2)
  const em = new StandardMaterial('em', scene)
  em.emissiveColor = Color3.FromHexString(hex(spec.color))
  em.disableLighting = true
  edge.material = em
  edge.parent = root

  // neon sign above storefront
  const sign = MeshBuilder.CreatePlane('sign', { width: spec.w * 0.8, height: spec.w * 0.8 * (160 / 512) }, scene)
  sign.position.set(0, Math.min(spec.h - 0.8, spec.h * 0.28 + 1.6), spec.d / 2 + 0.06)
  sign.rotation.y = Math.PI // front face toward the camera (CreatePlane faces -z)
  const signMat = makeSignMaterial(scene, `sm-${id}`, signTexture(scene, `st-${id}`, spec.label, hex(spec.color)))
  sign.material = signMat
  sign.parent = root

  // rooftop detail
  if (spec.roof === 'antenna') {
    const ant = MeshBuilder.CreateCylinder('ant', { height: spec.h * 0.45, diameterTop: 0.05, diameterBottom: 0.22 }, scene)
    ant.position.set(spec.w * 0.3, spec.h + spec.h * 0.22, 0)
    const am = new StandardMaterial('am', scene)
    am.diffuseColor = new Color3(0.15, 0.15, 0.2)
    ant.material = am
    ant.parent = root
    const tip = MeshBuilder.CreateSphere('tip', { diameter: 0.28 }, scene)
    tip.position.set(spec.w * 0.3, spec.h + spec.h * 0.45, 0)
    const tm = new StandardMaterial('tm', scene)
    tm.emissiveColor = new Color3(1, 0.15, 0.1)
    tm.disableLighting = true
    tip.material = tm
    tip.parent = root
  } else if (spec.roof === 'pad') {
    const pad = MeshBuilder.CreateCylinder('pad', { height: 0.3, diameter: spec.w * 0.7 }, scene)
    pad.position.set(0, spec.h + 0.15, 0)
    const pm = new StandardMaterial('pm', scene)
    pm.diffuseColor = new Color3(0.06, 0.07, 0.12)
    pad.material = pm
    pad.parent = root
    const hmark = MeshBuilder.CreateCylinder('hm', { height: 0.32, diameter: spec.w * 0.4, tessellation: 24 }, scene)
    hmark.position.set(0, spec.h + 0.16, 0)
    const hm = new StandardMaterial('hmm', scene)
    hm.emissiveColor = Color3.FromHexString(hex(spec.color)).scale(0.7)
    hm.disableLighting = true
    hmark.material = hm
    hmark.parent = root
  } else if (spec.roof === 'tank') {
    const tank = MeshBuilder.CreateCylinder('tk', { height: 1.6, diameter: 1.8 }, scene)
    tank.position.set(-spec.w * 0.25, spec.h + 0.8, -spec.d * 0.15)
    const tm2 = new StandardMaterial('tm2', scene)
    tm2.diffuseColor = new Color3(0.12, 0.1, 0.12)
    tank.material = tm2
    tank.parent = root
  }

  // accent light washing facade + street
  const accent = new PointLight(`al-${id}`, new Vector3(0, spec.h * 0.35, spec.d / 2 + 1.5), scene)
  accent.diffuse = Color3.FromHexString(hex(spec.color))
  accent.intensity = 0.7
  accent.range = spec.w * 2.4
  accent.parent = root

  // raid tape (hidden until raided)
  const tape = MeshBuilder.CreatePlane('tape', { width: spec.w * 1.25, height: spec.w * 0.18 }, scene)
  tape.position.set(0, 1.9, spec.d / 2 + 0.15)
  tape.rotation.z = 0.06
  tape.rotation.y = Math.PI
  const tmat = new StandardMaterial('tapem', scene)
  tmat.emissiveTexture = tapeTex
  tmat.opacityTexture = tapeTex
  tmat.emissiveColor = Color3.White()
  tmat.disableLighting = true
  tmat.backFaceCulling = false
  tmat.alpha = 0.999
  tape.material = tmat
  tape.parent = root
  tape.setEnabled(false)
  ;(root as unknown as { __tape?: AbstractMesh }).__tape = tape

  return { id, root, sign, signMat, accent, bornAt: performance.now(), h: spec.h }
}

/* ---------- world ---------- */

export function createCityWorld(canvas: HTMLCanvasElement, initialSnap: EmpireSnapshot): CityWorld {
  const engine = new Engine(canvas, true, { stencil: false, powerPreference: 'high-performance' }, false)
  if (window.devicePixelRatio > 2) engine.setHardwareScalingLevel(1.5)
  const scene = new Scene(engine)
  scene.clearColor = new Color4(0.012, 0.014, 0.03, 1)
  scene.fogMode = Scene.FOGMODE_EXP2
  scene.fogDensity = 0.0075
  scene.fogColor = new Color3(0.02, 0.025, 0.05)
  const rnd = mulberry(1337)

  // camera — fixed cinematic street-level shot with slow sway in tick()
  const cam = new FreeCamera('cam', new Vector3(0, 4.1, 16.5), scene)
  cam.setTarget(new Vector3(0, 1.9, -14))
  cam.fov = 0.92
  cam.minZ = 0.3
  cam.maxZ = 400

  // lights
  const hemi = new HemisphericLight('hemi', new Vector3(0, 1, 0.3), scene)
  hemi.intensity = 0.45
  hemi.diffuse = new Color3(0.35, 0.3, 0.5)
  hemi.groundColor = new Color3(0.05, 0.05, 0.1)
  const moon = new DirectionalLight('moon', new Vector3(0.4, -1, 0.6), scene)
  moon.diffuse = new Color3(0.5, 0.6, 0.9)
  moon.intensity = 0.22

  // ---- sky backdrop: reuse painted sky pano as a huge emissive plane ----
  const skyMat = new StandardMaterial('sky', scene)
  const skyTex = new Texture('/scene2/sky_pano.jpg', scene)
  skyMat.emissiveTexture = skyTex
  skyMat.diffuseColor = Color3.Black()
  skyMat.specularColor = Color3.Black()
  skyMat.disableLighting = true
  skyMat.emissiveColor = new Color3(0.95, 0.95, 1)
  skyMat.fogEnabled = false // backdrop must ignore EXP2 fog
  const sky = MeshBuilder.CreatePlane('sky', { width: 560, height: 240 }, scene)
  sky.position.set(0, 60, -140)
  sky.material = skyMat

  // ---- ground + wet road (mirror) ----
  const ground = MeshBuilder.CreateGround('g', { width: 240, height: 90 }, scene)
  ground.position.z = -15
  const gm = new StandardMaterial('gm', scene)
  gm.diffuseColor = new Color3(0.03, 0.033, 0.05)
  gm.specularColor = new Color3(0.02, 0.02, 0.03)
  gm.maxSimultaneousLights = 4
  ground.material = gm

  // sidewalk slabs
  const walkMat = new StandardMaterial('walk', scene)
  walkMat.diffuseColor = new Color3(0.09, 0.095, 0.13)
  walkMat.specularColor = new Color3(0.08, 0.08, 0.1)
  walkMat.maxSimultaneousLights = 4
  for (const [z0, w] of [[-3.2, 4.4], [6.6, 4.4]] as const) {
    const sw = MeshBuilder.CreateBox('sw', { width: 220, height: 0.24, depth: w }, scene)
    sw.position.set(0, 0.12, z0)
    sw.material = walkMat
  }

  const road = MeshBuilder.CreateGround('road', { width: 220, height: 5.6 }, scene)
  road.position.set(0, 0.02, 1.9)
  const rm = new StandardMaterial('rm', scene)
  rm.diffuseColor = new Color3(0.045, 0.05, 0.07)
  rm.specularColor = new Color3(0.35, 0.35, 0.45)
  rm.specularPower = 90
  rm.maxSimultaneousLights = 4
  const mirror = new MirrorTexture('mirror', 768, scene, true)
  mirror.mirrorPlane = new Plane(0, -1, 0, -0.02)
  const mirrorList: AbstractMesh[] = []
  mirror.renderList = mirrorList
  rm.reflectionTexture = mirror
  rm.reflectionTexture.level = 0.55
  road.material = rm

  // lane dashes + curb glow strips so the near street never reads as void
  const dashMat = new StandardMaterial('dash', scene)
  dashMat.emissiveColor = new Color3(0.5, 0.45, 0.2)
  dashMat.disableLighting = true
  for (let x = -52; x <= 52; x += 6) {
    const d = MeshBuilder.CreateGround('dash', { width: 2.2, height: 0.12 }, scene)
    d.position.set(x, 0.035, 1.9)
    d.material = dashMat
  }
  const curbMat = new StandardMaterial('curb', scene)
  curbMat.emissiveColor = new Color3(0.2, 0.14, 0.05)
  curbMat.disableLighting = true
  for (const z of [-1.05, 4.85] as const) {
    const curb = MeshBuilder.CreateBox('curb', { width: 220, height: 0.05, depth: 0.2 }, scene)
    curb.position.set(0, 0.26, z)
    curb.material = curbMat
  }
  // faint center crosswalk near the heart of the block
  const crossMat = new StandardMaterial('cross', scene)
  crossMat.emissiveColor = new Color3(0.35, 0.38, 0.45)
  crossMat.disableLighting = true
  crossMat.alpha = 0.4
  for (let x = -3; x <= 3; x += 1.2) {
    const s = MeshBuilder.CreateGround('xs', { width: 0.55, height: 4.4 }, scene)
    s.position.set(x, 0.032, 1.9)
    s.material = crossMat
  }

  // ---- streetlights ----
  const poleMat = new StandardMaterial('pole', scene)
  poleMat.diffuseColor = new Color3(0.08, 0.08, 0.1)
  const lampMat = new StandardMaterial('lamp', scene)
  lampMat.emissiveColor = new Color3(1, 0.75, 0.4)
  lampMat.disableLighting = true
  for (let x = -42; x <= 42; x += 14) {
    const pole = MeshBuilder.CreateCylinder('pole', { height: 5.4, diameter: 0.14 }, scene)
    pole.position.set(x, 2.7, -1.1)
    pole.material = poleMat
    const head = MeshBuilder.CreateBox('lh', { width: 0.8, height: 0.16, depth: 0.3 }, scene)
    head.position.set(x, 5.35, -0.8)
    head.material = lampMat
    const pl = new PointLight('pl', new Vector3(x, 5.2, -0.6), scene)
    pl.diffuse = new Color3(1, 0.72, 0.38)
    pl.intensity = 1.0
    pl.range = 20
  }

  // ---- ambient block: permanent buildings on the far row ----
  const ambientTexs = [0, 1, 2, 3, 4, 5].map((i) =>
    facadeTexture(scene, `amb-tex-${i}`, 1000 + i * 131, {
      base: ['#0a0d1a', '#0d1020', '#101020', '#0b0e18', '#0e0f1e', '#090c16'][i],
      cols: 6 + i,
      rows: 11 + i * 3,
      litRatio: 0.38 + (i % 3) * 0.08,
    }),
  )
  const ambientMeshes: Mesh[] = []
  {
    let x = -58
    let i = 0
    while (x < 60) {
      const w = 6 + rnd() * 8
      const h = 7 + rnd() * 17
      const d = 7 + rnd() * 5
      const m = buildAmbientBlock(scene, x + w / 2, w, h, d, ambientTexs[i % ambientTexs.length])
      m.position.z = -13 - rnd() * 6 - d / 2
      ambientMeshes.push(m)
      mirrorList.push(m)
      x += w + 0.8 + rnd() * 2.5
      i++
    }
    // fill light so the street level never reads as a void
    const fill = new PointLight('fill', new Vector3(0, 8, 4), scene)
    fill.diffuse = new Color3(1, 0.72, 0.45)
    fill.intensity = 0.55
    fill.range = 55
    const fillCool = new PointLight('fillC', new Vector3(0, 10, -14), scene)
    fillCool.diffuse = new Color3(0.4, 0.55, 1)
    fillCool.intensity = 0.4
    fillCool.range = 60
    // soft lift over the far sidewalk so pedestrians read as figures, not voids
    const pedFill = new PointLight('pedFill', new Vector3(0, 4.5, -3.2), scene)
    pedFill.diffuse = new Color3(0.75, 0.8, 1)
    pedFill.intensity = 0.45
    pedFill.range = 40

    // distant skyline silhouettes
    for (let row = 0; row < 2; row++) {
      let sx = -90
      const z = -45 - row * 22
      while (sx < 90) {
        const w = 8 + rnd() * 14
        const h = 14 + rnd() * (row === 0 ? 30 : 42)
        const b = MeshBuilder.CreateBox('sky', { width: w, height: h, depth: 8 }, scene)
        b.position.set(sx + w / 2, h / 2, z)
        const sm = new StandardMaterial('skym', scene)
        sm.diffuseColor = new Color3(0.03, 0.035, 0.06)
        sm.emissiveColor = new Color3(0.015, 0.02, 0.045)
        b.material = sm
        sx += w + 1 + rnd() * 4
      }
    }
  }

  // ---- peds (rigged) ----
  const peds: Ped[] = []
  const PED_COUNT = 10
  SceneLoader.LoadAssetContainerAsync('/models/', 'Soldier.glb', scene)
    .then((container) => {
      for (let i = 0; i < PED_COUNT; i++) {
        const inst = container.instantiateModelsToScene((n) => `${n}_p${i}`, true, { doNotInstantiate: false })
        const root = inst.rootNodes[0] as TransformNode
        // normalize height to ~1.75m
        const bb = root.getHierarchyBoundingVectors()
        const h = Math.max(0.001, bb.max.y - bb.min.y)
        const s = 1.75 / h
        root.scaling = new Vector3(s, s, s)
        const dir: 1 | -1 = i % 2 === 0 ? 1 : -1
        root.position.set(-30 + (60 * i) / PED_COUNT, 0.24, i % 2 === 0 ? -2.4 : -4.0)
        root.rotation.y = dir === 1 ? Math.PI / 2 : -Math.PI / 2
        const walk = inst.animationGroups.find((g) => /walk/i.test(g.name)) ?? inst.animationGroups[0] ?? null
        walk?.start(true, 1.0)
        peds.push({ root, speed: 0.9 + rnd() * 0.7, dir, lane: root.position.z, walk })
      }
    })
    .catch(() => {
      // model failed — scene still works, just no walkers
    })

  // ---- cars ----
  const cars: Car[] = []
  for (let i = 0; i < 6; i++) {
    const cop = i === 5 // one patrol unit in the pool, heat-gated
    const car = buildCar(scene, rnd, cop)
    const dir: 1 | -1 = i % 2 === 0 ? 1 : -1
    car.dir = dir
    car.lane = dir === 1 ? 3.4 : 0.4
    car.speed = 5 + rnd() * 8
    car.root.position.set(-45 + rnd() * 90, 0.02, car.lane)
    car.root.rotation.y = dir === 1 ? 0 : Math.PI
    if (cop) car.root.setEnabled(false)
    cars.push(car)
    car.root.getChildMeshes().forEach((m) => mirrorList.push(m))
  }
  // parked cruiser (appears with heat / raid)
  const parked = buildCar(scene, rnd, true)
  parked.root.position.set(6, 0.02, -0.6)
  parked.root.rotation.y = 0.35
  parked.root.setEnabled(false)
  parked.root.getChildMeshes().forEach((m) => mirrorList.push(m))
  cars.push(parked)

  // raid cruiser pair (spawned at raided building)
  const raidCars: Car[] = []
  for (let i = 0; i < 2; i++) {
    const rc = buildCar(scene, rnd, true)
    rc.root.rotation.y = i === 0 ? 0.5 : -0.45
    rc.root.setEnabled(false)
    raidCars.push(rc)
    cars.push(rc)
    rc.root.getChildMeshes().forEach((m) => mirrorList.push(m))
  }

  // ---- searchlights (heat gated) ----
  const beams: TransformNode[] = []
  for (let i = 0; i < 2; i++) {
    const pivot = new TransformNode('beamPivot', scene)
    pivot.position.set(i === 0 ? -22 : 26, 16, -26)
    const cone = MeshBuilder.CreateCylinder('beam', { height: 34, diameterTop: 0.4, diameterBottom: 7 }, scene)
    cone.position.y = 17
    const bm = new StandardMaterial('bm', scene)
    bm.emissiveColor = new Color3(0.55, 0.7, 1)
    bm.alpha = 0.16
    bm.disableLighting = true
    bm.fogEnabled = false
    cone.material = bm
    cone.parent = pivot
    pivot.rotation.z = i === 0 ? 0.5 : -0.5
    pivot.setEnabled(false)
    beams.push(pivot)
  }

  // ---- particles ----
  const softDot = dotTexture(scene, 'softDot')
  const rainTex = (() => {
    const t = new DynamicTexture('rain', { width: 8, height: 64 }, scene, true)
    const c = t.getContext() as unknown as CanvasRenderingContext2D
    const g = c.createLinearGradient(0, 0, 0, 64)
    g.addColorStop(0, 'rgba(170,200,255,0)')
    g.addColorStop(0.5, 'rgba(170,200,255,0.5)')
    g.addColorStop(1, 'rgba(170,200,255,0)')
    c.fillStyle = g
    c.fillRect(0, 0, 8, 64)
    t.update()
    t.hasAlpha = true
    return t
  })()

  const rain = new ParticleSystem('rain', 1600, scene)
  rain.particleTexture = rainTex
  rain.emitter = new Vector3(0, 26, -6)
  rain.minEmitBox = new Vector3(-55, 0, -30)
  rain.maxEmitBox = new Vector3(55, 0, 16)
  rain.direction1 = new Vector3(-0.06, -1, 0)
  rain.direction2 = new Vector3(0.06, -1, 0)
  rain.minSize = 0.35
  rain.maxSize = 0.6
  rain.minScaleX = 0.1
  rain.maxScaleX = 0.16
  rain.minScaleY = 1.4
  rain.maxScaleY = 2.2
  rain.minLifeTime = 0.9
  rain.maxLifeTime = 1.3
  rain.emitRate = 0
  rain.minEmitPower = 16
  rain.maxEmitPower = 22
  rain.gravity = new Vector3(0, -8, 0)
  rain.blendMode = ParticleSystem.BLENDMODE_ONEONE
  rain.start()

  const embers = new ParticleSystem('embers', 160, scene)
  embers.particleTexture = softDot
  embers.emitter = new Vector3(0, 0.5, -4)
  embers.minEmitBox = new Vector3(-30, 0, -10)
  embers.maxEmitBox = new Vector3(30, 1, 2)
  embers.direction1 = new Vector3(-0.3, 0.6, -0.1)
  embers.direction2 = new Vector3(0.3, 1.6, 0.1)
  embers.color1 = new Color4(1, 0.6, 0.25, 0.5)
  embers.color2 = new Color4(1, 0.35, 0.1, 0.3)
  embers.colorDead = new Color4(1, 0.2, 0, 0)
  embers.minSize = 0.05
  embers.maxSize = 0.14
  embers.minLifeTime = 3
  embers.maxLifeTime = 7
  embers.emitRate = 14
  embers.blendMode = ParticleSystem.BLENDMODE_ONEONE
  embers.start()

  // ---- post pipeline: bloom + vignette + grain + fxaa + ACES-ish grade ----
  const pipeline = new DefaultRenderingPipeline('rp', true, scene, [cam])
  pipeline.bloomEnabled = true
  pipeline.bloomThreshold = 0.72
  pipeline.bloomWeight = 0.42
  pipeline.bloomKernel = 64
  pipeline.fxaaEnabled = true
  pipeline.imageProcessing.toneMappingEnabled = true
  pipeline.imageProcessing.contrast = 1.18
  pipeline.imageProcessing.exposure = 1.35
  pipeline.imageProcessing.vignetteEnabled = true
  pipeline.imageProcessing.vignetteWeight = 1.9
  pipeline.imageProcessing.vignetteColor = new Color4(0, 0, 0, 0)
  pipeline.grainEnabled = true
  pipeline.grain.intensity = 7
  pipeline.grain.animated = true

  const glow = new GlowLayer('glow', scene, { blurKernelSize: 32 })
  glow.intensity = 0.38

  // ---- empire state ----
  const businesses = new Map<string, BizBuilding>()
  const tapeTex = tapeTexture(scene)
  let raidId: string | null = null
  let depthTier = 0
  let power = 0

  function spawnBusiness(id: string, x: number) {
    const spec = NEON[id]
    if (!spec) return
    const b = buildBusiness(scene, id, x, tapeTex)
    if (!b) return
    b.root.scaling = new Vector3(1, 0.02, 1)
    businesses.set(id, b)
    b.root.getChildMeshes().forEach((m) => mirrorList.push(m))
    // dust burst at base
    const dust = new ParticleSystem('dust', 90, scene)
    dust.particleTexture = softDot
    dust.emitter = new Vector3(x, 0.4, -10)
    dust.minEmitBox = new Vector3(-spec.w / 2, 0, 0)
    dust.maxEmitBox = new Vector3(spec.w / 2, 0.5, 0)
    dust.direction1 = new Vector3(-1.5, 1, 0.5)
    dust.direction2 = new Vector3(1.5, 3, 0.5)
    dust.color1 = new Color4(0.4, 0.35, 0.3, 0.5)
    dust.color2 = new Color4(0.2, 0.18, 0.16, 0.4)
    dust.colorDead = new Color4(0.1, 0.1, 0.1, 0)
    dust.minSize = 0.3
    dust.maxSize = 0.9
    dust.minLifeTime = 0.6
    dust.maxLifeTime = 1.4
    dust.emitRate = 500
    dust.targetStopDuration = 0.5
    dust.disposeOnStop = true
    dust.start()
  }

  function applySnapshot(snap: EmpireSnapshot) {
    raidId = snap.raidedBusinessId
    depthTier = snap.cityDepthTier
    power = snap.power
    const owned = BIZ_ORDER.filter((id) => (snap.businessLevels[id] ?? 0) > 0)
    // despawn missing
    for (const [id, b] of businesses) {
      if (!owned.includes(id)) {
        b.root.getChildMeshes().forEach((m) => {
          const ix = mirrorList.indexOf(m)
          if (ix >= 0) mirrorList.splice(ix, 1)
        })
        b.root.dispose()
        businesses.delete(id)
      }
    }
    const n = Math.max(owned.length, 1)
    const spacing = Math.min(13.5, (SLOT_MAX - SLOT_MIN) / n)
    const slotX = (i: number) => (i - (owned.length - 1) / 2) * spacing
    owned.forEach((id, i) => {
      if (!businesses.has(id)) spawnBusiness(id, slotX(i))
    })
    // reposition all to slots + shrink when the block gets crowded
    owned.forEach((id, i) => {
      const b = businesses.get(id)
      if (!b) return
      const spec = NEON[id]
      b.root.position.x = slotX(i)
      const shrink = Math.min(1, (spacing * 0.92) / (spec.w + 1))
      b.root.scaling.x = shrink
      b.root.scaling.z = shrink
    })
    // tape on raided
    for (const [id, b] of businesses) {
      const tape = (b.root as unknown as { __tape?: AbstractMesh }).__tape
      tape?.setEnabled(id === raidId)
    }
  }

  applySnapshot(initialSnap)

  // ---- raid strobes as world lights ----
  const strobeR = new PointLight('sr', new Vector3(0, 3, -8), scene)
  strobeR.diffuse = new Color3(1, 0.05, 0.1)
  strobeR.range = 30
  strobeR.intensity = 0
  const strobeB = new PointLight('sb', new Vector3(0, 3, -8), scene)
  strobeB.diffuse = new Color3(0.1, 0.3, 1)
  strobeB.range = 30
  strobeB.intensity = 0

  let t = 0
  let tickAcc = 0

  const world: CityWorld = {
    scene,
    applySnapshot,
    resize: () => engine.resize(),
    dispose: () => {
      engine.stopRenderLoop()
      scene.dispose()
      engine.dispose()
    },
    tick: (dtSec: number, heat01: number) => {
      t += dtSec
      tickAcc += dtSec
      const heatN = Math.min(1, Math.max(0, heat01))

      // camera drift — subtle, cinematic
      cam.position.x = Math.sin(t * 0.07) * 1.4
      cam.position.y = 4.1 + Math.sin(t * 0.11) * 0.25
      cam.setTarget(new Vector3(Math.sin(t * 0.05) * 2, 1.9 + Math.sin(t * 0.03) * 0.3, -14))

      // peds walk, wrap at edges
      for (const p of peds) {
        p.root.position.x += p.dir * p.speed * dtSec
        if (p.root.position.x > 34) p.root.position.x = -34
        if (p.root.position.x < -34) p.root.position.x = 34
      }

      // cars
      for (const c of cars) {
        if (!c.root.isEnabled()) continue
        c.root.position.x += c.dir * c.speed * dtSec
        if (c.root.position.x > 52) c.root.position.x = -52
        if (c.root.position.x < -52) c.root.position.x = 52
      }

      // cop presence gates
      const patrol = cars[5]
      patrol.root.setEnabled(heatN > 0.3)
      parked.root.setEnabled(heatN > 0.6 || !!raidId)

      // strobe spin — cop lightbars always flash when their car is enabled
      const flash = Math.sin(t * 11) > 0
      const strobesOn = heatN > 0.3
      for (const c of cars) {
        if (!c.cop || !c.strobeA || !c.strobeB) continue
        const on = c.root.isEnabled() && strobesOn
        c.strobeA.intensity = on ? (flash ? 1.6 : 0) : 0
        c.strobeB.intensity = on ? (flash ? 0 : 1.6) : 0
      }

      // raid: cruisers flank the raided building + world strobes
      const raidB = raidId ? businesses.get(raidId) : undefined
      if (raidB) {
        raidCars[0].root.setEnabled(true)
        raidCars[1].root.setEnabled(true)
        raidCars[0].root.position.set(raidB.root.position.x - 4.5, 0.02, -5.4)
        raidCars[1].root.position.set(raidB.root.position.x + 4.5, 0.02, -5.0)
        for (const rc of raidCars) {
          if (rc.strobeA && rc.strobeB) {
            rc.strobeA.intensity = flash ? 2.8 : 0
            rc.strobeB.intensity = flash ? 0 : 2.8
          }
        }
        strobeR.position.x = raidB.root.position.x - 3
        strobeB.position.x = raidB.root.position.x + 3
        strobeR.intensity = flash ? 2.4 : 0
        strobeB.intensity = flash ? 0 : 2.4
      } else {
        raidCars[0].root.setEnabled(false)
        raidCars[1].root.setEnabled(false)
        strobeR.intensity = 0
        strobeB.intensity = 0
      }

      // searchlights sweep when hot
      const beamsOn = heatN > 0.45
      for (let i = 0; i < beams.length; i++) {
        const b = beams[i]
        b.setEnabled(beamsOn)
        if (beamsOn) {
          b.rotation.z = (i === 0 ? 0.55 : -0.55) + Math.sin(t * 0.5 + i * 2.4) * 0.4
          b.rotation.x = Math.sin(t * 0.3 + i) * 0.15
        }
      }

      // business rise-in + neon flicker
      const now = performance.now()
      for (const b of businesses.values()) {
        const age = (now - b.bornAt) / 1000
        if (age < 1.4) {
          const k = Math.min(1, age / 1.2)
          const ease = 1 - Math.pow(1 - k, 3)
          const over = 1 + Math.sin(Math.min(1, k) * Math.PI) * 0.04
          b.root.scaling.y = Math.max(0.02, ease * over)
          b.signMat.emissiveColor = new Color3(ease, ease, ease)
        } else if (b.root.scaling.y !== 1) {
          b.root.scaling.y = 1
          b.signMat.emissiveColor = Color3.White()
        }
        // neon flicker
        const fl = 0.9 + Math.sin(t * 13 + b.root.position.x) * 0.04 + (Math.random() < 0.02 ? -0.35 : 0)
        b.accent.intensity = 0.7 * Math.max(0.4, fl)
        const k = Math.max(0.35, fl)
        b.signMat.emissiveColor = new Color3(k, k, k)
      }

      // power → ambient glow
      hemi.intensity = 0.45 + Math.min(0.18, power * 0.00004)
      glow.intensity = 0.38 + Math.min(0.3, power * 0.00008)

      // skyline depth tier adds distant rows (cheap — just emissive tweak)
      if (depthTier > 0 && tickAcc > 2) {
        tickAcc = 0
      }

      // rain cycles drizzle → downpour
      const rainEnv = Math.max(0, Math.sin(t * 0.00013 * 1000) * 0.7 + 0.12)
      rain.emitRate = rainEnv * 700
    },
  }

  return world
}
