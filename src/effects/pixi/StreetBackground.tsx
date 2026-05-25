import { Application } from 'pixi.js'
import { useEffect, useRef } from 'react'
import type { GameState } from '../../data/types'
import { empireSnapshotFromState, empireSnapshotKey } from '../../game/visualMetrics'
import {
  createEmpireLayers,
  createEmpireRuntime,
  mountEmpireLayers,
  rebuildEmpireScene,
  tickEmpire,
} from './empireScene'

type Props = {
  state: GameState
  /** Rebuild scene only when visual fingerprint changes (not every money tick). */
  empireVisualKey: string
}

export function StreetBackground({ state, empireVisualKey }: Props) {
  const hostRef = useRef<HTMLDivElement>(null)
  const stateRef = useRef(state)

  const appRef = useRef<Application | null>(null)
  const layersRef = useRef<ReturnType<typeof createEmpireLayers> | null>(null)
  const runtimeRef = useRef(createEmpireRuntime())
  const lastKeyRef = useRef('')
  const cleanupVisRef = useRef<(() => void) | null>(null)

  useEffect(() => {
    stateRef.current = state
  }, [state])

  useEffect(() => {
    const host = hostRef.current
    if (!host) return

    let destroyed = false
    let resizeObs: ResizeObserver | null = null
    const app = new Application()
    const runtime = runtimeRef.current
    const layers = createEmpireLayers()
    layersRef.current = layers

    const applySnapshot = () => {
      const a = appRef.current
      const L = layersRef.current
      if (!a || !L) return
      const snap = empireSnapshotFromState(stateRef.current)
      const key = empireSnapshotKey(snap, a.screen.width, a.screen.height)
      if (key === lastKeyRef.current) return
      lastKeyRef.current = key
      rebuildEmpireScene(a, L, snap, runtime)
    }

    void (async () => {
      // Perf: the empire background scales with the viewport. At fullscreen with
      // DPR=2 (4K / Retina) the GPU has to draw ~4x more pixels per frame than
      // windowed, which is the dominant cause of fullscreen jank. We cap the
      // canvas resolution at 1.0 (CSS upscales the result; visual loss is
      // imperceptible for a background) and disable MSAA. This is the single
      // biggest fix for fullscreen-only lag.
      const baseDpr = typeof window !== 'undefined' ? (window.devicePixelRatio ?? 1) : 1
      const cappedDpr = Math.min(baseDpr, 1)
      await app.init({
        resizeTo: host,
        backgroundAlpha: 0,
        antialias: false,
        autoDensity: true,
        resolution: cappedDpr,
        powerPreference: 'high-performance',
      })
      if (destroyed) {
        app.destroy(true)
        return
      }

      const canvas = app.canvas as HTMLCanvasElement
      canvas.style.position = 'absolute'
      canvas.style.inset = '0'
      canvas.style.width = '100%'
      canvas.style.height = '100%'
      canvas.style.pointerEvents = 'none'
      host.appendChild(canvas)

      mountEmpireLayers(app.stage, layers)
      appRef.current = app

      // Perf: cap renderer to 30fps. The empire scene is a slow parallax
      // background — running it at the display refresh rate (60/120/144Hz)
      // wastes GPU work that has no perceptible benefit. This halves or
      // better the per-frame WebGL cost on most screens.
      app.ticker.maxFPS = 30
      app.ticker.minFPS = 15

      applySnapshot()

      app.ticker.add(() => {
        const a = appRef.current
        const L = layersRef.current
        if (!a || !L) return
        tickEmpire(runtime, a, L, app.ticker.deltaMS, stateRef.current.power)
      })

      const onVis = () => {
        if (document.visibilityState === 'hidden') {
          app.ticker.stop()
        } else if (!destroyed) {
          app.ticker.start()
        }
      }
      document.addEventListener('visibilitychange', onVis)
      cleanupVisRef.current = () => document.removeEventListener('visibilitychange', onVis)

      resizeObs = new ResizeObserver(() => {
        lastKeyRef.current = ''
        applySnapshot()
      })
      resizeObs.observe(host)
    })()

    return () => {
      destroyed = true
      resizeObs?.disconnect()
      cleanupVisRef.current?.()
      cleanupVisRef.current = null
      appRef.current?.destroy(true)
      appRef.current = null
      layersRef.current = null
      lastKeyRef.current = ''
    }
  }, [])

  useEffect(() => {
    const app = appRef.current
    const L = layersRef.current
    if (!app || !L) return

    const snap = empireSnapshotFromState(stateRef.current)
    const key = empireSnapshotKey(snap, app.screen.width, app.screen.height)
    if (key === lastKeyRef.current) return
    lastKeyRef.current = key
    rebuildEmpireScene(app, L, snap, runtimeRef.current)
    // empireVisualKey ensures this runs when recruit/business/territory/power-tier changes
  }, [empireVisualKey])

  return <div className="street-bg" ref={hostRef} aria-hidden />
}
