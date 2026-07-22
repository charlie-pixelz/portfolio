// Ticker — el ÚNICO requestAnimationFrame del sitio (ANIMATION_SPEC §0.2).
// Todo lo que anima se suscribe aquí; ningún módulo crea su propio loop.
// Los callbacks reciben (t, dt): t = timestamp del rAF en ms, dt = delta en segundos.

const callbacks = new Set()
let rafId = 0
let last = 0

function frame(t) {
  rafId = requestAnimationFrame(frame)
  const dt = last ? (t - last) / 1000 : 0
  last = t
  for (const cb of callbacks) cb(t, dt)
}

export const ticker = {
  add(cb) {
    callbacks.add(cb)
    return () => callbacks.delete(cb)
  },
  remove(cb) {
    callbacks.delete(cb)
  },
  start() {
    if (!rafId) {
      last = 0
      rafId = requestAnimationFrame(frame)
    }
  },
  stop() {
    cancelAnimationFrame(rafId)
    rafId = 0
  },
}
