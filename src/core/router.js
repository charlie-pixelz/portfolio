// P3 — Mini-router client-side dentro de cada idioma (Inicio ↔ Proyectos ↔ Categoría).
// History API (URLs limpias), back/forward, document.title. Transiciones = ZOOM anidado:
//   Inicio → Proyectos = zoom-OUT (descubre la sala).      Proyectos → Inicio = zoom-IN a la central.
//   Proyectos → Categoría = zoom-IN al monitor + billboard. Categoría → Proyectos = zoom-OUT.
// reduced-motion → corte directo (a11y).

import { gsap } from 'gsap'
import { quality } from './quality.js'

const SEG = { es: 'proyectos', en: 'projects' }
const CATS = ['ilustracion', 'motion', 'web', 'ia']
const TITLE = {
  es: { home: null, projects: 'Proyectos — Charlie Pixelz' },
  en: { home: null, projects: 'Projects — Charlie Pixelz' },
}
const DUR = 0.8
const XF = 0.18

export function initRouter({ lang, base, category }) {
  const hero = document.querySelector('.hero')
  const room = document.querySelector('.room')
  const frame = room && room.querySelector('.room__frame')
  const central = room && room.querySelector('.screen--central')
  if (!hero || !room || !frame || !central) return

  const catScreens = {}
  CATS.forEach((c) => (catScreens[c] = room.querySelector(`.screen[data-cat="${c}"]`)))

  const url = { home: `${base}${lang}/`, projects: `${base}${lang}/${SEG[lang]}/` }
  const catUrl = (c) => `${base}${lang}/${SEG[lang]}/${c}/`
  TITLE[lang].home = document.title
  const reduced = quality.reducedMotion

  gsap.set(frame, { transformOrigin: '0 0' })

  let current = 'home'
  let busy = false

  // transform que lleva un elemento (pantalla) a llenar el viewport. contain=min (encaje
  // exacto, para la central); cover=max (llenar, para monitores de categoría).
  const zoomTo = (el, mode) => {
    const fr = frame.getBoundingClientRect()
    const cr = el.getBoundingClientRect()
    const vw = window.innerWidth
    const vh = window.innerHeight
    const scale = mode === 'cover' ? Math.max(vw / cr.width, vh / cr.height) * 1.02 : Math.min(vw / cr.width, vh / cr.height)
    const lx = cr.x + cr.width / 2 - fr.x
    const ly = cr.y + cr.height / 2 - fr.y
    return { scale, x: vw / 2 - fr.x - scale * lx, y: vh / 2 - fr.y - scale * ly }
  }

  const catOf = (view) => (view.startsWith('cat:') ? view.slice(4) : null)

  const setState = (view, push) => {
    const c = catOf(view)
    const u = c ? catUrl(c) : url[view]
    if (push) history.pushState({ view }, '', u)
    document.title = c ? `${category.catTitle(c)} — Charlie Pixelz` : TITLE[lang][view] || TITLE[lang].home
    document.body.classList.toggle('route-room', view === 'projects')
    document.body.classList.toggle('route-category', !!c)
    current = view
  }

  const applyInstant = (view, push) => {
    const c = catOf(view)
    room.hidden = view !== 'projects'
    hero.hidden = view !== 'home'
    category.el.hidden = !c
    if (c) {
      category.prepare(c)
      category.lightOn()
    }
    gsap.set(frame, { clearProps: 'transform' })
    setState(view, push)
    if (view === 'home') dispatchEvent(new Event('cp:refit-signs'))
  }

  const go = (view, push) => {
    if (view === current || busy) return
    if (reduced) return applyInstant(view, push)

    busy = true
    const toCat = catOf(view)
    const fromCat = catOf(current)
    setState(view, push)

    if (toCat) {
      // Proyectos → Categoría: zoom-in al monitor, crossfade al billboard, encendido
      category.prepare(toCat)
      gsap.set(frame, { x: 0, y: 0, scale: 1 })
      const z = zoomTo(catScreens[toCat], 'cover')
      gsap.to(frame, {
        x: z.x,
        y: z.y,
        scale: z.scale,
        duration: DUR,
        ease: 'power3.inOut',
        onComplete: () => {
          category.el.hidden = false
          gsap.set(category.el, { opacity: 0 })
          gsap.to(category.el, {
            opacity: 1,
            duration: XF,
            onComplete: () => {
              room.hidden = true
              gsap.set(frame, { clearProps: 'transform' })
              gsap.set(category.el, { clearProps: 'opacity' })
              category.lightOn()
              busy = false
            },
          })
        },
      })
    } else if (fromCat && view === 'projects') {
      // Categoría → Proyectos: crossfade billboard → sala (con el monitor llenando), zoom-out
      room.hidden = false
      dispatchEvent(new Event('cp:refit-screens'))
      gsap.set(frame, { x: 0, y: 0, scale: 1 })
      const z = zoomTo(catScreens[fromCat], 'cover')
      gsap.set(frame, { x: z.x, y: z.y, scale: z.scale })
      gsap.set(room, { opacity: 0 })
      gsap.to(room, {
        opacity: 1,
        duration: XF,
        onComplete: () => {
          category.el.hidden = true
          category.reset()
        },
      })
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
    } else if (view === 'projects') {
      // Inicio → Proyectos: zoom-OUT
      room.hidden = false
      dispatchEvent(new Event('cp:refit-screens'))
      gsap.set(frame, { x: 0, y: 0, scale: 1 })
      const z = zoomTo(central, 'contain')
      gsap.set(frame, { x: z.x, y: z.y, scale: z.scale })
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
      // Proyectos → Inicio: zoom-IN a la central
      hero.hidden = false
      const z = zoomTo(central, 'contain')
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
              dispatchEvent(new Event('cp:refit-signs'))
              busy = false
            },
          })
        },
      })
    }
  }

  // letreros/botones con ruta explícita (Proyectos, Volver, central=Inicio)
  document.querySelectorAll('[data-route]').forEach((node) =>
    node.addEventListener('click', (e) => {
      e.preventDefault()
      go(node.dataset.route, true)
    }),
  )
  // monitores de categoría → su página
  CATS.forEach((c) => {
    const s = catScreens[c]
    if (s) s.addEventListener('click', (e) => {
      e.preventDefault()
      go('cat:' + c, true)
    })
  })

  window.addEventListener('popstate', (e) => {
    let view = e.state && e.state.view
    if (!view) {
      const p = location.pathname
      const cat = CATS.find((c) => p.includes(`/${SEG[lang]}/${c}`))
      view = cat ? 'cat:' + cat : p.includes(`/${SEG[lang]}`) ? 'projects' : 'home'
    }
    go(view, false)
  })

  history.replaceState({ view: 'home' }, '', url.home)
}
