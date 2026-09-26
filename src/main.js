// Charlie Pixelz — entrada compartida.
// Fase 1: arquitectura base. P1.B: hero con depth-map en las home /es/ /en/.

// tokens.css y base.css NO se importan acá a propósito: van como <link rel="stylesheet"> en el
// <head> de cada HTML. Importados desde el módulo, el CSS solo llega DESPUÉS de que el navegador
// descarga y ejecuta main.js → el documento se pinta un instante en HTML crudo (blanco, con los
// textos sin estilo). Eso es exactamente lo que veía Charlie al elegir idioma (31/7). Como <link>
// el CSS bloquea el primer pintado y el documento nunca aparece sin estilo — ni en dev ni en build.
import heroBgUrl from '../assets/upscale/hero_bg_2400w.webp'
import heroCharUrl from '../assets/upscale/hero_character_2400w.webp'
// H1 (revisión 25/9): depth map SOLO del fondo (silueta del personaje rellenada con la profundidad de
// la calle; generado desde hero_depth_1600w). El fondo se desplaza píxel a píxel según él.
import heroDepthUrl from '../assets/upscale/hero_bgdepth_1600w.webp'
import heroCleanUrl from '../assets/upscale/hero_desktop_clean_2400w.webp'
// preview "apagado" de la pantalla horizontal de la sala móvil: se ve a ~150px de ancho, no hace
// falta el hero de escritorio completo (255 KB) — una versión de 800w alcanza (P5, revisión 25/9)
import heroCleanMobileUrl from '../assets/upscale/hero_desktop_clean_800w.webp'
// Mobile (30/7, reemplaza la composición de primer plano anterior): composición ancha de
// callejón con espacio real para los 4 letreros — mismo tratamiento que desktop (shader de
// profundidad multi-capa bg+personaje). Los letreros vuelven a ser la nav principal en mobile
// (confirmado por Charlie), el Pip-Boy vuelve a ser el menú secundario, igual que en desktop.
import heroMobileBgUrl from '../assets/upscale/hero_mobile_bg_2400w.webp'
import heroMobileCharUrl from '../assets/upscale/hero_mobile_character_2400w.webp'
import heroMobileDepthUrl from '../assets/upscale/hero_mobile_bgdepth_1600w.webp'
// composite plano (bg+personaje aplanados) SOLO para el preloader — su shader dithera una imagen
// PLANA (no dos capas), y usar el hero clean de DESKTOP (4602/2810, muy ancho) en un viewport
// portrait lo dejaba como una franja horizontal delgada (`contain` con barras arriba/abajo). Este
// composite comparte aspecto con el hero mobile (825/1465, ya casi vertical) → llena la pantalla.
import heroMobileCleanUrl from '../assets/upscale/hero_mobile_clean_2400w.webp'
// captura del Home con "Proyectos"/"Projects" activo (pantalla central, Punto 4) — una por idioma
import homeShotEsUrl from '../assets/upscale/home_proyectos_1280w.jpg'
import homeShotEnUrl from '../assets/upscale/home_projects_en_1280w.jpg'
import roomBgUrl from '../assets/upscale/proyectos_desktop_2400w.webp'
import alleyUrl from '../assets/upscale/pantalla_callejon_1536w.webp'
import catBgUrl from '../assets/upscale/categoria_desktop_2534w.webp'
import lucesUrl from '../assets/efecto-galeria/Categoria_Desktop_Luces.webp' // WebP con alpha: 84 KB vs 377 KB del PNG (el PNG queda como máster)
// Mobile — Proyectos/Categoría (ADENDUM §3, "decisión final"): sala de 2 pantallas (vertical =
// destino del zoom, horizontal = ambiental) → zoom-in a la vertical → esa pantalla se convierte
// en la página "menú" (título + 4 categorías) sobre el mismo fondo de callejón compartido.
import roomMobileUrl from '../assets/upscale/proyectos_movil_1080w.webp'
import menuMobileBgUrl from '../assets/upscale/menu_movil_1080w.webp'
import catMobileBgUrl from '../assets/upscale/categoria_movil_1080w.webp'
import lucesMobileUrl from '../assets/efecto-galeria/Categoria_Mobile_Luces.webp'
import bioUrl from '../assets/upscale/bio_desktop_2400w.webp' // esqueleto rayos-X (Biografía)
// Mobile — Biografía (30/7): misma composición ancha de callejón que el hero móvil, en modo
// rayos X. Interacción propia (aros pulsantes → una caja visible a la vez), ver bio.js.
import bioMobileUrl from '../assets/upscale/bio_mobile_desktop_4602w.webp'
import { ticker } from './core/ticker.js'
import { quality } from './core/quality.js'
import { pointer } from './core/pointer.js'
import { forceFontLoad } from './core/loader.js'
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
import { initCursor } from './ui/cursor.js'
import { initRouter } from './core/router.js'
import { initDebug } from './core/debug.js'

