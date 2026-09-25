// PointerManager global (ANIMATION_SPEC §0.5) — normaliza mouse, touch Y giroscopio al MISMO
// sistema: {x,y} en -1..1 (Y hacia arriba = +1) + velocidad. Nunca sigue el puntero en crudo:
// interpola con lerp. Todos los efectos leen de aquí.

import { ticker } from './ticker.js'
import { damp } from './math.js'
import { quality } from './quality.js'

const LERP = 0.12
// grados de inclinación que equivalen a llevar el mouse al borde de la pantalla: 10°, elegido por
// Charlie en su Android (25/9). ?tilt=N para probar en vivo (menos grados = más sensible).
const TILT = Math.min(45, Math.max(4, Number(new URLSearchParams(location.search).get('tilt')) || 10))
const TOUCH_PRIORITY_MS = 800 // tras tocar la pantalla, el dedo manda sobre el giroscopio

const target = { x: 0, y: 0 } // objetivo normalizado
const pos = { x: 0, y: 0 } // posición interpolada (la que consumen los efectos)
const vel = { x: 0, y: 0 } // velocidad (delta interpolado por frame)

let lastTouch = 0

function setFromClient(cx, cy) {
  target.x = (cx / window.innerWidth) * 2 - 1
  target.y = -((cy / window.innerHeight) * 2 - 1)
}

const onMouse = (e) => setFromClient(e.clientX, e.clientY)
const onTouch = (e) => {
  const t = e.touches[0]
  if (!t) return
  lastTouch = performance.now()
  setFromClient(t.clientX, t.clientY)
}

// H2 — inclinar el teléfono mueve la escena. La postura "neutra" es la del primer evento y se
// re-centra despacio, así funciona igual con el teléfono vertical, reclinado o acostado.
const base = { b: null, g: null }
const clamp1 = (v) => Math.max(-1, Math.min(1, v))
const onTilt = (e) => {
  if (e.beta == null || e.gamma == null) return
  const angle = screen.orientation?.angle ?? window.orientation ?? 0
  // en horizontal los ejes del sensor rotan respecto de la pantalla
  let h = e.gamma
  let v = e.beta
  if (angle === 90) [h, v] = [e.beta, -e.gamma]
  else if (angle === -90 || angle === 270) [h, v] = [-e.beta, e.gamma]
  if (base.b === null) {
    base.b = v
    base.g = h
  }
  base.b += (v - base.b) * 0.004
  base.g += (h - base.g) * 0.004
  if (performance.now() - lastTouch < TOUCH_PRIORITY_MS) return
  target.x = clamp1((h - base.g) / TILT)
  target.y = clamp1(-(v - base.b) / TILT)
}

// iOS exige pedir permiso dentro de un gesto del usuario (se llama desde el click del selector de
// idioma del preloader). En Android y desktop no existe requestPermission: resuelve al instante.
export function requestGyro() {
  const req = window.DeviceOrientationEvent?.requestPermission
  if (!quality.isTouch || quality.reducedMotion || typeof req !== 'function') return Promise.resolve()
  return req.call(window.DeviceOrientationEvent).catch(() => {})
}

let active = false

export const pointer = {
  pos,
  vel,
  target,
  init() {
    if (active) return
    active = true
    // Mouse y touch alimentan EXACTAMENTE los mismos valores (DoD Fase 1).
    window.addEventListener('mousemove', onMouse, { passive: true })
    window.addEventListener('touchmove', onTouch, { passive: true })
    window.addEventListener('touchstart', () => (lastTouch = performance.now()), { passive: true })
    // sin permiso (iOS que llegó directo a /es/ sin pasar por el preloader) simplemente no llegan
    // eventos: queda el parallax por touch de siempre
    if (quality.isTouch && !quality.reducedMotion) {
      window.addEventListener('deviceorientation', onTilt, { passive: true })
    }
    ticker.add((t, dt) => {
      const px = pos.x
      const py = pos.y
      pos.x = damp(pos.x, target.x, LERP, dt)
      pos.y = damp(pos.y, target.y, LERP, dt)
      vel.x = pos.x - px
      vel.y = pos.y - py
    })
  },
}
