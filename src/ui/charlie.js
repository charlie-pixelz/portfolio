// P2.B — Glitch del lockup. Al hover, "Charlie" encadena fuentes:
//   Glitch Goblin (base) → Rubik Glitch ("roto") → Rubik Pixels ("pixelado"),
// por carácter, con aberración cromática + flicker, escalonado. Al salir, vuelve por el mismo camino.
// Además, un flicker ambiental: cada cierto tiempo una letra al azar parpadea a Rubik Glitch y vuelve
// (como el parpadeo de los letreros encendidos). reduced-motion / touch → sin efecto.

import { gsap } from 'gsap'
import { quality } from '../core/quality.js'

export function initCharlie() {
  if (quality.reducedMotion || quality.isTouch) return
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

  lockup.addEventListener('pointerenter', () => run(true))
  lockup.addEventListener('pointerleave', () => run(false))

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