// Dispara la descarga de las 6 fuentes YA, sin esperar a saber si esta carga es el preloader (/)
// o una entrada directa a /es//en/ (recarga de Inicio, deep link) — antes solo se forzaba dentro
// de preload(), que la rama /es//en/ nunca llama. Handjet/Doto además tienen <link rel=preload>
// en el <head> de cada HTML (arrancan antes que este script); esto cubre las otras 4 y sirve de
// respaldo si el navegador ignora el preload.
forceFontLoad()

// F5: restituye la sub-ruta real tras el rebote de 404.html (GitHub Pages no tiene rutas de
// servidor — solo /, /es/ y /en/ existen como archivo). 404.html guarda la ruta pedida antes de
// redirigir a la home del idioma; acá se repone en la barra de direcciones ANTES de que se lea
// más abajo (path/lang) y de que router.js decida qué sección mostrar al arrancar.
try {
  const redirect = sessionStorage.getItem('cp-redirect')
  if (redirect) {
    sessionStorage.removeItem('cp-redirect')
    history.replaceState(null, '', redirect)
  }
} catch {}

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
// dev/comparación: ?signs=2d muestra los letreros planos (rotate 2D, como la maqueta original) en
// vez del default 3D (rotateY + perspective, técnica de desktop — la que Charlie prefirió 31/7).
if (new URLSearchParams(location.search).get('signs') === '2d') {
  document.documentElement.classList.add('signs-2d')
}

