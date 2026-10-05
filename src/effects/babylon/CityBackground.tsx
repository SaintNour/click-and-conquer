import { useEffect, useRef } from 'react'
import type { GameState } from '../../data/types'
import { isHeatCrackdownActive } from '../../game/heatCrackdownEngine'
import { empireSnapshotFromState } from '../../game/visualMetrics'
import { createCityWorld, type CityWorld } from './cityWorld'

type Props = {
  state: GameState
  /** Changes only when empire composition changes (buy / raid / tier). */
  empireVisualKey: string
}

export function CityBackground({ state, empireVisualKey }: Props) {
  const hostRef = useRef<HTMLDivElement | null>(null)
  const worldRef = useRef<CityWorld | null>(null)
  const liveRef = useRef({ heat: 0 })

  // keep the latest heat available to the render loop
  liveRef.current.heat = Math.max(state.heat, isHeatCrackdownActive(state) ? 95 : 0) / 100

  useEffect(() => {
    const host = hostRef.current
    if (!host) return
    const canvas = document.createElement('canvas')
    canvas.style.width = '100%'
    canvas.style.height = '100%'
    canvas.style.display = 'block'
    canvas.style.touchAction = 'none'
    host.appendChild(canvas)

    let world: CityWorld | null = null
    try {
      world = createCityWorld(canvas, empireSnapshotFromState(state))
      worldRef.current = world
    } catch {
      host.removeChild(canvas)
      return
    }

    let last = performance.now()
    world.scene.getEngine().runRenderLoop(() => {
      const now = performance.now()
      const dt = Math.min(0.1, (now - last) / 1000)
      last = now
      world!.tick(dt, liveRef.current.heat)
      if (world!.scene.activeCamera) world!.scene.render()
    })

    const ro = new ResizeObserver(() => world?.resize())
    ro.observe(host)

    return () => {
      ro.disconnect()
      worldRef.current = null
      world?.dispose()
      canvas.remove()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- engine mounts once per host
  }, [])

  // rebuild-only contract: composition changed → apply snapshot
  useEffect(() => {
    worldRef.current?.applySnapshot(empireSnapshotFromState(state))
    // eslint-disable-next-line react-hooks/exhaustive-deps -- keyed rebuild, not continuous state
  }, [empireVisualKey])

  return <div ref={hostRef} className="street-bg" aria-hidden="true" />
}
