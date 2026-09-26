// sound.js — H4 (P4.A de ANIMATION_SPEC): capa sonora OPT-IN. Apagada por defecto, se enciende
// desde el menú Pip-Boy y el estado dura la sesión (sessionStorage, como pide el spec). Nunca
// suena nada sin ese clic: el AudioContext recién se crea dentro de un gesto del usuario.
//
// Sin archivos de audio: cada efecto se sintetiza con Web Audio en el momento → 0 bytes que
// descargar (nada toca el LCP ni el presupuesto) y ninguna licencia que gestionar. Volúmenes
// bajos a propósito: acompañan la imagen, no la tapan.
//
// Cues: hum (zumbido CRT de fondo, en loop) · whoosh (zooms y barridos) · static (cambio de
// canal) · power (monitor que enciende) · neon (lámparas de la galería) · buzz (hover de un
// letrero) · decode (texto que se decodifica) · scan (barrido de rayos X) · tick · confirm.

const KEY = 'cp-sound'
const AC = window.AudioContext || window.webkitAudioContext

let on = false
try {
  on = sessionStorage.getItem(KEY) === '1'
} catch {}

let ctx = null
let master = null
let noiseBuf = null
let humOn = false
let offTimer
const subs = new Set()
const last = {}

function boot() {
  if (ctx || !AC) return ctx
  ctx = new AC()
  master = ctx.createGain()
  master.gain.value = 0
  // compresor suave: si coinciden glitch + whoosh + encendido, no saturan
  const comp = ctx.createDynamicsCompressor()
  master.connect(comp).connect(ctx.destination)
  noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate)
  const d = noiseBuf.getChannelData(0)
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1
  return ctx
}

// ── piezas ──
const gainNode = (v = 0) => {
  const g = ctx.createGain()
  g.gain.value = v
  return g
}
const filter = (type, freq, q = 0.7) => {
  const f = ctx.createBiquadFilter()
  f.type = type
  f.frequency.value = freq
  f.Q.value = q
  return f
}
const osc = (type, freq) => {
  const o = ctx.createOscillator()
  o.type = type
  o.frequency.value = freq
  return o
}
const noise = (t, dur) => {
  const s = ctx.createBufferSource()
  s.buffer = noiseBuf
  s.loop = true
  s.start(t, Math.random() * 1.5)
  s.stop(t + dur)
  return s
}
// ataque y caída exponenciales (sin clics)
const env = (param, t, peak, attack, release) => {
  param.setValueAtTime(0.0001, t)
  param.exponentialRampToValueAtTime(peak, t + attack)
  param.exponentialRampToValueAtTime(0.0001, t + attack + release)
}
// ráfaga corta de ruido agudo: la "chispa" de un tubo de neón o de un relé
const crackle = (t, peak = 0.12) => {
  const g = gainNode()
  noise(t, 0.03).connect(filter('highpass', 3200)).connect(g).connect(master)
  env(g.gain, t, peak, 0.002, 0.018)
}

function startHum() {
  if (humOn) return
  humOn = true
  const bed = gainNode(0.045)
  bed.connect(master)
  const o1 = osc('sine', 50)
  const o2 = osc('triangle', 100)
  const g2 = gainNode(0.22)
  o1.connect(bed)
  o2.connect(g2).connect(bed)
  const hiss = gainNode(0.25)
  const n = ctx.createBufferSource()
  n.buffer = noiseBuf
  n.loop = true
  n.connect(filter('lowpass', 260)).connect(hiss).connect(bed)
  // respiración lenta del zumbido (0.2 Hz): que no se sienta un tono fijo
  const lfo = osc('sine', 0.2)
  const depth = gainNode(0.012)
  lfo.connect(depth).connect(bed.gain)
  ;[o1, o2, n, lfo].forEach((s) => s.start())
}

