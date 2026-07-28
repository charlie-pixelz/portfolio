// P3 — Mini-router client-side dentro de cada idioma (Inicio ↔ Proyectos ↔ Categoría ↔ Biografía ↔ Contacto).
// History API (URLs limpias), back/forward, document.title. reduced-motion → corte directo (a11y).
//
// Máquina de transición: solo 4 pares tienen animación DEDICADA (las "bonitas"):
//   Inicio ↔ Proyectos (zoom sala) · Proyectos ↔ Categoría (zoom monitor) ·
//   Inicio ↔ Biografía (rayos X) · Inicio ↔ Contacto (barrido azotea).
// El menú Pip-Boy permite saltar entre CUALQUIER vista (p.ej. Biografía → Contacto directo).
// Para esos saltos NO hay animación directa: se resuelven en 2 pasos — "salir a Inicio" desde
// la vista actual, y LUEGO "entrar" a la vista destino desde Inicio. Esto es intencional (evita
// el bug histórico de que una vista especial quedara sin cerrar al saltar a otra) — ver
// exitToHome()/enterFromHome() más abajo.

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

  // Barrido a la azotea (Contacto): NO son dos capas "pegadas" deslizando juntas — cada vista
  // anima de forma INDEPENDIENTE (la que sale sube y se pierde en el desenfoque; tras un hueco,
  // la que entra aparece resolviendo su propio desenfoque). Eso simula el "tilt" de cámara hacia
  // arriba con motion blur por velocidad, y deja el espacio intermedio que pidió Charlie — sin
  // que ambas vistas queden visualmente unidas.
  const sweep = (entering, onDone) => {
    const gl = document.getElementById('gl')
    const home = [hero, gl].filter(Boolean)
    const outEl = entering ? home : [contacto.el]
    const inEl = entering ? [contacto.el] : home
    const HALF = DUR / 2
    const setBlur = (els, px) => els.forEach((n) => (n.style.filter = px > 0.05 ? `blur(${px.toFixed(1)}px)` : ''))

    if (entering) contacto.el.hidden = false
    gsap.set(outEl, { yPercent: 0, scale: 1, opacity: 1 })
    gsap.set(inEl, { yPercent: entering ? 16 : -16, scale: 1.05, opacity: 0 })
    setBlur(inEl, 20)

    // sale: sube y se pierde en el desenfoque de movimiento (no se desliza hacia la otra vista)
    const ob = { v: 0 }
    gsap
      .timeline()
      .to(outEl, { yPercent: -28, scale: 1.08, opacity: 0, duration: HALF, ease: 'power2.in' })
      .to(ob, { v: 22, duration: HALF, ease: 'power2.in', onUpdate: () => setBlur(outEl, ob.v) }, '<')

    // entra: tras el hueco, resuelve su propio desenfoque y se asienta
    const ib = { v: 20 }
    gsap
      .timeline({ delay: HALF })
      .to(inEl, { yPercent: 0, scale: 1, opacity: 1, duration: HALF, ease: 'power2.out' })
      .to(ib, { v: 0, duration: HALF, ease: 'power2.out', onUpdate: () => setBlur(inEl, ib.v) }, '<')
      .call(() => {
        setBlur(outEl, 0)
        setBlur(inEl, 0)
        gsap.set([...outEl, ...inEl], { clearProps: 'transform,opacity' })
        if (onDone) onDone()
      })
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

  const catOf = (view) => (view && view.startsWith('cat:') ? view.slice(4) : null)

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

  // ── Bloques de transición dedicados: cada uno asume su punto de partida EXACTO (documentado
  // en el comentario) y llama a done() al terminar. Nunca tocan `busy` directamente — eso lo
  // maneja go() al final de la cadena, para que también funcione cuando se encadenan (p.ej.
  // Categoría → Proyectos → Inicio para llegar a Biografía desde una categoría).

  // Parte: room visible, hero oculto. Llega a: hero visible, room oculto.
  const projectsToHome = (done) => {
    hero.hidden = false
    const z = zoomTo(central, 'contain')
    gsap.to(frame, {
      x: z.x,
      y: z.y,
      scale: z.scale,
      duration: DUR,
      ease: 'power3.inOut',
      onComplete: () => {
        tvGlitch() // enmascara el empalme captura-central → hero real
        gsap.to(room, {
          opacity: 0,
          duration: XF,
          onComplete: () => {
            room.hidden = true
            gsap.set(room, { clearProps: 'opacity' })
            gsap.set(frame, { clearProps: 'transform' })
            dispatchEvent(new Event('cp:refit-signs'))
            done()
          },
        })
      },
    })
  }

  // Parte: hero visible, room oculto. Llega a: room visible, hero oculto.
  const homeToProjects = (done) => {
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
        resetHover()
        done()
      },
    })
  }

  // Parte: room visible (monitor de `catKey` en su lugar), categoría oculta. Llega a: categoría
  // visible (billboard), room oculto.
  const projectsToCat = (catKey, done) => {
    category.prepare(catKey)
    gsap.set(frame, { x: 0, y: 0, scale: 1 })
    flattenScreen(catKey, 0)
    const flat = { t: 0 }
    gsap.to(flat, { t: 1, duration: DUR, ease: 'power3.inOut', onUpdate: () => flattenScreen(catKey, flat.t) })
    const z = zoomTo(catScreens[catKey], 'cover')
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
            done()
          },
        })
      },
    })
  }

  // Parte: categoría visible (`catKey`), room oculto. Llega a: room visible, categoría oculta.
  const catToProjects = (catKey, done) => {
    tvGlitch()
    room.hidden = false
    dispatchEvent(new Event('cp:refit-screens'))
    flattenScreen(catKey, 1) // parte frontal (calza con el encuadre de la galería)
    gsap.set(frame, { x: 0, y: 0, scale: 1 })
    const z = zoomTo(catScreens[catKey], 'cover')
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
    gsap.to(flat, { t: 0, duration: DUR, delay: XF, ease: 'power3.inOut', onUpdate: () => flattenScreen(catKey, flat.t) })
    gsap.to(frame, {
      x: 0,
      y: 0,
      scale: 1,
      duration: DUR,
      delay: XF,
      ease: 'power3.inOut',
      onComplete: () => {
        resetHover()
        done()
      },
    })
  }

  // Parte: hero visible. Llega a: bio visible (rayos X encendido, cajas reveladas), hero oculto.
  const homeToBio = (done) => {
    // recentra el personaje del hero (sin parallax del mouse) antes de fundir a la escena
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
        done()
      },
    })
  }

  // Parte: bio visible. Llega a: hero visible, bio oculto.
  const bioToHome = (done) => {
    hero.hidden = false
    dispatchEvent(new Event('cp:hero-resume'))
    bio.leave?.(() => {
      bio.el.hidden = true
      bio.prepare()
      dispatchEvent(new Event('cp:refit-signs'))
      done()
    })
  }

  // Parte: hero visible. Llega a: contacto visible (panel revelado), hero oculto.
  const homeToContacto = (done) => {
    contacto.prepare()
    contacto.enter() // arranca el video durante el barrido
    sweep(true, () => {
      hero.hidden = true
      contacto.reveal()
      done()
    })
  }

  // Parte: contacto visible. Llega a: hero visible, contacto oculto.
  const contactoToHome = (done) => {
    hero.hidden = false
    sweep(false, () => {
      contacto.el.hidden = true
      contacto.leave()
      dispatchEvent(new Event('cp:refit-signs'))
      done()
    })
  }

  // pares con animación DEDICADA (ver cabecera del archivo)
  const direct = (from, view) => {
    if (from === 'home' && view === 'projects') return homeToProjects
    if (from === 'projects' && view === 'home') return projectsToHome
    if (from === 'home' && view === 'bio') return homeToBio
    if (from === 'bio' && view === 'home') return bioToHome
    if (from === 'home' && view === 'contacto') return homeToContacto
    if (from === 'contacto' && view === 'home') return contactoToHome
    const toCat = catOf(view)
    const fromCat = catOf(from)
    if (from === 'projects' && toCat) return (done) => projectsToCat(toCat, done)
    if (fromCat && view === 'projects') return (done) => catToProjects(fromCat, done)
    return null
  }

  // cualquier otro salto (p.ej. Biografía → Contacto, Categoría → Biografía, Proyectos →
  // Biografía) se resuelve en 2 pasos: cerrar la vista actual volviendo a Inicio, y LUEGO abrir
  // la vista destino desde Inicio — el mismo patrón que ya usa cada par directo.
  const exitToHome = (from, done) => {
    if (from === 'home') return done()
    if (from === 'projects') return projectsToHome(done)
    if (from === 'bio') return bioToHome(done)
    if (from === 'contacto') return contactoToHome(done)
    const cat = catOf(from)
    if (cat) return catToProjects(cat, () => projectsToHome(done))
    done()
  }
  const enterFromHome = (view, done) => {
    if (view === 'home') return done()
    if (view === 'projects') return homeToProjects(done)
    if (view === 'bio') return homeToBio(done)
    if (view === 'contacto') return homeToContacto(done)
    const cat = catOf(view)
    if (cat) return homeToProjects(() => projectsToCat(cat, done))
    done()
  }

  const go = (view, push) => {
    if (view === current || busy) return
    if (reduced) return applyInstant(view, push)

    busy = true
    const from = current
    setState(view, push)

    const finish = () => {
      busy = false
    }
    const fn = direct(from, view)
    if (fn) fn(finish)
    else exitToHome(from, () => enterFromHome(view, finish))
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
