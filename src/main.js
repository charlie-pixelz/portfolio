// Charlie Pixelz — entrada compartida.
// Fase 1: arquitectura base invisible (canvas persistente, RAF único, PointerManager,
// QualityManager, Lenis). Los efectos visibles (preloader matriz, hero depth-map…) llegan en P1+.

import './styles/tokens.css'
import './styles/base.css'
import { ticker } from './core/ticker.js'
import { quality } from './core/quality.js'
import { pointer } from './core/pointer.js'
import { stage } from './gl/stage.js'
import { initLenis } from './core/lenis.js'
import { initDebug } from './core/debug.js'

// Recuerda el idioma de esta página para que la próxima visita salte el selector.
const path = location.pathname
const lang = path.includes('/en/') ? 'en' : path.includes('/es/') ? 'es' : null
if (lang) {
  try {
    localStorage.setItem('cp-lang', lang)
  } catch {}
}

// Arranque de la arquitectura (ANIMATION_SPEC §0).
document.documentElement.dataset.tier = quality.tier
stage.init() // canvas WebGL persistente + escena vacía
pointer.init() // mouse + touch → mismos valores normalizados
initLenis() // scroll suave (salvo reduced-motion)
initDebug() // HUD solo con ?debug
ticker.start() // único RAF: arranca todo
