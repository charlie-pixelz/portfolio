// HUD de depuración — SOLO con ?debug en la URL. No se muestra en producción normal.
// Sirve para verificar la arquitectura: tier, DPR, puntero interpolado, velocidad y FPS.

import { ticker } from './ticker.js'
import { quality } from './quality.js'
import { pointer } from './pointer.js'

export function initDebug() {
  if (!new URLSearchParams(location.search).has('debug')) return

  const el = document.createElement('div')
  el.className = 'debug-hud'
  el.setAttribute('aria-hidden', 'true')
  document.body.appendChild(el)

  let frames = 0
  let acc = 0
  let fps = 0

  ticker.add((t, dt) => {
    frames++
    acc += dt
    if (acc >= 0.5) {
      fps = Math.round(frames / acc)
      frames = 0
      acc = 0
    }
    const v = Math.hypot(pointer.vel.x, pointer.vel.y)
    el.textContent =
      `tier ${quality.tier} · dpr ${quality.dpr} · touch ${quality.isTouch} · rm ${quality.reducedMotion} · ` +
      `ptr ${pointer.pos.x.toFixed(2)},${pointer.pos.y.toFixed(2)} · vel ${v.toFixed(3)} · ${fps} fps`
  })
}
