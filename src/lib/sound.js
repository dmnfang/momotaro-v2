import { useSyncExternalStore } from 'react'

const BASE = import.meta.env.BASE_URL + 'sfx/'

/* ================= TUNING KNOBS ================= */
// Master levels (0–1). Saved under a versioned key so old saved volumes are ignored.
const DEFAULTS = { sfxOn: true, musicOn: true, sfxVol: 0.5, musicVol: 0.2 }

// Per-sound level, multiplied with the master. 1 = as exported; lower = quieter.
const GAIN = {
  tap: 0.55,
  toggle: 0.5,
  launch: 0.7,
  close: 0.6,
  modalOpen: 0.55,
  nextCard: 0.65,
  correct: 0.7,
  wrong: 0.7,
  celebration: 0.4,
  tilePop: 0.8,
  cardFlip: 0.8,
}
const LOOP_GAIN = { lofi: 1 }

// Pitch changes that keep Tap and Toggle sounding different from each other
const TAP_RATE = 0.85         // plain buttons: a bit lower
const SWITCH_ON_RATE = 1.2    // on/off switches turning on
const SWITCH_OFF_RATE = 0.8   // on/off switches turning off
const SELECT_RATE = 1.1       // radio-style pills changing selection

// Synthesized tick (used for the score count-up and the swap pulses)
const TICK_VOLUME = 0.5
/* ================================================= */

// Files live in public/sfx/ (copy them over from cardbox-app)
const SFX = {
  tap: 'Tap.mp3',
  toggle: 'Toggle.mp3',
  launch: 'Launch.mp3',
  close: 'Close.mp3',
  modalOpen: 'Modal_open.mp3',
  nextCard: 'Next_card.mp3',
  correct: 'Correct.mp3',
  wrong: 'Wrong.mp3',
  celebration: 'Celebration.mp3',
  tilePop: 'Reveal_-_Tile_Pop.mp3',
  cardFlip: 'Flip_-_Card_flip.mp3',
}

// Loops are loaded lazily. bus: 'music' follows the music toggle, 'sfx' follows the SFX toggle.
const LOOPS = {
  lofi: { file: 'Menu_and_Settings_-_Lofi_Loop.mp3', bus: 'music' },
}

/* ---------- settings (persisted) ---------- */
const STORAGE_KEY = 'momotaro:sound:v1'

function loadState() {
  try {
    return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') }
  } catch {
    return { ...DEFAULTS }
  }
}

let state = loadState()
const listeners = new Set()

function setState(patch) {
  state = { ...state, ...patch }
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)) } catch { /* private mode etc. */ }
  applyVolumes()
  listeners.forEach(l => l())
}

const subscribe = fn => { listeners.add(fn); return () => listeners.delete(fn) }
const getState = () => state

export const toggleSfx = () => setState({ sfxOn: !state.sfxOn })
export const toggleMusic = () => setState({ musicOn: !state.musicOn })

export function useSoundSettings() {
  const s = useSyncExternalStore(subscribe, getState)
  return { ...s, toggleSfx, toggleMusic }
}

/* ---------- audio engine ---------- */
let ctx = null
let sfxBus = null
let musicBus = null
const buffers = new Map()
const loading = new Map()
const lastPlayed = {}
const wanted = new Map()   // loops we want playing
const running = new Map()  // loops actually playing

function ensureCtx() {
  if (ctx) return ctx
  const AC = window.AudioContext || window.webkitAudioContext
  if (!AC) return null
  ctx = new AC({ latencyHint: 'interactive' })
  sfxBus = ctx.createGain()
  musicBus = ctx.createGain()
  sfxBus.connect(ctx.destination)
  musicBus.connect(ctx.destination)
  applyVolumes()
  return ctx
}

function applyVolumes() {
  if (!ctx) return
  const t = ctx.currentTime
  sfxBus.gain.setTargetAtTime(state.sfxOn ? state.sfxVol : 0, t, 0.02)
  musicBus.gain.setTargetAtTime(state.musicOn ? state.musicVol : 0, t, 0.05)
}

