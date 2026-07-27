// P3 — Mini-router client-side dentro de cada idioma (Inicio ↔ Proyectos ↔ Categoría).
// History API (URLs limpias), back/forward, document.title. Transiciones = ZOOM anidado:
//   Inicio → Proyectos = zoom-OUT (descubre la sala).      Proyectos → Inicio = zoom-IN a la central.
//   Proyectos → Categoría = zoom-IN al monitor + billboard. Categoría → Proyectos = zoom-OUT.
// reduced-motion → corte directo (a11y).

import { gsap } from 'gsap'
import { quality } from './quality.js'
import { flattenScreen } from '../ui/screens.js'

const SEG = { es: 'proyectos', en: 'projects' }
const BIO = { es: 'biografia', en: 'biography' }
const CONTACTO = { es: 'contacto', en: 'contact' }
const CATS = ['ilustracion', 'motion', 'web', 'ia']
const TITLE = {
  es: { home: null, projects: 'Proyectos — Charlie Pixelz', bio: 'Biografía — Charlie Pixelz', contacto: 'Contacto — Charlie Pixelz' },
  en: { home: null, projects: 'Projects — Charlie Pixelz', bio: 'Biography — Charlie Pixelz', contacto: 'Contact — Charlie Pixelz' },
}
const DUR = 0.8
const XF = 0.18

export function initRouter({ lang, base, category, bio, contacto }) {
  const hero = document.querySelector('.hero')
  const room = document.querySelector('.room')
  const frame = room && room.querySelector('.room__frame')
  const central = room && room.querySelector('.screen--central')
  if (!hero || !room || !frame || !central) return

  const catScreens = {}
  CATS.forEach((c) => (catScreens[c] = room.querySelector(`.screen[data-cat="${c}"]`)))

  const url = {
    home: `${base}${lang}/`,
    projects: `${base}${lang}/${SEG[lang]}/`,
    bio: `${base}${lang}/${BIO[lang]}/`,
    contacto: `${base}${lang}/${CONTACTO[lang]}/`,
  }
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

  // Barrido a la azotea (Contacto): Home = hero DOM + lienzo WebGL persistente (#gl). Ambos se
  // trasladan JUNTOS con Contacto (pegados) + un blur de movimiento uniforme que sube y baja.
  // Uniforme y no direccional a propósito: un blur direccional sobre canvas WebGL + video es
  // frágil/caro; el uniforme que pulsa a mitad del barrido lee igual como "velocidad".
  const sweep = (entering, onDone) => {
    const gl = document.getElementById('gl')
    const home = [hero, gl].filter(Boolean)
    const b = { v: 0 }
    const applyBlur = () => {
      const f = `blur(${b.v.toFixed(2)}px)`
      home.forEach((n) => (n.style.filter = f))
      contacto.el.style.filter = f
    }
    // blur de movimiento marcado que pulsa a mitad del barrido (sensación de "pasar rápido")
    gsap.to(b, { v: 14, duration: DUR / 2, yoyo: true, repeat: 1, ease: 'power2.inOut', onUpdate: applyBlur })
    // ease con arranque suave y remate rápido → "latigazo" de cámara (misma duración, se siente más veloz)
    gsap.fromTo(home, { yPercent: entering ? 0 : 100 }, { yPercent: entering ? 100 : 0, duration: DUR, ease: 'power3.in' })
    gsap.fromTo(
      contacto.el,
      { yPercent: entering ? -100 : 0 },
      {
        yPercent: entering ? 0 : -100,
        duration: DUR,
        ease: 'power3.in',
        onComplete: () => {
          home.forEach((n) => {
            n.style.filter = ''
            gsap.set(n, { clearProps: 'transform' })
          })
          contacto.el.style.filter = ''
          gsap.set(contacto.el, { clearProps: 'transform' })
          if (onDone) onDone()
          busy = false
        },
      },
    )
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
    document.body.classList.toggle('route-bio', view === 'bio')
    document.body.classList.toggle('route-contacto', view === 'contacto')
    current = view
  }

  const applyInstant = (view, push) => {
    const c = catOf(view)
    room.hidden = view !== 'projects'
    hero.hidden = view !== 'home'
    category.el.hidden = !c
    if (bio) bio.el.hidden = view !== 'bio'
    if (contacto) contacto.el.hidden = view !== 'contacto'
    if (c) {
      category.prepare(c)
      category.lightOn()
    }
    if (view === 'bio' && bio) {
      bio.prepare()
      bio.reveal()
    }
    if (view === 'contacto' && contacto) {
      contacto.prepare()
      contacto.enter()
      contacto.reveal()
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
    const wasBio = current === 'bio'
    const wasContacto = current === 'contacto'
    setState(view, push)

    if (view === 'contacto') {
      // Inicio → Contacto: BARRIDO a la azotea. Home (hero DOM + lienzo WebGL #gl) y Contacto
      // bajan JUNTOS y "pegados" (Contacto arriba) → la cámara parece mirar hacia arriba. Un blur
      // de movimiento sube y baja a mitad del barrido para dar sensación de velocidad.
      contacto.el.hidden = false
      contacto.prepare()
      contacto.enter() // arranca el video durante el barrido
      sweep(true, () => {
        hero.hidden = true
        contacto.reveal()
      })
    } else if (wasContacto) {
      // Contacto → Inicio: barrido inverso — Home sube desde abajo y Contacto sale por arriba
      hero.hidden = false
      sweep(false, () => {
        contacto.el.hidden = true
        contacto.leave()
        dispatchEvent(new Event('cp:refit-signs'))
      })
    } else if (view === 'bio') {
      // Inicio → Biografía: primero recentramos el personaje del hero (quitamos el parallax del
      // mouse) y recién ahí fundimos a la escena → no se descuadra al encender los rayos X.
      dispatchEvent(new Event('cp:hero-settle'))
      bio.el.hidden = false
      bio.prepare()
      gsap.set(bio.el, { opacity: 0 })
      gsap.to(bio.el, {
        opacity: 1,
        duration: 0.22, // fundido corto: menos pantalla negra al inicio
        delay: 0.15, // solo lo justo para que el hero empiece a recentrarse
        ease: 'power2.out',
        onComplete: () => {
          hero.hidden = true
          bio.reveal()
          busy = false
        },
      })
    } else if (wasBio) {
      // Biografía → Inicio: misma transición que al entrar, en reversa — apagar rayos X (flicker
      // de duración simétrica al encendido) y devolver el parallax del hero.
      hero.hidden = false
      dispatchEvent(new Event('cp:hero-resume'))
      bio.leave?.()
      gsap.to(bio.el, {
        opacity: 0,
        duration: 0.9, // simétrico al "in" (antes 0.42, muy rápido)
        ease: 'power2.in',
        onComplete: () => {
          bio.el.hidden = true
          bio.prepare()
          gsap.set(bio.el, { clearProps: 'opacity' })
          dispatchEvent(new Event('cp:refit-signs'))
          busy = false
        },
      })
    } else if (toCat) {
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
      view = cat
        ? 'cat:' + cat
        : p.includes(`/${SEG[lang]}`)
          ? 'projects'
          : p.includes(`/${BIO[lang]}`)
            ? 'bio'
            : p.includes(`/${CONTACTO[lang]}`)
              ? 'contacto'
              : 'home'
    }
    go(view, false)
  })

  history.replaceState({ view: 'home' }, '', url.home)
}
