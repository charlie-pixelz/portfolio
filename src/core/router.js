// P3.A — Mini-router client-side dentro de cada idioma (Inicio ↔ Proyectos).
// History API (URLs limpias /es/proyectos/ · /en/projects/), back/forward, document.title,
// y una transición glitch entre vistas. reduced-motion → corte directo (a11y).
// Las páginas HTML reales por ruta (SEO/deep-link, gate F5) son el siguiente paso.

import { quality } from './quality.js'

const SEG = { es: 'proyectos', en: 'projects' }
const TITLE = {
  es: { home: null, projects: 'Proyectos — Charlie Pixelz' },
  en: { home: null, projects: 'Projects — Charlie Pixelz' },
}

export function initRouter({ lang, base }) {
  const home = document.querySelector('.hero')
  const room = document.querySelector('.room')
  if (!home || !room) return
  const el = { home, projects: room } // vista → elemento DOM

  const url = { home: `${base}${lang}/`, projects: `${base}${lang}/${SEG[lang]}/` }
  TITLE[lang].home = document.title
  const reduced = quality.reducedMotion

  let current = 'home'
  let busy = false

  const apply = (view) => {
    el[view === 'projects' ? 'home' : 'projects'].hidden = true
    el[view].hidden = false
    el[view].classList.remove('route-out')
    document.body.classList.toggle('route-room', view === 'projects')
    document.title = TITLE[lang][view] || TITLE[lang].home
    current = view
  }

  const go = (view, push) => {
    if (!el[view] || view === current || busy) return
    if (push) history.pushState({ view }, '', url[view])
    if (reduced) {
      apply(view)
      return
    }
    busy = true
    const outEl = el[current]
    outEl.classList.add('route-out') // glitch de salida de la vista actual
    setTimeout(() => {
      apply(view)
      el[view].classList.add('route-in') // glitch de entrada de la nueva vista
      setTimeout(() => {
        el[view].classList.remove('route-in')
        busy = false
      }, 360)
    }, 300)
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