const CUES = {
  whoosh({ dir = 'in', dur = 0.6 } = {}) {
    const t = ctx.currentTime
    const f = filter('bandpass', 300, 0.9)
    const [a, b] = dir === 'out' ? [2600, 240] : [240, 2600]
    f.frequency.setValueAtTime(a, t)
    f.frequency.exponentialRampToValueAtTime(b, t + dur)
    const g = gainNode()
    noise(t, dur + 0.05).connect(f).connect(g).connect(master)
    g.gain.setValueAtTime(0.0001, t)
    g.gain.exponentialRampToValueAtTime(0.28, t + dur * 0.55)
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
  },
  static() {
    const t = ctx.currentTime
    const g = gainNode()
    noise(t, 0.36).connect(filter('bandpass', 2400, 0.5)).connect(g).connect(master)
    // escalones duros, como el corte de canal de la imagen (0.34 s)
    const steps = [0.16, 0.05, 0.13, 0.02, 0.1, 0.0001]
    steps.forEach((v, i) => g.gain.setValueAtTime(v, t + i * 0.06))
  },
  power() {
    const t = ctx.currentTime
    // golpe grave del tubo + un silbido corto que sube
    const thump = osc('sine', 90)
    thump.frequency.exponentialRampToValueAtTime(38, t + 0.14)
    const g = gainNode()
    thump.connect(g).connect(master)
    env(g.gain, t, 0.22, 0.005, 0.16)
    const whine = osc('sine', 900)
    whine.frequency.exponentialRampToValueAtTime(3400, t + 0.22)
    const gw = gainNode()
    whine.connect(gw).connect(master)
    env(gw.gain, t, 0.018, 0.04, 0.2)
    ;[thump, whine].forEach((o) => {
      o.start(t)
      o.stop(t + 0.3)
    })
    crackle(t, 0.06)
  },
  neon() {
    const t = ctx.currentTime
    // zumbido de balasto con el mismo titileo suave de las lámparas (category.js lightOn)
    const o = osc('sawtooth', 100)
    const g = gainNode(0)
    o.connect(filter('lowpass', 1100)).connect(g).connect(master)
    const pattern = [
      [0, 0.0001],
      [0.02, 0.07],
      [0.2, 0.03],
      [0.3, 0.075],
      [0.5, 0.04],
    ]
    pattern.forEach(([dt, v]) => g.gain.setValueAtTime(v, t + dt))
    g.gain.exponentialRampToValueAtTime(0.0001, t + 1.1)
    o.start(t)
    o.stop(t + 1.15)
    crackle(t + 0.01, 0.14)
    crackle(t + 0.3, 0.1)
  },
  buzz() {
    const t = ctx.currentTime
    const o = osc('sawtooth', 120)
    const g = gainNode()
    o.connect(filter('lowpass', 900)).connect(g).connect(master)
    env(g.gain, t, 0.035, 0.02, 0.28)
    o.start(t)
    o.stop(t + 0.32)
    crackle(t, 0.05)
  },
  decode({ dur = 0.3 } = {}) {
    const t = ctx.currentTime
    // ráfaga de "bips" de terminal, uno por cada ~35 ms del decode
    const n = Math.max(4, Math.min(14, Math.round(dur / 0.035)))
    const lp = filter('lowpass', 3200)
    lp.connect(master)
    for (let i = 0; i < n; i++) {
      const at = t + i * 0.035
      const o = osc('square', 520 + Math.floor(Math.random() * 8) * 160)
      const g = gainNode()
      o.connect(g).connect(lp)
      env(g.gain, at, 0.022, 0.003, 0.02)
      o.start(at)
      o.stop(at + 0.03)
    }
  },
  scan({ dur = 0.8 } = {}) {
    const t = ctx.currentTime
    const o = osc('triangle', 160)
    o.frequency.exponentialRampToValueAtTime(640, t + dur)
    const g = gainNode()
    o.connect(filter('lowpass', 1400)).connect(g).connect(master)
    g.gain.setValueAtTime(0.0001, t)
    g.gain.exponentialRampToValueAtTime(0.05, t + 0.08)
    g.gain.setValueAtTime(0.05, t + dur - 0.1)
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
    o.start(t)
    o.stop(t + dur + 0.02)
  },
  tick() {
    const t = ctx.currentTime
    const o = osc('square', 1250)
    const g = gainNode()
    o.connect(filter('lowpass', 2800)).connect(g).connect(master)
    env(g.gain, t, 0.03, 0.002, 0.03)
    o.start(t)
    o.stop(t + 0.04)
  },
  confirm() {
    const t = ctx.currentTime
    ;[880, 1320].forEach((f, i) => {
      const at = t + i * 0.07
      const o = osc('square', f)
      const g = gainNode()
      o.connect(filter('lowpass', 2600)).connect(g).connect(master)
      env(g.gain, at, 0.03, 0.003, 0.06)
      o.start(at)
      o.stop(at + 0.08)
    })
  },
}
// separación mínima entre dos disparos del mismo cue (varios decodes a la vez = una sola ráfaga)
const GAP = { decode: 0.25, buzz: 0.15, power: 0.05, static: 0.2 }

