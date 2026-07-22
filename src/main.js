// Charlie Pixelz — entrada compartida.
// Fase 1: arquitectura base. P1.B: hero con depth-map en las home /es/ /en/.

import './styles/tokens.css'
import './styles/base.css'
import heroUrl from '../assets/upscale/hero_desktop_clean_2400w.webp'
import depthUrl from '../assets/upscale/hero_depth_1600w.webp'
import { ticker } from './core/ticker.js'
import { quality } from './core/quality.js'
import { pointer } from './core/pointer.js'
import { stage } from './gl/stage.js'
import { initHero } from './gl/hero.js'
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

// Arquitectura (ANIMATION_SPEC §0)
document.documentElement.dataset.tier = quality.tier
stage.init()
pointer.init()
if (lang) initHero(heroUrl, depthUrl) // hero solo en las home; la raíz es el preloader (P1.A)
initLenis()
initDebug()
ticker.add(() => stage.render()) // render AL FINAL del frame, tras las actualizaciones
ticker.start()
