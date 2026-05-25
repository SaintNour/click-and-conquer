/**
 * Central game SFX — Web Audio, no asset files. Preload via `primeGameAudio()` on first gesture.
 * Volume + mute persist in localStorage; exported helpers keep existing call sites working.
 */

const MUTE_KEY = 'clicky-sfx-muted'
const VOLUME_KEY = 'clicky-sfx-volume'

const MASTER_BASE = 0.22

let sfxMuted = false
let volume01 = 1

try {
  if (typeof localStorage !== 'undefined') {
    sfxMuted = localStorage.getItem(MUTE_KEY) === '1'
    const v = localStorage.getItem(VOLUME_KEY)
    if (v != null) {
      const n = Number(v)
      if (Number.isFinite(n)) volume01 = Math.min(1, Math.max(0, n))
    }
  }
} catch {
  sfxMuted = false
  volume01 = 1
}

export function getSfxMuted(): boolean {
  return sfxMuted
}

export function setSfxMuted(muted: boolean): void {
  sfxMuted = muted
  try {
    localStorage.setItem(MUTE_KEY, muted ? '1' : '0')
  } catch {
    /* ignore */
  }
  syncMasterGain()
}

/** 0–1 UI volume (muted forces silence). */
export function getSfxVolume01(): number {
  return volume01
}

export function setSfxVolume01(v: number): void {
  volume01 = Math.min(1, Math.max(0, v))
  try {
    localStorage.setItem(VOLUME_KEY, String(volume01))
  } catch {
    /* ignore */
  }
  syncMasterGain()
}

let audioCtx: AudioContext | null = null
let masterGain: GainNode | null = null
let primed = false

function syncMasterGain(): void {
  if (!masterGain) return
  const g = sfxMuted ? 0 : MASTER_BASE * volume01
  masterGain.gain.value = g
}

function ctx(): AudioContext | null {
  if (typeof window === 'undefined') return null
  if (audioCtx) return audioCtx
  const AC =
    window.AudioContext ||
    (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!AC) return null
  audioCtx = new AC()
  masterGain = audioCtx.createGain()
  syncMasterGain()
  masterGain.connect(audioCtx.destination)
  return audioCtx
}

function resume(): void {
  const c = ctx()
  if (c?.state === 'suspended') void c.resume()
}

/** Call once after a user gesture so the first click is not silent (browser autoplay policy). */
export function primeGameAudio(): void {
  if (primed) return
  const c = ctx()
  if (!c || !masterGain) return
  resume()
  const buf = c.createBuffer(1, 1, c.sampleRate)
  const src = c.createBufferSource()
  src.buffer = buf
  src.connect(masterGain)
  src.start()
  src.stop(c.currentTime + 0.001)
  primed = true
}

function connectThroughGain(
  c: AudioContext,
  source: AudioNode,
  peak: number,
  attack: number,
  sustain: number,
  release: number,
): void {
  if (!masterGain) return
  const g = c.createGain()
  const t = c.currentTime
  g.gain.setValueAtTime(0.0001, t)
  g.gain.exponentialRampToValueAtTime(peak, t + attack)
  g.gain.exponentialRampToValueAtTime(peak * 0.55, t + attack + sustain)
  g.gain.exponentialRampToValueAtTime(0.0001, t + attack + sustain + release)
  source.connect(g)
  g.connect(masterGain)
}

let lastPriorityAt = 0
const PRIORITY_GAP_MS = 380

function canPlayPriority(): boolean {
  const now = performance.now()
  if (now - lastPriorityAt < PRIORITY_GAP_MS) return false
  lastPriorityAt = now
  return true
}

let lastClickAt = 0
const CLICK_GAP_MS = 36

export function playClickSfx(): void {
  if (sfxMuted) return
  const c = ctx()
  if (!c || !masterGain) return
  const now = performance.now()
  if (now - lastClickAt < CLICK_GAP_MS) return
  lastClickAt = now
  resume()
  const detune = (Math.random() - 0.5) * 28
  const volJitter = 0.85 + Math.random() * 0.22
  const o = c.createOscillator()
  o.type = 'triangle'
  const f0 = 320 + detune
  const f1 = 480 + detune * 0.6
  o.frequency.setValueAtTime(f0, c.currentTime)
  o.frequency.exponentialRampToValueAtTime(Math.max(80, f1), c.currentTime + 0.032)
  connectThroughGain(c, o, 0.1 * volJitter, 0.004, 0.018, 0.038)
  o.start()
  o.stop(c.currentTime + 0.095)
}

let lastEventOpenAt = 0
const EVENT_OPEN_GAP_MS = 220

export function playEventOpenSfx(): void {
  if (sfxMuted) return
  const c = ctx()
  if (!c || !masterGain) return
  const now = performance.now()
  if (now - lastEventOpenAt < EVENT_OPEN_GAP_MS) return
  lastEventOpenAt = now
  resume()
  const o = c.createOscillator()
  o.type = 'sine'
  o.frequency.setValueAtTime(220, c.currentTime)
  o.frequency.exponentialRampToValueAtTime(380, c.currentTime + 0.12)
  connectThroughGain(c, o, 0.14, 0.02, 0.08, 0.14)
  o.start()
  o.stop(c.currentTime + 0.28)
}

let lastMinorLifeOpenAt = 0
const MINOR_LIFE_OPEN_GAP_MS = 200