function load(name, file) {
  if (buffers.has(name)) return Promise.resolve(buffers.get(name))
  if (loading.has(name)) return loading.get(name)
  const p = fetch(BASE + file)
    .then(r => r.arrayBuffer())
    // callback form of decodeAudioData for older Safari
    .then(ab => new Promise((res, rej) => ctx.decodeAudioData(ab, res, rej)))
    .then(buf => { buffers.set(name, buf); return buf })
    .catch(err => { console.warn('[sound] failed to load', file, err); loading.delete(name); return null })
  loading.set(name, p)
  return p
}

function preloadSfx() {
  Object.entries(SFX).forEach(([name, file]) => load(name, file))
}

/* ---------- playing one-shots ---------- */
// opts: { rate: 1 | [min, max], volume: 1, minGap: ms }
// returns a handle with .stop(fadeSeconds) or null if nothing played
function play(name, { rate = 1, volume = 1, minGap = 0 } = {}) {
  if (!state.sfxOn || !ctx || ctx.state !== 'running') return null
  const buf = buffers.get(name)
  if (!buf) return null

  const now = performance.now()
  if (minGap && now - (lastPlayed[name] || 0) < minGap) return null
  lastPlayed[name] = now

  const src = ctx.createBufferSource()
  src.buffer = buf
  src.playbackRate.value = Array.isArray(rate) ? rate[0] + Math.random() * (rate[1] - rate[0]) : rate

  const g = ctx.createGain()
  g.gain.value = (GAIN[name] ?? 1) * volume
  src.connect(g)
  g.connect(sfxBus)
  src.start()

  return {
    stop(fade = 0.08) {
      try {
        g.gain.cancelScheduledValues(ctx.currentTime)
        g.gain.setTargetAtTime(0, ctx.currentTime, fade / 3)
        src.stop(ctx.currentTime + fade + 0.05)
      } catch { /* already ended */ }
    },
  }
}

// Short synthesized "tock": a triangle wave with a quick downward pitch bend and fast decay.
// freq = starting pitch in Hz, volume = multiplier, dur = length in seconds
function tick({ freq = 1200, volume = 1, dur = 0.045 } = {}) {
  if (!state.sfxOn || !ctx || ctx.state !== 'running') return
  const t = ctx.currentTime
  const osc = ctx.createOscillator()
  const g = ctx.createGain()
  osc.type = 'triangle'
  osc.frequency.setValueAtTime(freq, t)
  osc.frequency.exponentialRampToValueAtTime(freq * 0.7, t + dur)
  g.gain.setValueAtTime(0.0001, t)
  g.gain.exponentialRampToValueAtTime(TICK_VOLUME * volume, t + 0.003)
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
  osc.connect(g)
  g.connect(sfxBus)
  osc.start(t)
  osc.stop(t + dur + 0.02)
}

/* ---------- loops ---------- */
function reconcileLoops() {
  if (!ctx || ctx.state !== 'running') return
  for (const [name, opts] of wanted) {
    if (!running.has(name)) spawnLoop(name, opts)
  }
  for (const [name, entry] of running) {
    if (!wanted.has(name)) killLoop(name, entry)
  }
}

async function spawnLoop(name, opts) {
  const def = LOOPS[name]
  if (!def) return
  const entry = { cancelled: false, src: null, gain: null, fade: 0.3 }
  running.set(name, entry)
  const buf = await load(name, def.file)
  if (!buf || entry.cancelled || running.get(name) !== entry) {
    if (running.get(name) === entry) running.delete(name)
    return
  }
  const src = ctx.createBufferSource()
  src.buffer = buf
  src.loop = true
  const g = ctx.createGain()
  const fadeIn = opts.fade ?? 0.5
  g.gain.setValueAtTime(0, ctx.currentTime)
  g.gain.linearRampToValueAtTime(LOOP_GAIN[name] ?? 1, ctx.currentTime + fadeIn)
  src.connect(g)
  g.connect(def.bus === 'music' ? musicBus : sfxBus)
  src.start()
  entry.src = src
  entry.gain = g
}

