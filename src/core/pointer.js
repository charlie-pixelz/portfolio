// PointerManager global (ANIMATION_SPEC §0.5) — normaliza mouse Y touch al MISMO
// sistema: {x,y} en -1..1 (Y hacia arriba = +1) + velocidad. Nunca sigue el puntero
// en crudo: interpola con lerp. Todos los efectos leen de aquí.

import { ticker } from './ticker.js'
import { damp } from './math.js'

const LERP = 0.12

const target = { x: 0, y: 0 } // objetivo normalizado
const pos = { x: 0, y: 0 } // posición interpolada (la que consumen los efectos)
const vel = { x: 0, y: 0 } // velocidad (delta interpolado por frame)

function setFromClient(cx, cy) {
  target.x = (cx / window.innerWidth) * 2 - 1
  target.y = -((cy / window.innerHeight) * 2 - 1)
}

const onMouse = (e) => setFromClient(e.clientX, e.clientY)
const onTouch = (e) => {
  const t = e.touches[0]
  if (t) setFromClient(t.clientX, t.clientY)
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
