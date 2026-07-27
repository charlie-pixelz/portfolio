// Charlie Pixelz — entrada compartida.
// Fase 1: arquitectura base. P1.B: hero con depth-map en las home /es/ /en/.

import './styles/tokens.css'
import './styles/base.css'
import heroBgUrl from '../assets/upscale/hero_bg_2400w.webp'
import heroCharUrl from '../assets/upscale/hero_character_2400w.webp'
import heroCleanUrl from '../assets/upscale/hero_desktop_clean_2400w.webp'
// captura del Home con "Proyectos"/"Projects" activo (pantalla central, Punto 4) — una por idioma
import homeShotEsUrl from '../assets/upscale/home_proyectos_1280w.jpg'
import homeShotEnUrl from '../assets/upscale/home_projects_en_1280w.jpg'
import roomBgUrl from '../assets/upscale/proyectos_desktop_2400w.webp'
import alleyUrl from '../assets/upscale/pantalla_callejon_1536w.webp'
import catBgUrl from '../assets/upscale/categoria_desktop_2534w.webp'
import lucesUrl from '../assets/efecto-galeria/Categoria_Desktop_Luces.png'
import bioUrl from '../assets/upscale/bio_desktop_2400w.webp' // esqueleto rayos-X (Biografía)
import { ticker } from './core/ticker.js'
import { quality } from './core/quality.js'
import { pointer } from './core/pointer.js'
import { stage } from './gl/stage.js'
import { initHero } from './gl/hero.js'
import { initPreloader } from './gl/preloader.js'
import { initSigns } from './ui/signs.js'
import { initScreens } from './ui/screens.js'
import { initCategory } from './ui/category.js'
import { initBio } from './ui/bio.js'
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
  // texturas de la sala de Proyectos (fondo de monitores + callejón de las pantallas + Inicio en la central)
  document.documentElement.style.setProperty('--room-bg', `url(${roomBgUrl})`)
  document.documentElement.style.setProperty('--alley', `url(${alleyUrl})`)
  document.documentElement.style.setProperty('--home-shot', `url(${lang === 'en' ? homeShotEnUrl : homeShotEsUrl})`)
  document.documentElement.style.setProperty('--cat-bg', `url(${catBgUrl})`)
  document.documentElement.style.setProperty('--luces', `url(${lucesUrl})`)
  document.documentElement.style.setProperty('--bio', `url(${bioUrl})`)
  initHero(heroBgUrl, heroCharUrl) // hero multi-capa en las home /es/ /en/
  initSigns() // iguala el ancho de las sílabas de los letreros
  initCharlie() // glitch/swap por carácter del lockup al hover (P2.B)
  // Punto 4: la pantalla central proyecta una CAPTURA estática del Home con "Proyectos" activo
  // (var --home-shot). Antes se clonaba el DOM del hero, pero las proporciones no calzaban
  // (clamps en rem cap distinto según el ancho del contenedor); la captura calza siempre.
  const params = new URLSearchParams(location.search) // capturar antes de que el router limpie la URL
  const calMode = params.has('cal')
  const calCatMode = params.has('calcat')
  initScreens() // proyecta el contenido de cada pantalla sobre el plano en perspectiva del monitor
  const category = initCategory({ lang }) // P3.B: página de categoría (billboard + galería)
  const bio = initBio({ lang }) // P3.C: Biografía (modo rayos X)
  initRouter({ lang, base: '/portfolio/', category, bio }) // Inicio ↔ Proyectos ↔ Categoría ↔ Biografía
  // precalienta en idle los assets compartidos de la galería (billboard + luces) y la media de
  // los proyectos → la 1.ª apertura de categoría no arranca en negro (el preloader solo cubre el hero)
  const warmGallery = () => {
    ;[catBgUrl, lucesUrl, bioUrl].forEach((u) => {
      const im = new Image()
      im.src = u
    })
    category?.warm?.()
  }
  if ('requestIdleCallback' in window) requestIdleCallback(warmGallery, { timeout: 2500 })
  else setTimeout(warmGallery, 1800)
  // modos de calibración (dev): /es/?cal → pantallas de la sala · /es/?calcat → lienzo de la galería
  if (calMode) {
    import('./ui/calibrate.js').then((m) => m.initCalibrate())
  } else if (calCatMode) {
    import('./ui/calibrate-cat.js').then((m) => m.initCalibrateCat(category))
  } else if (params.has('shot')) {
    // dev: hero limpio para CAPTURAR la pantalla central (Proyectos activo, sin UI de sistema)
    const nav = document.querySelector('.hero .neon-nav')
    nav?.querySelectorAll('.sign').forEach((s) => s.removeAttribute('aria-current'))
    nav?.querySelector('[data-route="projects"]')?.setAttribute('aria-current', 'page')
    document.querySelector('.lang--corner')?.style.setProperty('display', 'none')
    document.querySelector('.crt')?.style.setProperty('display', 'none')
  }
} else {
  initPreloader({ sceneUrl: heroCleanUrl, preloadUrls: [heroBgUrl, heroCharUrl] }) // raíz = preloader
}
initLenis()
initDebug()
ticker.add(() => stage.render()) // render AL FINAL del frame, tras las actualizaciones
ticker.start()