// (31/7, 4.ª vuelta) Las posiciones/ángulos de los 4 letreros móviles YA NO se aplican por JS —
// viven en base.css con `!important` (busca "Letreros MOBILE", pisa el style inline de desktop
// del mismo HTML). Antes se asignaban acá vía applyMobileSignLayout(), pero eso corre recién
// cuando main.js termina de descargarse y ejecutarse: durante ese margen (más largo en dev, con
// muchos módulos por red) el navegador ya había pintado el layout de ESCRITORIO (letreros altos y
// angostos, en sus coordenadas originales) — el "flash azul de letreros largos" que reportó
// Charlie. Con CSS puro no hay margen que cubrir: el primer pintado ya sale correcto.
// Lo único que SÍ sigue necesitando JS es juntar las sílabas de Proyectos/Biografía en una sola
// línea (fitSigns() estira ese <i> único al ancho del marco) — el texto accesible no cambia, el
// aria-label del <a> es el que leen los lectores.
const applyMobileSignLayout = () => {
  ;['projects', 'bio'].forEach((route) => {
    const label = document.querySelector(`.neon-nav .sign[data-route="${route}"] .label`)
    if (!label) return
    label.innerHTML = `<i>${[...label.querySelectorAll('i')].map((i) => i.textContent).join('')}</i>`
  })
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
  if (isMobile) {
    document.documentElement.style.setProperty('--room-mobile-bg', `url(${roomMobileUrl})`)
    document.documentElement.style.setProperty('--menu-mobile-bg', `url(${menuMobileBgUrl})`)
    document.documentElement.style.setProperty('--cat-bg-mobile', `url(${catMobileBgUrl})`)
    document.documentElement.style.setProperty('--luces-mobile', `url(${lucesMobileUrl})`)
    // preview "apagado" de ambas pantallas de la sala de tránsito: la vertical comparte el
    // callejón (mismo patrón que las pantallas de categoría desktop), la horizontal usa el hero
    // limpio de desktop (proporción más cercana a la del monitor horizontal, sugerido por Charlie)
    document.documentElement.style.setProperty('--hero-clean', `url(${heroCleanMobileUrl})`)
    document.documentElement.style.setProperty('--bio-mobile', `url(${bioMobileUrl})`)
    initHero(heroMobileBgUrl, heroMobileCharUrl, heroMobileDepthUrl, bioMobileUrl) // mismo shader multi-capa que desktop; bioMobileUrl = radiografía para el barrido (B4 móvil)
    applyMobileSignLayout()
  } else {
    initHero(heroBgUrl, heroCharUrl, heroDepthUrl, bioUrl) // hero multi-capa (shader de profundidad) en desktop; bioUrl = radiografía para la lente (B4)
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
  const bio = initBio({ lang, isMobile }) // P3.C: Biografía (modo rayos X)
  const contacto = initContacto({ lang, isMobile }) // P3.D: Contacto (azotea)
  if (isMobile) {
    // título de cada botón vía category.catTitle() — mismo mapa ES/EN que usa la galería,
    // no se duplica la traducción en el HTML
    document.querySelectorAll('.projects-menu__cat').forEach((btn) => {
      // el label va en un <span> (hijo elemento): .os-frame solo sube al frente (z-index) a los
      // hijos ELEMENTO, un nodo de texto suelto queda debajo del relleno (::after) y no se ve
      btn.querySelector('span').textContent = category.catTitle(btn.dataset.cat)
    })
    // mismo texto en el placeholder de la pantalla vertical de la sala (lo que se ve ANTES del
    // zoom-in) — mismas 4 categorías, mismo orden que los botones reales, mismos elementos
    // (.projects-menu__cat) que el menú real, así el zoom-in no cambia de estética (31/7)
    const cats = ['ilustracion', 'motion', 'web', 'ia']
    document.querySelectorAll('.screen-m--vertical .projects-menu__cat span').forEach((span, n) => {
      span.textContent = category.catTitle(cats[n])
    })
  }
  initRouter({ lang, base: '/', category, bio, contacto, isMobile }) // Inicio ↔ Proyectos ↔ Categoría ↔ Biografía ↔ Contacto
  initMenu() // menú Pip-Boy global (botón esq. sup. der. → panel de navegación + idioma)
  // Precarga ESCALONADA de las otras escenas. Antes todo (sala, galería, bio, video de Contacto,
  // ~1.8 MB) salía en paralelo con las texturas del hero y les robaba ancho de banda: en 4G lento
  // el hero (y con él el LCP) llegaba segundos tarde. Orden ahora:
  //   1) texturas del hero (initHero) → 2) la sala de Proyectos (el zoom-out tiene que estar listo
  //   al primer clic) → 3) billboard/luces/rayos X → 4) video de Contacto.
  // Con saveData o red 2G/3G se corta en el paso 2; el resto llega igual por intención (hover/foco).
  const warm = (urls) =>
    urls.forEach((u) => {
      const im = new Image()
      im.decoding = 'async'
      im.src = u
    })
  const conn = navigator.connection
  const slowNet = !!conn && (conn.saveData || /2g|3g/.test(conn.effectiveType || ''))
  const idle = (fn, timeout) => ('requestIdleCallback' in window ? requestIdleCallback(fn, { timeout }) : setTimeout(fn, 300))
  const whenHeroReady = (fn) => {
    if (document.body.classList.contains('hero-ready')) return fn()
    const mo = new MutationObserver(() => {
      if (!document.body.classList.contains('hero-ready')) return
      mo.disconnect()
      fn()
    })
    mo.observe(document.body, { attributes: true, attributeFilter: ['class'] })
  }
  const scenes = isMobile ? [catMobileBgUrl, lucesMobileUrl, bioMobileUrl] : [catBgUrl, lucesUrl, bioUrl]
  // cada etapa espera un respiro mínimo además del idle: requestIdleCallback mira el hilo principal,
  // no la red, y en un equipo rápido con 4G lento las tres etapas se encimaban igual
  const after = (ms, fn) => setTimeout(() => idle(fn, 3000), ms)
  whenHeroReady(() =>
    after(0, () => {
      warm(isMobile ? [roomMobileUrl, menuMobileBgUrl, heroCleanMobileUrl] : [roomBgUrl, alleyUrl, lang === 'en' ? homeShotEnUrl : homeShotEsUrl])
      if (slowNet) return
      after(1500, () => {
        warm(scenes)
        after(2500, () => contacto?.warm?.())
      })
    }),
  )
  // intención explícita (hover/foco/clic) → se adelanta lo de esa sección, sin esperar el idle
  const onIntent = (sel, fn) =>
    document.querySelectorAll(sel).forEach((el) => {
      el.addEventListener('pointerenter', fn, { once: true })
      el.addEventListener('focus', fn, { once: true })
    })
  onIntent('[data-route="contacto"]', () => contacto?.warm?.())
  onIntent('[data-route="bio"]', () => warm([isMobile ? bioMobileUrl : bioUrl]))
  // la media pesada de los 16 casos recién se precalienta cuando hay intención real de entrar a
  // Proyectos (hover/foco del letrero en desktop, click/tap en cualquier plataforma) — para ese
  // momento aún falta la animación de zoom a la sala + elegir categoría, tiempo de sobra para que
  // no se note. category.warm() es idempotente (se auto-protege con un flag `warmed`).
  document.querySelectorAll('[data-route="projects"]').forEach((el) => {
    el.addEventListener('pointerenter', () => category?.warm?.(), { once: true })
    el.addEventListener('click', () => category?.warm?.(), { once: true })
  })
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
  // raíz = preloader. isMobile ya se calculó arriba (independiente de /es//en/, aplica también acá.
  initPreloader(
    isMobile
      ? { sceneUrl: heroMobileCleanUrl, preloadUrls: [heroMobileBgUrl, heroMobileCharUrl], isMobile }
      : { sceneUrl: heroCleanUrl, preloadUrls: [heroBgUrl, heroCharUrl] },
  )
}
initCursor({ lang: lang || 'es' }) // retícula (H3): capa OS sobre el cursor del sistema, solo mouse
initDebug()
ticker.add((t, dt) => stage.render(dt)) // render AL FINAL del frame, tras las actualizaciones
ticker.start()
