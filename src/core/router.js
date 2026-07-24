// P3.A — Mini-router client-side dentro de cada idioma (Inicio ↔ Proyectos).
// History API (URLs limpias /es/proyectos/ · /en/projects/), back/forward, document.title.
// Transición = ZOOM anidado (estilo unseen.co): el Inicio "vive" en la pantalla central de la sala.
//   Inicio → Proyectos = zoom-OUT (la cámara se aleja y descubre la sala de monitores).
//   Proyectos → Inicio = zoom-IN sobre la pantalla central (que proyecta el Inicio).
// reduced-motion → corte directo (a11y). Páginas HTML reales por ruta (gate F5) = siguiente paso.

import { gsap } from 'gsap'
import { quality } from './quality.js'

const SEG = { es: 'proyectos', en: 'projects' }
const TITLE = {
  es: { home: null, projects: 'Proyectos — Charlie Pixelz' },
  en: { home: null, projects: 'Projects — Charlie Pixelz' },
}
const DUR = 0.8
const XF = 0.18 // crossfade que disimula el salto hero <-> central en el empalme del zoom

export function initRouter({ lang, base }) {
  const hero = document.querySelector('.hero')
  const room = document.querySelector('.room')
  const frame = room && room.querySelector('.room__frame')
  const central = room && room.querySelector('.screen--central')
  if (!hero || !room || !frame || !central) return

  const url = { home: `${base}${lang}/`, projects: `${base}${lang}/${SEG[lang]}/` }
  TITLE[lang].home = document.title
  const reduced = quality.reducedMotion

  gsap.set(frame, { transformOrigin: '0 0' })

  let current = 'home'
  let busy = false

  // Transform que lleva la pantalla central a cubrir el viewport (= Inicio a pantalla completa).
  // Requiere que el frame esté en identidad al medir.
  const zoomToCentral = () => {
    const fr = frame.getBoundingClientRect()
    const cr = central.getBoundingClientRect()
    const vw = window.innerWidth
    const vh = window.innerHeight
    // CONTAIN (min, no max): mete la caja central dentro del viewport igual que el hero
    // "contiene" su imagen (todas las imágenes del hero son 2400×1465 y la caja central
    // tiene ese mismo aspecto), así el encuadre calza EXACTO y no se ve más grande.
    const scale = Math.min(vw / cr.width, vh / cr.height)
    const lx = cr.x + cr.width / 2 - fr.x // centro de la central en coords locales del frame
    const ly = cr.y + cr.height / 2 - fr.y
    return {
      scale,
      x: vw / 2 - fr.x - scale * lx,
      y: vh / 2 - fr.y - scale * ly,
    }
  }

  const setState = (view, push) => {
    if (push) history.pushState({ view }, '', url[view])
    document.title = TITLE[lang][view] || TITLE[lang].home
    document.body.classList.toggle('route-room', view === 'projects')
    current = view
  }

  const go = (view, push) => {
    if (view === current || busy) return

    if (reduced) {
      // corte directo, sin zoom
      room.hidden = view !== 'projects'
      hero.hidden = view === 'projects'
      gsap.set(frame, { clearProps: 'transform' })
      setState(view, push)
      if (view === 'home') dispatchEvent(new Event('cp:refit-signs'))
      return
    }

    busy = true
    setState(view, push)

    if (view === 'projects') {
      // zoom-OUT: partimos con la central llenando el viewport (≈ Inicio) y nos alejamos
      room.hidden = false
      dispatchEvent(new Event('cp:refit-screens')) // aplicar la perspectiva ahora que la sala es visible
      gsap.set(frame, { x: 0, y: 0, scale: 1 })
      const z = zoomToCentral()
      gsap.set(frame, { x: z.x, y: z.y, scale: z.scale })
      // crossfade hero -> central (mismo encuadre) y recién después empezar a alejar
      gsap.set(room, { opacity: 0 })
      gsap.to(room, { opacity: 1, duration: XF, onComplete: () => (hero.hidden = true) })
      gsap.to(frame, {
        x: 0,
        y: 0,
        scale: 1,
        duration: DUR,
        delay: XF,
        ease: 'power3.inOut',
        onComplete: () => {
          busy = false
        },
      })
    } else {
      // zoom-IN: acercamos hasta que la central llena el viewport, luego crossfade a hero vivo
      hero.hidden = false // hero vivo listo detrás de la sala
      const z = zoomToCentral()
      gsap.to(frame, {
        x: z.x,
        y: z.y,
        scale: z.scale,
        duration: DUR,
        ease: 'power3.inOut',
        onComplete: () => {
          gsap.to(room, {
            opacity: 0,
            duration: XF,
            onComplete: () => {
              room.hidden = true
              gsap.set(room, { clearProps: 'opacity' })
              gsap.set(frame, { clearProps: 'transform' })
              dispatchEvent(new Event('cp:refit-signs')) // la home estaba oculta: re-medir letreros
              busy = false
            },
          })
        },
      })
    }
  }

  document.querySelectorAll('[data-route]').forEach((node) =>
    node.addEventListener('click', (e) => {
      e.preventDefault()
      go(node.dataset.route, true)
    }),
  )

  window.addEventListener('popstate', (e) => {
    const view = (e.state && e.state.view) || (location.pathname.includes(`/${SEG[lang]}`) ? 'projects' : 'home')
    go(view, false)
  })

  history.replaceState({ view: 'home' }, '', url.home)
}
