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
const OVERSCAN = 1.05 // esconde los bordes recortados de la central al llenar el viewport

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
    const scale = Math.max(vw / cr.width, vh / cr.height) * OVERSCAN
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
      return
    }

    busy = true
    setState(view, push)

    if (view === 'projects') {
      // zoom-OUT: partimos con la central llenando el viewport (≈ Inicio) y nos alejamos
      room.hidden = false
      gsap.set(frame, { x: 0, y: 0, scale: 1 })
      const z = zoomToCentral()
      gsap.set(frame, { x: z.x, y: z.y, scale: z.scale })
      hero.hidden = true // la sala (opaca) ya cubre el hero
      gsap.to(frame, {
        x: 0,
        y: 0,
        scale: 1,
        duration: DUR,
        ease: 'power3.inOut',
        onComplete: () => {
          busy = false
        },
      })
    } else {
      // zoom-IN: acercamos hasta que la central llena el viewport, luego revelamos el hero vivo
      const z = zoomToCentral()
      gsap.to(frame, {
        x: z.x,
        y: z.y,
        scale: z.scale,
        duration: DUR,
        ease: 'power3.inOut',
        onComplete: () => {
          hero.hidden = false
          room.hidden = true
          gsap.set(frame, { clearProps: 'transform' })
          busy = false
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
