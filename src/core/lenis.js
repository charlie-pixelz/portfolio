// Lenis — scroll suave, driveado por el ticker ÚNICO (no crea su propio rAF).
// Con prefers-reduced-motion se desactiva y queda el scroll nativo (no-negociable a11y).

import Lenis from 'lenis'
import { ticker } from './ticker.js'
import { quality } from './quality.js'

export function initLenis() {
  if (quality.reducedMotion) return null
  const lenis = new Lenis({ lerp: 0.1, smoothWheel: true })
  ticker.add((t) => lenis.raf(t)) // Lenis espera el timestamp del rAF en ms
  return lenis
}
