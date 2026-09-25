// H3 — cursor retícula (capa OS, P2.A de ANIMATION_SPEC). Una mira fósforo que sigue al cursor del
// sistema con inercia y se estira con la velocidad. NO lo reemplaza (pointer-events:none, el cursor
// real sigue visible) y no existe en touch ni con movimiento reducido.
// Estados por `data-cursor` en el elemento bajo el puntero: 'entrar' / 'ver' muestran una etiqueta;
// cualquier otro link o botón agranda la mira sin texto.

import { ticker } from '../core/ticker.js'
import { damp } from '../core/math.js'
import { pointer } from '../core/pointer.js'
import { quality } from '../core/quality.js'

const LABELS = {
  es: { entrar: 'ENTRAR', ver: 'VER' },
  en: { entrar: 'ENTER', ver: 'VIEW' },
}

// quién declara qué estado: se asigna acá para no ensuciar el HTML de las dos rutas de idioma
const STATES = [
  ['.sign', 'entrar'],
  ['.screen[data-cat]', 'ver'],
]

export function initCursor({ lang }) {
  if (quality.isTouch || quality.reducedMotion || !matchMedia('(pointer: fine)').matches) return
  STATES.forEach(([sel, state]) => document.querySelectorAll(sel).forEach((el) => (el.dataset.cursor = state)))
  const labels = LABELS[lang] || LABELS.es

  const el = document.createElement('div')
  el.className = 'reticle'
  el.setAttribute('aria-hidden', 'true')
  el.innerHTML =
    '<svg class="reticle__ring" viewBox="0 0 32 32"><path d="M1 9V1h8M23 1h8v8M31 23v8h-8M9 31H1v-8"/><rect x="14.5" y="14.5" width="3" height="3"/></svg>' +
    '<span class="reticle__label"></span>'
  document.body.appendChild(el)
  const ring = el.firstChild
  const label = el.lastChild

  let state = ''
  const setState = (next) => {
    if (next === state) return
    state = next
    el.dataset.state = next
    label.textContent = labels[next] || ''
  }
  const stateOf = (node) => {
    const hit = node?.closest?.('[data-cursor], a, button, [role="button"]')
    if (!hit) return ''
    return hit.dataset.cursor || 'link'
  }

  const pos = { x: 0, y: 0 }
  const stretch = { x: 1, y: 1 }
  let seen = false
  addEventListener(
    'mousemove',
    (e) => {
      if (!seen) {
        seen = true
        pos.x = e.clientX
        pos.y = e.clientY
        el.classList.add('is-on')
      }
      setState(stateOf(e.target))
    },
    { passive: true },
  )
  // un click suele cambiar de vista sin que el mouse se mueva: la etiqueta vieja ("ENTRAR" sobre
  // un letrero que ya no está) quedaría pegada hasta el próximo movimiento
  addEventListener('click', () => setState(''), true)
  addEventListener('mousedown', () => el.classList.add('is-down'))
  addEventListener('mouseup', () => el.classList.remove('is-down'))
  document.documentElement.addEventListener('mouseleave', () => el.classList.remove('is-on'))
  document.documentElement.addEventListener('mouseenter', () => seen && el.classList.add('is-on'))

  ticker.add((t, dt) => {
    if (!seen) return
    // el objetivo sale del PointerManager (sin lerp propio: target es la posición cruda)
    const tx = ((pointer.target.x + 1) / 2) * innerWidth
    const ty = ((1 - pointer.target.y) / 2) * innerHeight
    const px = pos.x
    const py = pos.y
    pos.x = damp(pos.x, tx, 0.22, dt)
    pos.y = damp(pos.y, ty, 0.22, dt)
    // estirado con la velocidad (clamp 1–1.5), vuelve a cuadrado en reposo
    stretch.x = damp(stretch.x, 1 + Math.min(Math.abs(pos.x - px) / 40, 0.5), 0.2, dt)
    stretch.y = damp(stretch.y, 1 + Math.min(Math.abs(pos.y - py) / 40, 0.5), 0.2, dt)
    el.style.transform = `translate3d(${pos.x.toFixed(1)}px, ${pos.y.toFixed(1)}px, 0)`
    ring.style.transform = `translate(-50%, -50%) scale(${stretch.x.toFixed(3)}, ${stretch.y.toFixed(3)})`
  })
}
