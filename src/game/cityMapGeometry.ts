/**
 * Irregular contiguous territory map (bounded Voronoi diagram).
 * Reads like a puzzle-piece landmass — same connectivity goal as reference turf maps.
 */

import { Delaunay } from 'd3-delaunay'

export type CityMapRegionGeom = {
  id: string
  /** SVG path `d` */
  d: string
  labelX: number
  labelY: number
}

export const CITY_MAP_VIEW_W = 1200
export const CITY_MAP_VIEW_H = 640

const MAP_PAD = 44

function hashIds(ids: string[]): number {
  let h = 2166136261
  const s = ids.join('\0')
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

function mulberry32(seed: number): () => number {
  return () => {
    let t = (seed += 0x6d2b79f5)
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function clamp(x: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, x))
}

/** Jittered grid sites — even coverage, deterministic from id list. */
function generateSites(
  n: number,
  rng: () => number,
  w: number,
  h: number,
  pad: number,
): [number, number][] {
  const innerW = w - pad * 2
  const innerH = h - pad * 2
  const aspect = innerW / Math.max(1, innerH)
  const cols = Math.max(1, Math.ceil(Math.sqrt(n * aspect)))
  const rowCount = Math.max(1, Math.ceil(n / cols))
  const cellW = innerW / cols
  const cellH = innerH / rowCount
  const sites: [number, number][] = []
  for (let i = 0; i < n; i++) {
    const c = i % cols
    const r = Math.floor(i / cols)
    const jitterX = (rng() - 0.5) * cellW * 0.62
    const jitterY = (rng() - 0.5) * cellH * 0.62
    const x = pad + cellW * (c + 0.5) + jitterX
    const y = pad + cellH * (r + 0.5) + jitterY
    sites.push([clamp(x, pad + 6, w - pad - 6), clamp(y, pad + 6, h - pad - 6)])
  }
  return sites
}

function polygonCentroid(poly: [number, number][]): [number, number] {
  let twice = 0
  let cx = 0
  let cy = 0
  const n = poly.length
  if (n < 3) return poly[0] ?? [0, 0]
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const p = poly[i]!
    const q = poly[j]!
    const cross = q[0] * p[1] - p[0] * q[1]
    twice += cross
    cx += (q[0] + p[0]) * cross
    cy += (q[1] + p[1]) * cross
  }
  if (Math.abs(twice) < 1e-6) {
    let sx = 0
    let sy = 0
    for (const p of poly) {
      sx += p[0]
      sy += p[1]
    }
    return [sx / n, sy / n]
  }
  const area = twice / 2
  return [cx / (6 * area), cy / (6 * area)]
}

function ringToPath(ring: [number, number][]): string {
  if (ring.length === 0) return ''
  const [x0, y0] = ring[0]!
  let d = `M ${x0.toFixed(2)} ${y0.toFixed(2)}`
  for (let i = 1; i < ring.length; i++) {
    const p = ring[i]!
    d += ` L ${p[0].toFixed(2)} ${p[1].toFixed(2)}`
  }
  return `${d} Z`
}

/**
 * Decorative river path (screen-space), sits under ward fills.
 */
export function buildCityMapRiverPath(): string {
  const w = CITY_MAP_VIEW_W
  const h = CITY_MAP_VIEW_H
  const y0 = h * 0.38
  const y1 = h * 0.52
  return [
    `M ${-40} ${y0}`,
    `C ${w * 0.22} ${h * 0.28} ${w * 0.42} ${h * 0.62} ${w * 0.55} ${y1}`,
    `S ${w * 0.88} ${h * 0.35} ${w + 40} ${h * 0.44}`,
  ].join(' ')
}

/**
 * Bounded Voronoi slab: wards tile the frame with shared edges (no floating islands).
 */
export function buildCityMapRegions(territoryIds: string[]): CityMapRegionGeom[] {
  const n = territoryIds.length
  if (n === 0) return []

  const idsSorted = [...territoryIds].sort((a, b) => a.localeCompare(b))
  const rng = mulberry32(hashIds(idsSorted))

  const sites = generateSites(n, rng, CITY_MAP_VIEW_W, CITY_MAP_VIEW_H, MAP_PAD)
  const order = sites
    .map((_, i) => i)
    .sort((ia, ib) => {
      const [ax, ay] = sites[ia]!
      const [bx, by] = sites[ib]!
      return ay - by || ax - bx || ia - ib
    })
  const sitesGeo = order.map((i) => sites[i]!)

  const points: [number, number][] = sitesGeo.map((p) => [p[0], p[1]])
  const delaunay = Delaunay.from(points)
  const voronoi = delaunay.voronoi([0, 0, CITY_MAP_VIEW_W, CITY_MAP_VIEW_H])

  const out: CityMapRegionGeom[] = []
  for (let i = 0; i < n; i++) {
    const id = idsSorted[i]!
    const raw = voronoi.cellPolygon(i) as [number, number][] | null | undefined
    let ring: [number, number][]
    if (raw && raw.length >= 3) {
      ring = raw as [number, number][]
    } else {
      const [cx, cy] = sitesGeo[i]!
      const s = 28
      ring = [
        [cx, cy - s],
        [cx + s * 0.9, cy],
        [cx, cy + s],
        [cx - s * 0.9, cy],
      ]
    }
    const [lx, ly] = polygonCentroid(ring)
    out.push({
      id,
      d: ringToPath(ring),
      labelX: lx,
      labelY: ly,
    })
  }
  return out
}

export const CITY_MAP_VIEWBOX = `0 0 ${CITY_MAP_VIEW_W} ${CITY_MAP_VIEW_H}`