/** Soft cue for non-blocking life events (corner card). */
export function playMinorLifeEventOpenSfx(): void {
  if (sfxMuted) return
  const c = ctx()
  if (!c || !masterGain) return
  const now = performance.now()
  if (now - lastMinorLifeOpenAt < MINOR_LIFE_OPEN_GAP_MS) return
  lastMinorLifeOpenAt = now
  resume()
  const o = c.createOscillator()
  o.type = 'sine'
  o.frequency.setValueAtTime(380, c.currentTime)
  o.frequency.exponentialRampToValueAtTime(520, c.currentTime + 0.07)
  connectThroughGain(c, o, 0.07, 0.01, 0.05, 0.1)
  o.start()
  o.stop(c.currentTime + 0.2)
}

let lastMajorLifeOpenAt = 0
const MAJOR_LIFE_OPEN_GAP_MS = 260

/** Stronger cue for blocking major life events (center modal). */
export function playMajorLifeEventOpenSfx(): void {
  if (sfxMuted) return
  const c = ctx()
  if (!c || !masterGain) return
  const now = performance.now()
  if (now - lastMajorLifeOpenAt < MAJOR_LIFE_OPEN_GAP_MS) return
  lastMajorLifeOpenAt = now
  resume()
  const t = c.currentTime
  const o1 = c.createOscillator()
  o1.type = 'triangle'
  o1.frequency.setValueAtTime(196, t)
  o1.frequency.exponentialRampToValueAtTime(392, t + 0.14)
  connectThroughGain(c, o1, 0.1, 0.015, 0.1, 0.16)
  o1.start()
  o1.stop(t + 0.38)
  const o2 = c.createOscillator()
  o2.type = 'sine'
  o2.frequency.setValueAtTime(294, t + 0.05)
  o2.frequency.setValueAtTime(440, t + 0.2)
  connectThroughGain(c, o2, 0.06, 0.02, 0.12, 0.18)
  o2.start(t + 0.05)
  o2.stop(t + 0.36)
}

let lastOutcomeAt = 0
const OUTCOME_GAP_MS = 260

export function playSuccessSfx(): void {
  if (sfxMuted) return
  const c = ctx()
  if (!c || !masterGain) return
  const now = performance.now()
  if (now - lastOutcomeAt < OUTCOME_GAP_MS) return
  lastOutcomeAt = now
  resume()
  const o = c.createOscillator()
  o.type = 'sine'
  const t = c.currentTime
  o.frequency.setValueAtTime(523.25, t)
  o.frequency.setValueAtTime(659.25, t + 0.06)
  o.frequency.setValueAtTime(783.99, t + 0.12)
  connectThroughGain(c, o, 0.13, 0.012, 0.1, 0.16)
  o.start()
  o.stop(t + 0.32)
}

export function playFailSfx(): void {
  if (sfxMuted) return
  const c = ctx()
  if (!c || !masterGain) return
  const now = performance.now()
  if (now - lastOutcomeAt < OUTCOME_GAP_MS) return
  lastOutcomeAt = now
  resume()
  const o = c.createOscillator()
  o.type = 'sawtooth'
  o.frequency.setValueAtTime(185, c.currentTime)
  o.frequency.exponentialRampToValueAtTime(95, c.currentTime + 0.18)
  connectThroughGain(c, o, 0.07, 0.006, 0.12, 0.1)
  o.start()
  o.stop(c.currentTime + 0.24)
}

let lastPurchaseAt = 0
const PURCHASE_GAP_MS = 90

export function playPurchaseSfx(): void {
  if (sfxMuted) return
  const c = ctx()
  if (!c || !masterGain) return
  const now = performance.now()
  if (now - lastPurchaseAt < PURCHASE_GAP_MS) return
  lastPurchaseAt = now
  resume()
  const o = c.createOscillator()
  o.type = 'sine'
  o.frequency.setValueAtTime(440, c.currentTime)
  o.frequency.exponentialRampToValueAtTime(660, c.currentTime + 0.07)
  connectThroughGain(c, o, 0.1, 0.008, 0.05, 0.08)
  o.start()
  o.stop(c.currentTime + 0.14)
}

/** Heat crossed warning threshold (throttled vs crackdown). */
export function playHeatWarningSfx(): void {
  if (sfxMuted) return
  if (!canPlayPriority()) return
  const c = ctx()
  if (!c || !masterGain) return
  resume()
  const o = c.createOscillator()
  o.type = 'square'
  o.frequency.setValueAtTime(180, c.currentTime)
  o.frequency.linearRampToValueAtTime(240, c.currentTime + 0.09)
  connectThroughGain(c, o, 0.045, 0.002, 0.06, 0.1)
  o.start()
  o.stop(c.currentTime + 0.2)
}

/** Max heat / police crackdown banner. */
export function playHeatCrackdownSfx(): void {
  if (sfxMuted) return
  lastPriorityAt = performance.now()
  const c = ctx()
  if (!c || !masterGain) return
  resume()
  const o = c.createOscillator()
  o.type = 'sawtooth'
  const t = c.currentTime
  o.frequency.setValueAtTime(280, t)
  o.frequency.exponentialRampToValueAtTime(88, t + 0.36)
  connectThroughGain(c, o, 0.11, 0.006, 0.16, 0.2)
  o.start()
  o.stop(t + 0.45)
}

/** Namespace for new code; same functions as top-level exports. */
export const gameSound = {
  prime: primeGameAudio,
  playClick: playClickSfx,
  playPurchase: playPurchaseSfx,
  playEventOpen: playEventOpenSfx,
  playMinorLifeOpen: playMinorLifeEventOpenSfx,
  playMajorLifeOpen: playMajorLifeEventOpenSfx,
  playSuccess: playSuccessSfx,
  playFail: playFailSfx,
  playHeatWarning: playHeatWarningSfx,
  playHeatCrackdown: playHeatCrackdownSfx,
  getMuted: getSfxMuted,
  setMuted: setSfxMuted,
  getVolume: getSfxVolume01,
  setVolume: setSfxVolume01,
}
