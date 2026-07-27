// P3 — Mini-router client-side dentro de cada idioma (Inicio ↔ Proyectos ↔ Categoría).
// History API (URLs limpias), back/forward, document.title. Transiciones = ZOOM anidado:
//   Inicio → Proyectos = zoom-OUT (descubre la sala).      Proyectos → Inicio = zoom-IN a la central.
//   Proyectos → Categoría = zoom-IN al monitor + billboard. Categoría → Proyectos = zoom-OUT.
// reduced-motion → corte directo (a11y).

import { gsap } from 'gsap'
import { quality } from './quality.js'
import { flattenScreen } from '../ui/screens.js'

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

  // overlay de "cambio de canal" (glitch de TV) — se crea una vez y lo comparte todo el router
  const glitchEl =
    document.querySelector('.tv-glitch') ||
    (() => {
      const d = document.createElement('div')
      d.className = 'tv-glitch'
      d.setAttribute('aria-hidden', 'true')
      document.body.appendChild(d)
      return d
    })()
  let glitchTimer
  const tvGlitch = () => {
    if (reduced) return
    glitchEl.classList.remove('is-on')
    void glitchEl.offsetWidth // reinicia la animación
    glitchEl.classList.add('is-on')
    clearTimeout(glitchTimer)
    glitchTimer = setTimeout(() => glitchEl.classList.remove('is-on'), 340)
  }

  // Al terminar un zoom, la pantalla que llenó el viewport queda "bajo el cursor" y el navegador
  // no re-evalúa :hover sin movimiento del mouse → se queda encendida. Apagamos pointer-events en
  // las pantallas (quedan apagadas) y solo los restauramos con el PRIMER movimiento real del mouse;
  // ahí el :hover ya refleja la posición verdadera. (En touch no existe :hover pegado → no aplica.)
  const resetHover = () => {
    if (quality.isTouch) return
    document.body.classList.add('cp-hover-reset')
    const clear = () => document.body.classList.remove('cp-hover-reset')
    window.addEventListener('pointermove', clear, { once: true })
  }

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
      // Proyectos → Categoría: zoom-in al monitor, ENDEREZANDO la pantalla (t 0→1), crossfade
      // al billboard, encendido. Al llegar arriba la pantalla ya es frontal → el cambio de
      // perspectiva a la galería deja de ser brusco.
      category.prepare(toCat)
      gsap.set(frame, { x: 0, y: 0, scale: 1 })
      flattenScreen(toCat, 0)
      const flat = { t: 0 }
      gsap.to(flat, { t: 1, duration: DUR, ease: 'power3.inOut', onUpdate: () => flattenScreen(toCat, flat.t) })
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
      // Categoría → Proyectos: glitch de "cambio de canal" (enmascara el salto de perspectiva),
      // crossfade billboard → sala con el monitor FRONTAL, y zoom-out doblando la pantalla de
      // vuelta a la perspectiva de la sala (t 1→0).
      tvGlitch()
      room.hidden = false
      dispatchEvent(new Event('cp:refit-screens'))
      flattenScreen(fromCat, 1) // parte frontal (calza con el encuadre de la galería)
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
      const flat = { t: 1 }
      gsap.to(flat, { t: 0, duration: DUR, delay: XF, ease: 'power3.inOut', onUpdate: () => flattenScreen(fromCat, flat.t) })
      gsap.to(frame, {
        x: 0,
        y: 0,
        scale: 1,
        duration: DUR,
        delay: XF,
        ease: 'power3.inOut',
        onComplete: () => {
          busy = false
          resetHover()
        },
      })
    } else if (view === 'projects') {
      // Inicio → Proyectos: zoom-OUT. Glitch de "cambio de canal" en el empalme: la central es
      // una captura y el hero real usa tamaños en rem → el lockup/letreros calzan casi, no exacto;
      // el glitch enmascara ese salto y hace la transición entre pantallas más inmersiva.
      tvGlitch()
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
          resetHover()
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
          tvGlitch() // enmascara el empalme captura-central → hero real (ver Inicio→Proyectos)
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
