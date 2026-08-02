// P2.B — Glitch del lockup. Al hover, "Charlie" encadena fuentes:
//   Glitch Goblin (base) → Rubik Glitch ("roto") → Rubik Pixels ("pixelado"),
// por carácter, con aberración cromática + flicker, escalonado. Al salir, vuelve por el mismo camino.
// Además, un flicker ambiental: cada cierto tiempo una letra al azar parpadea a Rubik Glitch y vuelve
// (como el parpadeo de los letreros encendidos). reduced-motion / touch → sin efecto.

import { gsap } from 'gsap'
import { quality } from '../core/quality.js'

export function initCharlie() {
  // (31/7) Antes salía de una en cualquier device táctil → en mobile el lockup quedaba MUERTO: sin
  // flicker ambiental y sin swap. Lo que no existe en touch es el HOVER, no el efecto. Ahora:
  //   · flicker ambiental → siempre (es el latido del letrero, no depende del puntero)
  //   · swap completo → hover en puntero fino, TAP en touch (se queda pixelado; otro tap vuelve)
  if (quality.reducedMotion) return
  const lockup = document.querySelector('.hero .brand')
  const word = document.querySelector('.hero .brand__charlie')
  if (!lockup || !word) return

  // parte "Charlie" en <span class="ch"> conservando el texto para lectores
  const text = word.textContent
  word.textContent = ''
  const chars = [...text].map((c) => {
    const s = document.createElement('span')
    s.className = 'ch'
    s.textContent = c
    word.appendChild(s)
    return s
  })

  const setFont = (ch, state) => {
    ch.classList.toggle('is-glitch', state === 'glitch')
    ch.classList.toggle('is-pixels', state === 'pixels')
  }

  let swapped = false
  const run = (swap) => {
    if (swap === swapped) return
    swapped = swap
    gsap.killTweensOf(chars)
    chars.forEach((ch, i) => {
      gsap
        .timeline({ delay: i * 0.045 })
        .to(ch, { '--gx': '0.07em', y: () => Math.random() * 6 - 3, duration: 0.1, ease: 'power2.in' })
        .add(() => setFont(ch, 'glitch')) // paso intermedio "roto"
        .to(ch, { opacity: 0.4, duration: 0.06, repeat: 4, yoyo: true }) // ~0.3s en "roto" (más lento)
        .add(() => setFont(ch, swap ? 'pixels' : 'base')) // asienta en "pixelado" o vuelve a Goblin
        .to(ch, { '--gx': '0em', y: 0, duration: 0.14, ease: 'power2.out' })
        .set(ch, { opacity: 1 })
    })
  }

  if (quality.isTouch) {
    // (1/8) Charlie pidió que en touch se comporte como el hover de desktop: basta DESLIZAR el
    // dedo por encima, sin tap. `pointerenter/leave` no sirven — en touch solo disparan con el
    // dedo apoyado y además exigirían pointer-events sobre el lockup (robándole el tap al hero).
    // En su lugar se escucha el movimiento global y se hace el hit-test a mano contra el rect del
    // lockup: entrar → swap, salir → volver. Mismo modelo mental que el hover, cero taps.
    let inside = false
    addEventListener(
      'pointermove',
      (e) => {
        const r = lockup.getBoundingClientRect()
        const now = e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom
        if (now === inside) return
        inside = now
        run(now)
      },
      { passive: true },
    )
  } else {
    lockup.addEventListener('pointerenter', () => run(true))
    lockup.addEventListener('pointerleave', () => run(false))
  }

  // flicker ambiental: una letra al azar parpadea a Rubik Glitch y vuelve (irregular, solo en reposo)
  const ambient = () => {
    if (!swapped) {
      const ch = chars[Math.floor(Math.random() * chars.length)]
      gsap
        .timeline()
        .add(() => setFont(ch, 'glitch'))
        .to(ch, { '--gx': '0.05em', duration: 0.05, repeat: 3, yoyo: true })
        .add(() => setFont(ch, 'base'))
        .set(ch, { '--gx': '0em' })
    }
    gsap.delayedCall(2.5 + Math.random() * 2.5, ambient) // cada 2.5–5 s (irregular)
  }
  gsap.delayedCall(2.5 + Math.random() * 2.5, ambient)
}