function killLoop(name, entry) {
  running.delete(name)
  entry.cancelled = true
  if (!entry.src) return
  const fade = entry.fade
  try {
    entry.gain.gain.cancelScheduledValues(ctx.currentTime)
    entry.gain.gain.setTargetAtTime(0, ctx.currentTime, fade / 3)
    entry.src.stop(ctx.currentTime + fade + 0.1)
  } catch { /* already stopped */ }
}

function startLoop(name, opts = {}) {
  wanted.set(name, opts)
  reconcileLoops()
}

function stopLoop(name) {
  wanted.delete(name)
  reconcileLoops()
}

/* ---------- unlock + automatic UI sounds ---------- */
function unlock() {
  const c = ensureCtx()
  if (!c) return
  if (c.state !== 'running') c.resume().then(reconcileLoops).catch(() => {})
  // silent blip fully unlocks iOS
  const s = c.createBufferSource()
  s.buffer = c.createBuffer(1, 1, 22050)
  s.connect(c.destination)
  s.start(0)
  preloadSfx()
}

// On/off switches: both directions make a sound (higher = on, lower = off)
const SWITCH_CLASSES = ['unit-card']
// Radio-style pills: only make a sound when the selection actually changes
const RADIO_CLASSES = ['toggle-pill-circle']
const CLOSE_CLASSES = ['end-btn-secondary']
const SKIP_CLASSES = ['current-team']

// Reads the state BEFORE the click is applied (this listener runs first)
function switchIsOn(el) {
  return el.classList.contains('selected')
}

// Any element can override the automatic sound with data-sound="name" or data-sound="none".
// The big launch sound is opt-in (data-sound="launch"); .launch-btn buttons otherwise just tap.
function onUiClick(e) {
  const el = e.target.closest?.('button, .unit-card, .swap-team-row')
  if (!el || el.disabled) return
  const cl = el.classList
  const forced = el.dataset.sound
  if (forced === 'none') return
  if (SKIP_CLASSES.some(c => cl.contains(c))) return
  if (forced) { play(forced); return }

  if (CLOSE_CLASSES.some(c => cl.contains(c))) { play('close'); return }
  if (SWITCH_CLASSES.some(c => cl.contains(c))) {
    play('toggle', { rate: switchIsOn(el) ? SWITCH_OFF_RATE : SWITCH_ON_RATE })
    return
  }
  if (RADIO_CLASSES.some(c => cl.contains(c))) {
    if (cl.contains('active')) return // already selected, nothing changes
    play('toggle', { rate: SELECT_RATE })
    return
  }
  play('tap', { rate: TAP_RATE })
}

// Call once from App. Returns a cleanup function.
export function installSound() {
  const unlockEvents = ['pointerup', 'click', 'keydown', 'touchend']
  const unlockHandler = () => {
    unlock()
    if (ctx && ctx.state === 'running') {
      unlockEvents.forEach(ev => window.removeEventListener(ev, unlockHandler, true))
    }
  }
  unlockEvents.forEach(ev => window.addEventListener(ev, unlockHandler, true))
  document.addEventListener('click', onUiClick, true)

  const onVisibility = () => {
    if (!ctx) return
    if (document.hidden) ctx.suspend().catch(() => {})
    else ctx.resume().catch(() => {})
  }
  document.addEventListener('visibilitychange', onVisibility)

  return () => {
    unlockEvents.forEach(ev => window.removeEventListener(ev, unlockHandler, true))
    document.removeEventListener('click', onUiClick, true)
    document.removeEventListener('visibilitychange', onVisibility)
  }
}

export const sound = { play, tick, startLoop, stopLoop }
export default sound