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
//
// MOBILE (ADENDUM §3): Proyectos↔Categoría usan una coreografía y una arquitectura DISTINTAS —
// una sala de 2 pantallas de solo tránsito → zoom-in a la vertical → esa pantalla se convierte
// en un menú de 4 categorías (HTML) → elegir categoría desliza horizontalmente a la galería.
// Los 4 pares "dedicados" (`homeToProjects`, `projectsToHome`, `projectsToCat`, `catToProjects`)
// son despachadores: mismo nombre/firma que antes, pero por dentro eligen la variante mobile o
// desktop — así direct()/exitToHome()/enterFromHome() no necesitan saber cuál corre.

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
const PROJECTS_BEAT_MS = 750 // pausa del "peek" a la sala móvil, solo la 1.ª vez por sesión

export function initRouter({ lang, base, category, bio, contacto, isMobile = false }) {
  const hero = document.querySelector('.hero')
  const room = document.querySelector('.room')
  const frame = room && room.querySelector('.room__frame')
  const central = room && room.querySelector('.screen--central')
  if (!hero || !room || !frame || !central) return

  const catScreens = {}
  CATS.forEach((c) => (catScreens[c] = room.querySelector(`.screen[data-cat="${c}"]`)))

  // elementos mobile (siempre existen en el HTML compartido; solo se USAN si isMobile)
  const roomMobileEl = document.querySelector('.room-mobile')
  const mFrame = roomMobileEl && roomMobileEl.querySelector('.room-mobile__frame')
  const screenVertical = roomMobileEl && roomMobileEl.querySelector('.screen-m--vertical')
  const screenHorizontal = roomMobileEl && roomMobileEl.querySelector('.screen-m--horizontal')
  const projectsMenuEl = document.querySelector('.projects-menu')
  if (mFrame) gsap.set(mFrame, { transformOrigin: '0 0' })

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
  // anima de forma INDEPENDIENTE, con un hueco de desenfoque entremedio. Pero AMBAS se mueven en
  // la MISMA dirección: hacia ABAJO al entrar a Contacto, hacia ARRIBA al salir (pedido de
  // Charlie 28/7) — simula el "tilt" de cámara hacia arriba con motion blur por velocidad.
  const sweep = (entering, onDone) => {
    const gl = document.getElementById('gl')
    const home = [hero, gl].filter(Boolean)
    const outEl = entering ? home : [contacto.el]
    const inEl = entering ? [contacto.el] : home
    const HALF = DUR / 2
    const dir = entering ? 1 : -1 // +1 = hacia abajo (entrar) · -1 = hacia arriba (salir)
    const setBlur = (els, px) => els.forEach((n) => (n.style.filter = px > 0.05 ? `blur(${px.toFixed(1)}px)` : ''))

    if (entering) contacto.el.hidden = false
    gsap.set(outEl, { yPercent: 0, scale: 1, opacity: 1 })
    gsap.set(inEl, { yPercent: -dir * 16, scale: 1.05, opacity: 0 })
    setBlur(inEl, 20)

    // sale: sigue en la dirección `dir` y se pierde en el desenfoque de movimiento
    const ob = { v: 0 }
    gsap
      .timeline()
      .to(outEl, { yPercent: dir * 28, scale: 1.08, opacity: 0, duration: HALF, ease: 'power2.in' })
      .to(ob, { v: 22, duration: HALF, ease: 'power2.in', onUpdate: () => setBlur(outEl, ob.v) }, '<')

    // entra: tras el hueco, sigue llegando en la MISMA dirección `dir` y resuelve su desenfoque
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

  // filtro SVG de desenfoque de movimiento SOLO horizontal (feGaussianBlur stdDeviation="x 0"):
  // un blur() de CSS es uniforme (también emborrona en vertical), pero Charlie pidió que el
  // desenfoque de slideHorizontal sea puramente horizontal — se crea una vez y se anima el
  // atributo stdDeviation durante el desplazamiento (mismo patrón que tvGlitch: nodo compartido).
  const hBlur = (() => {
    let svg = document.querySelector('#cp-hblur-svg')
    if (!svg) {
      svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
      svg.id = 'cp-hblur-svg'
      svg.setAttribute('width', '0')
      svg.setAttribute('height', '0')
      svg.style.position = 'absolute'
      svg.innerHTML = '<filter id="cp-hblur" x="-30%" width="160%"><feGaussianBlur stdDeviation="0 0"/></filter>'
      document.body.appendChild(svg)
    }
    return svg.querySelector('feGaussianBlur')
  })()

  // desliza horizontalmente entre .projects-menu y .category (mobile). dir=1 avanzar (menú→
  // categoría, entra desde la derecha) · dir=-1 volver (entra desde la izquierda).
  const slideHorizontal = (outEl, inEl, dir, onDone) => {
    gsap.set(outEl, { xPercent: 0 })
    gsap.set(inEl, { xPercent: dir * 100 })
    if (!reduced) gsap.set([outEl, inEl], { filter: 'url(#cp-hblur)' })
    gsap.to(outEl, { xPercent: -dir * 100, duration: DUR, ease: 'power3.inOut' })
    gsap.to(inEl, {
      xPercent: 0,
      duration: DUR,
      ease: 'power3.inOut',
      onComplete: () => {
        gsap.set([outEl, inEl], { clearProps: 'transform,filter' })
        onDone()
      },
    })
    if (!reduced) {
      const b = { v: 0 }
      const setBlur = () => hBlur?.setAttribute('stdDeviation', `${b.v.toFixed(1)} 0`)
      gsap
        .timeline()
        .to(b, { v: 9, duration: DUR / 2, ease: 'power2.in', onUpdate: setBlur })
        .to(b, { v: 0, duration: DUR / 2, ease: 'power2.out', onUpdate: setBlur })
    }
  }

  let current = 'home'
  let busy = false

  // transform que lleva un elemento (pantalla) a llenar el viewport. contain=min (encaje
  // exacto, para la central); cover=max (llenar, para monitores de categoría).
  const zoomTo = (el, mode, targetFrame = frame) => {
    const fr = targetFrame.getBoundingClientRect()
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
    hero.hidden = view !== 'home'
    category.el.hidden = !c
    if (isMobile) {
      room.hidden = true // la sala desktop nunca se usa en mobile
      if (roomMobileEl) roomMobileEl.hidden = true // solo tránsito, nunca el estado de reposo
      if (projectsMenuEl) projectsMenuEl.hidden = view !== 'projects'
    } else {
      room.hidden = view !== 'projects'
    }
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
    if (mFrame) gsap.set(mFrame, { clearProps: 'transform' })
    setState(view, push)
    if (view === 'home') dispatchEvent(new Event('cp:refit-signs'))
  }

  // ── Bloques de transición dedicados: cada uno asume su punto de partida EXACTO (documentado
  // en el comentario) y llama a done() al terminar. Nunca tocan `busy` directamente — eso lo
  // maneja go() al final de la cadena, para que también funcione cuando se encadenan (p.ej.
  // Categoría → Proyectos → Inicio para llegar a Biografía desde una categoría).

  // Parte: room visible, hero oculto. Llega a: hero visible, room oculto. (DESKTOP)
  const projectsToHomeDesktop = (done) => {
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

  // Parte: hero visible, room oculto. Llega a: room visible, hero oculto. (DESKTOP)
  const homeToProjectsDesktop = (done) => {
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

  // MOBILE — Parte: hero visible. Llega a: menú de Proyectos visible (4 categorías), hero oculto.
  // Coreografía (ADENDUM §3 + ajuste 30/7 de Charlie): ZOOM-OUT real desde el hero (no crossfade)
  // — la pantalla horizontal (equivalente al "central" de desktop) arranca ya encuadrada a pantalla
  // completa (misma sensación que estar viendo el hero) y el frame se aleja hasta la sala completa
  // → beat de "peek" a ambas pantallas (solo 1.ª vez, sessionStorage; tap la salta) → zoom-in cover
  // a la pantalla vertical → esa pantalla ES el menú. .room-mobile va DESPUÉS de .hero en el DOM
  // (mismo z-index) → al mostrarla ya tapa el hero por completo, sin necesitar un fundido.
  const homeToProjectsMobile = (done) => {
    if (!roomMobileEl || !mFrame || !screenVertical || !screenHorizontal || !projectsMenuEl) return done()
    // roomMobileEl.hidden=false PRIMERO: mientras está oculto (display:none) sus hijos miden
    // rect 0×0 → zoomTo() daría NaN/Infinity y el tween quedaría roto en silencio (sin onComplete)
    roomMobileEl.hidden = false // el DOM order la deja tapando el hero al instante
    const zIn = zoomTo(screenHorizontal, 'cover', mFrame)
    gsap.set(mFrame, { x: zIn.x, y: zIn.y, scale: zIn.scale }) // arranca ya "cerca" (como el hero)
    tvGlitch() // enmascara el empalme hero↔pantalla horizontal
    hero.hidden = true
    const firstTime = !sessionStorage.getItem('cp-projects-mobile-seen')

    const zoomInToMenu = () => {
      sessionStorage.setItem('cp-projects-mobile-seen', '1')
      const z = zoomTo(screenVertical, 'cover', mFrame)
      gsap.to(mFrame, {
        x: z.x,
        y: z.y,
        scale: z.scale,
        duration: DUR,
        ease: 'power3.inOut',
        onComplete: () => {
          tvGlitch() // enmascara el empalme sala↔menú (misma textura, pero el encuadre cambia)
          projectsMenuEl.hidden = false
          gsap.set(projectsMenuEl, { opacity: 0 })
          gsap.to(projectsMenuEl, {
            opacity: 1,
            duration: XF,
            onComplete: () => {
              roomMobileEl.hidden = true
              gsap.set(mFrame, { clearProps: 'transform' })
              done()
            },
          })
        },
      })
    }

    // zoom-out: de "cerca" (llenando el viewport) a la sala completa (frame en su escala real)
    gsap.to(mFrame, {
      x: 0,
      y: 0,
      scale: 1,
      duration: DUR,
      ease: 'power3.inOut',
      onComplete: () => {
        if (!firstTime) return zoomInToMenu() // visitas repetidas: sin el beat de "peek"
        // 1.ª vez: deja ver la sala completa un momento (tap la salta)
        let timer
        const advance = () => {
          clearTimeout(timer)
          roomMobileEl.removeEventListener('pointerdown', advance)
          zoomInToMenu()
        }
        roomMobileEl.addEventListener('pointerdown', advance, { once: true })
        timer = setTimeout(advance, PROJECTS_BEAT_MS)
      },
    })
  }

  // MOBILE — Parte: menú de Proyectos visible. Llega a: hero visible, menú oculto. Espejo exacto
  // de homeToProjectsMobile: zoom-out del menú a la sala completa, zoom-in a la pantalla
  // horizontal (llenando el viewport, como el hero) y AHÍ recién se revela el hero real.
  const projectsMobileToHome = (done) => {
    if (!roomMobileEl || !mFrame || !screenVertical || !screenHorizontal || !projectsMenuEl) return done()
    roomMobileEl.hidden = false
    gsap.set(roomMobileEl, { opacity: 1 })
    // la sala ya zoomeada calza con el encuadre del menú (misma textura) → el fundido del menú
    // revela la sala en la MISMA posición antes de empezar el zoom-out (sin salto visible)
    const zMenu = zoomTo(screenVertical, 'cover', mFrame)
    gsap.set(mFrame, { x: zMenu.x, y: zMenu.y, scale: zMenu.scale })
    gsap.to(projectsMenuEl, {
      opacity: 0,
      duration: XF,
      onComplete: () => {
        projectsMenuEl.hidden = true
      },
    })
    gsap.to(mFrame, {
      x: 0,
      y: 0,
      scale: 1,
      duration: DUR,
      delay: XF,
      ease: 'power3.inOut',
      onComplete: () => {
        // sala completa visible un instante → zoom-in a la pantalla horizontal (mismo destino
        // visual que el hero) y AHÍ se revela el hero real, tapado por la glitch
        const zOut = zoomTo(screenHorizontal, 'cover', mFrame)
        gsap.to(mFrame, {
          x: zOut.x,
          y: zOut.y,
          scale: zOut.scale,
          duration: DUR,
          ease: 'power3.inOut',
          onComplete: () => {
            tvGlitch()
            hero.hidden = false
            roomMobileEl.hidden = true
            gsap.set(roomMobileEl, { clearProps: 'opacity' })
            gsap.set(mFrame, { clearProps: 'transform' })
            done()
          },
        })
      },
    })
  }

  // Parte: room visible (monitor de `catKey` en su lugar), categoría oculta. Llega a: categoría
  // visible (billboard), room oculto. (DESKTOP)
  const projectsToCatDesktop = (catKey, done) => {
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

  // Parte: categoría visible (`catKey`), room oculto. Llega a: room visible, categoría oculta. (DESKTOP)
  const catToProjectsDesktop = (catKey, done) => {
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

  // MOBILE — Parte: menú de Proyectos visible. Llega a: categoría visible (billboard), menú
  // oculto. "Al elegir categoría, desplazamiento horizontal" (ADENDUM §3) — sin zoom ni homografía.
  const projectsMenuToCat = (catKey, done) => {
    if (!projectsMenuEl) return done()
    category.prepare(catKey)
    category.el.hidden = false
    slideHorizontal(projectsMenuEl, category.el, 1, () => {
      projectsMenuEl.hidden = true
      category.lightOn()
      done()
    })
  }

  // MOBILE — Parte: categoría visible (`catKey`). Llega a: menú de Proyectos visible, categoría oculta.
  const catToProjectsMenu = (catKey, done) => {
    if (!projectsMenuEl) return done()
    projectsMenuEl.hidden = false
    slideHorizontal(category.el, projectsMenuEl, -1, () => {
      category.el.hidden = true
      category.reset()
      done()
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

  // despachadores: mismo nombre/firma para desktop y mobile — direct()/exitToHome()/
  // enterFromHome() no necesitan saber cuál corre por dentro.
  const homeToProjects = (done) => (isMobile ? homeToProjectsMobile(done) : homeToProjectsDesktop(done))
  const projectsToHome = (done) => (isMobile ? projectsMobileToHome(done) : projectsToHomeDesktop(done))
  const projectsToCat = (catKey, done) => (isMobile ? projectsMenuToCat(catKey, done) : projectsToCatDesktop(catKey, done))
  const catToProjects = (catKey, done) => (isMobile ? catToProjectsMenu(catKey, done) : catToProjectsDesktop(catKey, done))

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
  // monitores de categoría → su página (desktop)
  CATS.forEach((c) => {
    const s = catScreens[c]
    if (s) s.addEventListener('click', (e) => {
      e.preventDefault()
      go('cat:' + c, true)
    })
  })
  // botones de categoría del menú móvil
  document.querySelectorAll('.projects-menu__cat[data-cat]').forEach((btn) =>
    btn.addEventListener('click', (e) => {
      e.preventDefault()
      go('cat:' + btn.dataset.cat, true)
    }),
  )

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
