// P2.B — Glitch del lockup: al hover, "Charlie" (Glitch Goblin) hace un swap por carácter
// a Protest Revolution con aberración cromática + jitter, escalonado (ART_DIR §3 / SPEC P2.B).
// reduced-motion o touch → sin efecto (el lockup queda estático y legible).

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

  let swapped = false
  const run = (swap) => {
    if (swap === swapped) return
    swapped = swap
    gsap.killTweensOf(chars)
    chars.forEach((ch, i) => {
      gsap
        .timeline({ delay: i * 0.03 })
        .to(ch, {
          '--gx': '0.06em',
          y: () => Math.random() * 6 - 3,
          duration: 0.07,
          ease: 'power2.in',
        })
        .add(() => ch.classList.toggle('is-swap', swap)) // swap de fuente en el pico del glitch
        .to(ch, { '--gx': '0em', y: 0, duration: 0.13, ease: 'power2.out' })
    })
  }

  lockup.addEventListener('pointerenter', () => run(true))
  lockup.addEventListener('pointerleave', () => run(false))
}
