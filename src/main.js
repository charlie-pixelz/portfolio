// Charlie Pixelz — entrada compartida.
// Fase 1: arquitectura base. P1.B: hero con depth-map en las home /es/ /en/.

import './styles/tokens.css'
import './styles/base.css'
import heroBgUrl from '../assets/upscale/hero_bg_2400w.webp'
import heroCharUrl from '../assets/upscale/hero_character_2400w.webp'
import heroCleanUrl from '../assets/upscale/hero_desktop_clean_2400w.webp'
import roomBgUrl from '../assets/upscale/proyectos_desktop_2400w.webp'
import alleyUrl from '../assets/upscale/pantalla_callejon_1536w.webp'
import { ticker } from './core/ticker.js'
import { quality } from './core/quality.js'
import { pointer } from './core/pointer.js'
import { stage } from './gl/stage.js'
import { initHero } from './gl/hero.js'
import { initPreloader } from './gl/preloader.js'
import { initSigns } from './ui/signs.js'
import { initCharlie } from './ui/charlie.js'
import { initRouter } from './core/router.js'
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
if (lang) {
  // texturas de la sala de Proyectos (fondo de monitores + callejón de las pantallas)
  document.documentElement.style.setProperty('--room-bg', `url(${roomBgUrl})`)
  document.documentElement.style.setProperty('--alley', `url(${alleyUrl})`)
  initHero(heroBgUrl, heroCharUrl) // hero multi-capa en las home /es/ /en/
  initSigns() // iguala el ancho de las sílabas de los letreros
  initCharlie() // glitch/swap por carácter del lockup al hover (P2.B)
  initRouter({ lang, base: '/portfolio/' }) // Inicio ↔ Proyectos (client-side)
  // MVP: click de categoría aún sin página de destino (zoom-in es el siguiente paso)
  document
    .querySelectorAll('.screen[data-cat]')
    .forEach((s) => s.addEventListener('click', (e) => e.preventDefault()))
} else {
  initPreloader({ sceneUrl: heroCleanUrl, preloadUrls: [heroBgUrl, heroCharUrl] }) // raíz = preloader
}
initLenis()
initDebug()
ticker.add(() => stage.render()) // render AL FINAL del frame, tras las actualizaciones
ticker.start()
