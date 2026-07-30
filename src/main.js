// Charlie Pixelz — entrada compartida.
// Fase 1: arquitectura base. P1.B: hero con depth-map en las home /es/ /en/.

import './styles/tokens.css'
import './styles/base.css'
import heroBgUrl from '../assets/upscale/hero_bg_2400w.webp'
import heroCharUrl from '../assets/upscale/hero_character_2400w.webp'
import heroCleanUrl from '../assets/upscale/hero_desktop_clean_2400w.webp'
// Mobile: composición vertical 9:16 distinta (primer plano del personaje) — no una capa bg+char
// separada, así que en mobile el hero NO usa el shader de profundidad, es un fondo CSS plano.
// El encuadre tampoco deja espacio para los 4 letreros diegéticos (ver imagen) → en mobile el
// Pip-Boy es la navegación principal desde Inicio (decisión de diseño, no un recorte de alcance).
import heroMobileUrl from '../assets/upscale/hero_mobile_1080x1920.webp'
// captura del Home con "Proyectos"/"Projects" activo (pantalla central, Punto 4) — una por idioma
import homeShotEsUrl from '../assets/upscale/home_proyectos_1280w.jpg'
import homeShotEnUrl from '../assets/upscale/home_projects_en_1280w.jpg'
import roomBgUrl from '../assets/upscale/proyectos_desktop_2400w.webp'
import alleyUrl from '../assets/upscale/pantalla_callejon_1536w.webp'
import catBgUrl from '../assets/upscale/categoria_desktop_2534w.webp'
import lucesUrl from '../assets/efecto-galeria/Categoria_Desktop_Luces.png'
// Mobile — Proyectos/Categoría (ADENDUM §3, "decisión final"): sala de 2 pantallas (vertical =
// destino del zoom, horizontal = ambiental) → zoom-in a la vertical → esa pantalla se convierte
// en la página "menú" (título + 4 categorías) sobre el mismo fondo de callejón compartido.
import roomMobileUrl from '../assets/upscale/proyectos_movil_1080w.webp'
import menuMobileBgUrl from '../assets/upscale/menu_movil_1080w.webp'
import catMobileBgUrl from '../assets/upscale/categoria_movil_1080w.webp'
import lucesMobileUrl from '../assets/efecto-galeria/Categoria_Mobile_Luces.png'
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
import { initContacto } from './ui/contacto.js'
import { initMenu } from './ui/menu.js'
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

// Layout mobile (distinto de quality.tier: eso es capacidad del dispositivo, esto es ancho de
// pantalla). Umbral compartido con base.css (@media max-width: 768px) — mantener sincronizado.
// Decidido una vez al cargar, como quality.tier; un resize que cruce el umbral pide recargar.
const isMobile = matchMedia('(max-width: 768px)').matches
document.documentElement.classList.toggle('is-mobile', isMobile)

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
  if (isMobile) {
    // composición distinta (primer plano, sin capas bg/personaje separadas) → fondo CSS plano,
    // sin el shader de profundidad (que necesita las dos texturas desktop)
    document.documentElement.style.setProperty('--hero-mobile', `url(${heroMobileUrl})`)
    document.documentElement.style.setProperty('--room-mobile-bg', `url(${roomMobileUrl})`)
    document.documentElement.style.setProperty('--menu-mobile-bg', `url(${menuMobileBgUrl})`)
    document.documentElement.style.setProperty('--cat-bg-mobile', `url(${catMobileBgUrl})`)
    document.documentElement.style.setProperty('--luces-mobile', `url(${lucesMobileUrl})`)
  } else {
    initHero(heroBgUrl, heroCharUrl) // hero multi-capa (shader de profundidad) en desktop
  }
  initSigns() // iguala el ancho de las sílabas de los letreros (no-op si el nav está oculto)
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
  const contacto = initContacto({ lang }) // P3.D: Contacto (azotea)
  if (isMobile) {
    // título de cada botón vía category.catTitle() — mismo mapa ES/EN que usa la galería,
    // no se duplica la traducción en el HTML
    document.querySelectorAll('.projects-menu__cat').forEach((btn) => {
      // el label va en un <span> (hijo elemento): .os-frame solo sube al frente (z-index) a los
      // hijos ELEMENTO, un nodo de texto suelto queda debajo del relleno (::after) y no se ve
      btn.querySelector('span').textContent = category.catTitle(btn.dataset.cat)
    })
  }
  initRouter({ lang, base: '/portfolio/', category, bio, contacto, isMobile }) // Inicio ↔ Proyectos ↔ Categoría ↔ Biografía ↔ Contacto
  initMenu() // menú Pip-Boy global (botón esq. sup. der. → panel de navegación + idioma)
  // precalienta en idle los assets compartidos de la galería (billboard + luces) y la media de
  // los proyectos → la 1.ª apertura de categoría no arranca en negro (el preloader solo cubre el hero)
  const warmGallery = () => {
    const shared = isMobile
      ? [roomMobileUrl, menuMobileBgUrl, catMobileBgUrl, lucesMobileUrl, bioUrl]
      : [catBgUrl, lucesUrl, bioUrl]
    shared.forEach((u) => {
      const im = new Image()
      im.src = u
    })
    category?.warm?.()
    contacto?.warm?.() // precarga el video de Contacto → el 1.er barrido no se frena
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
    document.querySelector('.pipboy')?.style.setProperty('display', 'none')
    document.querySelector('.crt')?.style.setProperty('display', 'none')
  }
} else {
  initPreloader({ sceneUrl: heroCleanUrl, preloadUrls: [heroBgUrl, heroCharUrl] }) // raíz = preloader
}
initLenis()
initDebug()
ticker.add(() => stage.render()) // render AL FINAL del frame, tras las actualizaciones
ticker.start()