function apply(v) {
  clearTimeout(offTimer)
  if (v) {
    if (!boot()) return
    ctx.resume?.()
    startHum()
    const t = ctx.currentTime
    master.gain.cancelScheduledValues(t)
    master.gain.setValueAtTime(master.gain.value, t)
    master.gain.linearRampToValueAtTime(1, t + 1.5) // fade in 1.5 s (spec)
  } else if (ctx) {
    const t = ctx.currentTime
    master.gain.cancelScheduledValues(t)
    master.gain.setValueAtTime(master.gain.value, t)
    master.gain.linearRampToValueAtTime(0, t + 0.4) // fade out 0.4 s (spec)
    offTimer = setTimeout(() => ctx.suspend?.(), 450) // sin CPU mientras está apagado
  }
}

export const sound = {
  get on() {
    return on
  },
  available: !!AC,
  // llamar SOLO desde un gesto del usuario (clic/tecla): ahí el navegador deja arrancar el audio
  set(v) {
    on = !!v
    try {
      sessionStorage.setItem(KEY, on ? '1' : '0')
    } catch {}
    apply(on)
    subs.forEach((fn) => fn(on))
  },
  toggle() {
    this.set(!on)
  },
  onChange(fn) {
    subs.add(fn)
    return () => subs.delete(fn)
  },
}

export function sfx(name, opts) {
  if (!on || !ctx || ctx.state !== 'running' || document.hidden) return
  const t = ctx.currentTime
  if (t - (last[name] ?? -1) < (GAP[name] ?? 0.06)) return
  last[name] = t
  CUES[name]?.(opts)
}

// Encendido en la sesión (recarga, cambio de idioma): el navegador exige un gesto para arrancar el
// audio, así que se reanuda con el primer clic/tecla — nunca solo.
if (on && AC) {
  const unlock = () => {
    removeEventListener('pointerdown', unlock, true)
    removeEventListener('keydown', unlock, true)
    if (on) apply(true)
  }
  addEventListener('pointerdown', unlock, true)
  addEventListener('keydown', unlock, true)
}
// pestaña oculta → silencio y sin CPU
document.addEventListener('visibilitychange', () => {
  if (!ctx) return
  if (document.hidden) ctx.suspend?.()
  else if (on) ctx.resume?.()
})

// Cues de interfaz, delegados (así cada módulo no tiene que saber del sonido):
// letreros de Inicio al pasar el mouse, y clics en controles de la interfaz.
const TICK = '.pipboy__toggle, .pipboy__item, .pipboy__lang a, .cat__arrow, .cat__index button, .cat__canvas, .cat__mute, .projects-menu__cat, .bio__tab, .viewer'
let hovered = null
addEventListener(
  'pointerover',
  (e) => {
    if (e.pointerType !== 'mouse') return
    const sign = e.target.closest?.('.hero .sign')
    if (sign && sign !== hovered) sfx('buzz')
    hovered = sign
  },
  { passive: true },
)
addEventListener('click', (e) => e.target.closest?.(TICK) && sfx('tick'), { capture: true, passive: true })
