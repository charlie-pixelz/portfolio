// bio.js — P3.C: página Biografía en "modo rayos X" (ART_DIR §6.4 / ADENDUM §4), rediseño Fase 4
// de la revisión (25/9):
//   B1 — una barra de escaneo recorre el cuerpo y el esqueleto aparece solo donde ya pasó (antes:
//        flicker de tubo). ~0.8 s.
//   B2 — cada zona tiene una mira que se FIJA cuando la barra la cruza, con etiqueta anatómica, y
//        una línea guía (diagonal + horizontal) hasta su panel. El título se decodifica y el párrafo
//        entra por líneas (antes: tipeo de ~4 s). Todo legible en < 2 s.
//   B3 — celular: esqueleto arriba con 3 puntos, dossier abajo con 3 pestañas (tocar o deslizar).
//        La línea une el punto activo con su pestaña.
// Entrada desde la lente de rayos X del hero (B4, solo desktop): el esqueleto ya está a la vista,
// así que la barra solo pasa para fijar las miras. reduced-motion → todo directo.

import { gsap } from 'gsap'
import { SplitText } from 'gsap/SplitText'
import { quality } from '../core/quality.js'

gsap.registerPlugin(SplitText)

const iconUrls = import.meta.glob('../../assets/icons/icon_*.png', { eager: true, query: '?url', import: 'default' })
const iconFor = (f) => Object.entries(iconUrls).find(([p]) => p.endsWith('/' + f))?.[1] || ''

const TOOLS = [
  ['Illustrator', 'icon_Illustrator.png'],
  ['Photoshop', 'icon_Photoshop.png'],
  ['After Effects', 'icon_AfterEffects.png'],
  ['Premiere Pro', 'icon_Premiere.png'],
  ['Figma', 'icon_Figma.png'],
  ['Adobe Xd', 'icon_AdobeXd.png'],
  ['Dreamweaver', 'icon_Dreamweaver.png'],
  ['Claude', 'icon_Claude.png'],
  ['Higgsfield', 'icon_Higgsfield.png'],
  ['Kling AI', 'icon_Kling.png'],
  ['Magnific', 'icon_Magnific.png'],
]

const CONTENT = {
  es: {
    title: '¿Quién es Charlie?',
    // (2/8) 2.ª redacción del docx — reemplaza la versión resumida del 1/8
    about:
      'Soy desarrollador, diseñador e ilustrador chileno, con 9 años entre retail, consultoras, productoras y startups. Mi trabajo cruza ilustración de personajes, piezas publicitarias, dirección de marca y motion graphics, sostenido por criterio humano: pensamiento crítico y ojo de diseñador, para decidir qué funciona y cómo puede funcionar mejor. Actualmente uso la IA como otra herramienta en mi flujo creativo sin reducir la calidad de mi trabajo.',
    toolsTitle: 'Herramientas',
    skillsTitle: 'Habilidades',
    skills: [
      'Dirección de arte y desarrollo de marca',
      'Ilustración de personajes y diseño gráfico 2D',
      'Motion graphics y animación',
      'Diseño web y UX/UI',
      'Integración estratégica de IA generativa',
    ],
    // B2: etiqueta anatómica de cada mira · B3: nombre corto de cada pestaña
    tags: { tools: 'CRÁNEO', about: 'TÓRAX', skills: 'CLAVÍCULA' },
    tabs: { about: 'Quién soy', tools: 'Herramientas', skills: 'Habilidades' },
    tablist: 'Secciones de la biografía',
  },
  en: {
    title: 'Who is Charlie?',
    about:
      "I'm a Chilean developer, designer and illustrator with 9 years across retail, consulting, production studios and startups. My work spans character illustration, advertising pieces, brand direction and motion graphics, held together by human judgment: critical thinking and a designer's eye for what works and how it can work better. Recently added generative AI to my creative process without lowering the quality of my work.",
    toolsTitle: 'Tools',
    skillsTitle: 'Skills',
    skills: [
      'Art direction & brand development',
      'Character illustration & 2D graphic design',
      'Motion graphics & animation',
      'Web design & UX/UI',
      'Strategic integration of generative AI tools',
    ],
    tags: { tools: 'SKULL', about: 'THORAX', skills: 'CLAVICLE' },
    tabs: { about: 'About', tools: 'Tools', skills: 'Skills' },
    tablist: 'Biography sections',
  },
}

// Anclas en coordenadas de la IMAGEN (0..1 desde arriba a la izquierda), no de la pantalla: así
// sirven igual con el encuadre contain de desktop y con el cover recortado de celular. Cada una cae
// del lado de su panel para que la línea no cruce el cuerpo (desktop: Quién soy a la izquierda,
// Herramientas y Habilidades a la derecha; celular: el orden de las pestañas).
const IMG = { desktop: [2400, 1465], mobile: [1581, 2810] }
const ANCHORS = {
  desktop: { tools: [0.545, 0.36], about: [0.41, 0.8], skills: [0.6, 0.72] },
  mobile: { tools: [0.604, 0.415], about: [0.3, 0.8], skills: [0.87, 0.74] },
}
// celular: el esqueleto se encuadra en la mitad superior con `cover`; este es el background-position
// vertical de .bio__scene::before en base.css (--bio-pos-y). Tienen que coincidir.
const MOBILE_POS_Y = 0.55
const ORDER = ['about', 'tools', 'skills'] // orden de las pestañas en celular

const SCAN_DUR = 0.8
const GLYPHS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#%&*+=/<>'

// "decodifica" un texto: los caracteres ya resueltos quedan fijos y el resto cambia al azar
function decode(node, text, dur) {
  const o = { p: 0 }
  return gsap.to(o, {
    p: 1,
    duration: dur,
    ease: 'none',
    onUpdate: () => {
      const n = Math.floor(o.p * text.length)
      let s = text.slice(0, n)
      for (let i = n; i < text.length; i++) s += text[i] === ' ' ? ' ' : GLYPHS[(Math.random() * GLYPHS.length) | 0]
      node.textContent = s
    },
    onComplete: () => (node.textContent = text),
  })
}

export function initBio({ lang, isMobile = false }) {
  const el = document.querySelector('.bio')
  if (!el) return null
  const c = CONTENT[lang] || CONTENT.es
  const layout = isMobile ? 'mobile' : 'desktop'
  const scene = el.querySelector('.bio__scene')
  const scan = el.querySelector('.bio__scan')
  const wires = el.querySelector('.bio__wires')
  const locksLayer = el.querySelector('.bio__locks')
  const titleEl = el.querySelector('.bio__title')
  const textEl = el.querySelector('.bio__text')
  const toolsUl = el.querySelector('.bio__tools')
  const skillsUl = el.querySelector('.bio__skills')
  const tabsEl = el.querySelector('.bio__tabs')
  const boxOf = {}
  el.querySelectorAll('.bio__box').forEach((b) => (boxOf[b.dataset.anchor] = b))
  const ringOf = {}
  el.querySelectorAll('.bio__ring').forEach((r) => (ringOf[r.dataset.anchor] = r))

  el.querySelector('.bio__box--tools .bio__box-title').textContent = c.toolsTitle
  el.querySelector('.bio__box--skills .bio__box-title').textContent = c.skillsTitle
  toolsUl.innerHTML = TOOLS.map(
    ([name, file]) =>
      `<li class="bio__tool"><img class="bio__tool-ico" src="${iconFor(file)}" alt="" width="40" height="40" loading="lazy"><span class="bio__tool-name">${name}</span></li>`,
  ).join('')
  skillsUl.innerHTML = c.skills.map((s) => `<li>${s}</li>`).join('')

  // miras (B2): corchetes como los del cursor + etiqueta anatómica
  const lockOf = {}
  const tagOf = {}
  const wireOf = {}
  // desktop: numeradas en el orden en que las cruza la barra (de arriba abajo); celular: en el de
  // las pestañas, que es como se leen ahí
  const byScan = isMobile ? ORDER : [...ORDER].sort((p, q) => ANCHORS[layout][p][1] - ANCHORS[layout][q][1])
  ORDER.forEach((key) => {
    const i = byScan.indexOf(key)
    const lock = document.createElement('div')
    lock.className = 'bio__lock'
    lock.dataset.anchor = key
    lock.innerHTML =
      '<svg viewBox="0 0 32 32"><path d="M1 9V1h8M23 1h8v8M31 23v8h-8M9 31H1v-8"/><rect x="14" y="14" width="4" height="4"/></svg>' +
      `<span class="bio__tag"></span>`
    locksLayer.append(lock)
    lockOf[key] = lock
    tagOf[key] = lock.lastChild
    tagOf[key].dataset.text = `${String(i + 1).padStart(2, '0')} ${c.tags[key]}`
    const wire = document.createElementNS('http://www.w3.org/2000/svg', 'polyline')
    wire.setAttribute('class', 'bio__wire')
    wire.setAttribute('fill', 'none')
    wires.append(wire)
    wireOf[key] = wire
  })

  // pestañas (B3, solo celular)
  const tabOf = {}
  if (isMobile && tabsEl) {
    tabsEl.setAttribute('role', 'tablist')
    tabsEl.setAttribute('aria-label', c.tablist)
    ORDER.forEach((key) => {
      const b = document.createElement('button')
      b.type = 'button'
      b.className = 'bio__tab'
      b.id = `bio-tab-${key}`
      b.dataset.anchor = key
      b.setAttribute('role', 'tab')
      b.setAttribute('aria-controls', `bio-panel-${key}`)
      b.textContent = c.tabs[key]
      tabsEl.append(b)
      tabOf[key] = b
      const box = boxOf[key]
      box.id = `bio-panel-${key}`
      box.setAttribute('role', 'tabpanel')
      box.setAttribute('aria-labelledby', b.id)
    })
  }

  // ── geometría: de coordenadas de imagen a px de la ventana ──
  const pts = {} // key → { x, y } en px de la ventana
  const sceneFrac = {} // key → altura relativa dentro de la escena (0..1), para saber cuándo la cruza la barra
  const measure = () => {
    const sr = scene.getBoundingClientRect()
    const [iw, ih] = IMG[layout]
    const s = Math.max(sr.width / iw, sr.height / ih) // cover (en desktop la escena ya tiene el aspecto de la imagen)
    const dw = iw * s
    const dh = ih * s
    const ox = (sr.width - dw) * 0.5
    const oy = (sr.height - dh) * (isMobile ? MOBILE_POS_Y : 0.5)
    ORDER.forEach((key) => {
      const [ax, ay] = ANCHORS[layout][key]
      const y = oy + ay * dh
      pts[key] = { x: sr.left + ox + ax * dw, y: sr.top + y }
      sceneFrac[key] = y / sr.height
      const ring = ringOf[key]
      if (ring) {
        ring.style.left = `${ox + ax * dw}px`
        ring.style.top = `${y}px`
      }
      lockOf[key].style.left = `${pts[key].x.toFixed(1)}px`
      lockOf[key].style.top = `${pts[key].y.toFixed(1)}px`
    })
  }

  // línea guía. Desktop: diagonal a 45° hacia el panel y horizontal hasta su borde. Celular: diagonal
  // hacia la pestaña y vertical hasta su borde superior.
  const drawWire = (key) => {
    const a = pts[key]
    const wire = wireOf[key]
    if (!a) return
    let d
    if (isMobile) {
      const tr = tabOf[key]?.getBoundingClientRect()
      if (!tr) return
      const tx = tr.left + tr.width / 2
      const dx = tx - a.x
      const run = Math.min(Math.abs(dx), Math.max(0, tr.top - a.y - 30))
      const kx = a.x + Math.sign(dx) * run
      // arranca en el borde del aro (no en su centro) y baja en vertical hasta la pestaña
      d = [a.x, a.y + 18, a.x, tr.top - run, kx, tr.top]
    } else {
      const br = boxOf[key].getBoundingClientRect()
      const left = br.left > a.x // el panel está a la derecha de la mira
      const edge = left ? br.left : br.right
      const gap = Math.abs(edge - a.x)
      const ey = Math.min(Math.max(a.y - 0.1 * innerHeight, br.top + 28), br.bottom - 28)
      const rise = Math.abs(ey - a.y)
      const run = Math.min(rise, Math.max(0, gap - 40)) // deja siempre un tramo horizontal visible
      const dir = left ? 1 : -1
      const sy = Math.sign(ey - a.y) || -1
      d = [a.x + dir * 12, a.y + sy * 12, a.x + dir * run, ey, edge, ey]
    }
    wire.setAttribute('points', d.map((v) => v.toFixed(1)).join(' '))
  }

  const layoutAll = () => {
    wires.setAttribute('viewBox', `0 0 ${innerWidth} ${innerHeight}`)
    measure()
    ORDER.forEach(drawWire)
  }

  // ── estado ──
  let running = [] // animaciones vivas: se matan al preparar/salir
  let split = null
  let active = null
  const track = (a) => (running.push(a), a)

  const wireLen = (w) => (w.getTotalLength ? w.getTotalLength() : 200)
  const hideWire = (w) => {
    const len = wireLen(w)
    w.style.strokeDasharray = len
    w.style.strokeDashoffset = len
  }
  const showWire = (w, dur) => {
    hideWire(w)
    gsap.set(w, { opacity: 1 })
    return dur ? gsap.to(w, { strokeDashoffset: 0, duration: dur, ease: 'power2.inOut' }) : (w.style.strokeDashoffset = 0)
  }

  // deja todo en el estado "apagado" (lo llama el router antes de entrar)
  const prepare = () => {
    running.forEach((a) => a.kill())
    running = []
    split?.revert()
    split = null
    titleEl.textContent = c.title
    textEl.textContent = c.about
    gsap.set(Object.values(boxOf), { opacity: 0, x: 0 })
    gsap.set([...el.querySelectorAll('.bio__tool, .bio__skills li')], { opacity: 0 })
    gsap.set(Object.values(lockOf), { opacity: 0 })
    gsap.set(Object.values(tagOf), { opacity: 0 })
    gsap.set(Object.values(wireOf), { opacity: 0 })
    gsap.set(Object.values(ringOf), { opacity: 0, scale: 1 })
    if (tabsEl) gsap.set(tabsEl, { opacity: 0, y: 0 })
    scene.classList.remove('is-on')
    scene.style.setProperty('--scan', '0%')
    gsap.set(scan, { opacity: 0, top: '0%' })
    active = null
    Object.values(lockOf).forEach((l) => l.classList.remove('is-active'))
  }

  // ── contenido de cada panel ──
  const fillBox = (key, instant) => {
    const box = boxOf[key]
    const kids = key === 'tools' ? el.querySelectorAll('.bio__tool') : key === 'skills' ? el.querySelectorAll('.bio__skills li') : []
    if (instant || quality.reducedMotion) {
      gsap.set(box, { opacity: 1 })
      gsap.set(kids, { opacity: 1 })
      return
    }
    const tl = gsap.timeline()
    // encendido de monitor: 3 escalones rápidos, no un fundido (lento e irregular = WCAG ok)
    tl.fromTo(box, { opacity: 0 }, { keyframes: [{ opacity: 0.7, duration: 0.04 }, { opacity: 0.2, duration: 0.04 }, { opacity: 1, duration: 0.06 }] })
    if (key === 'about') {
      tl.add(decode(titleEl, c.title, 0.3), 0.04)
      split?.revert()
      split = SplitText.create(textEl, { type: 'lines', mask: 'lines' })
      tl.from(split.lines, { yPercent: 100, duration: 0.32, stagger: 0.035, ease: 'power3.out' }, 0.12)
    } else {
      const title = box.querySelector('.bio__box-title')
      tl.add(decode(title, title.textContent, 0.28), 0.04)
      if (key === 'tools') tl.fromTo(kids, { opacity: 0, scale: 0.4 }, { opacity: 1, scale: 1, duration: 0.2, stagger: 0.022, ease: 'back.out(2)' }, 0.1)
      else tl.fromTo(kids, { opacity: 0, x: -10 }, { opacity: 1, x: 0, duration: 0.22, stagger: 0.045 }, 0.1)
    }
    return track(tl)
  }

  // ── DESKTOP: mira que se fija → línea → panel ──
  const lockOn = (key) => {
    const lock = lockOf[key]
    const tag = tagOf[key]
    const tl = gsap.timeline()
    tl.set(lock, { opacity: 1 })
      .fromTo(lock.firstChild, { opacity: 0, scale: 2.4 }, { opacity: 1, scale: 1, duration: 0.2, ease: 'power3.out' }, 0)
      .set(tag, { opacity: 1 }, 0.08)
      .add(decode(tag, tag.dataset.text, 0.22), 0.08)
      .add(showWire(wireOf[key], 0.22), 0.1)
      .add(fillBox(key), 0.28)
    return track(tl)
  }

  // ── CELULAR: un panel a la vez ──
  const setActive = (key, instant = false) => {
    if (key === active) return
    const prev = active
    active = key
    ORDER.forEach((k) => {
      const on = k === key
      tabOf[k]?.setAttribute('aria-selected', String(on))
      tabOf[k]?.setAttribute('tabindex', on ? '0' : '-1')
      tabOf[k]?.classList.toggle('is-active', on)
      ringOf[k]?.classList.toggle('is-active', on)
      ringOf[k]?.setAttribute('aria-pressed', String(on))
      lockOf[k].classList.toggle('is-active', on)
      boxOf[k].hidden = !on
    })
    ORDER.forEach((k) => k !== key && gsap.set(wireOf[k], { opacity: 0 }))
    const tag = tagOf[key]
    gsap.set(Object.values(tagOf), { opacity: 0 })
    gsap.set([lockOf[key], tag], { opacity: 1 })
    if (instant || quality.reducedMotion) {
      tag.textContent = tag.dataset.text
      showWire(wireOf[key], 0)
      fillBox(key, true)
      return
    }
    track(decode(tag, tag.dataset.text, 0.22))
    track(showWire(wireOf[key], 0.26))
    // el panel entra desde el lado hacia el que se avanzó (como al deslizar)
    const dir = prev ? Math.sign(ORDER.indexOf(key) - ORDER.indexOf(prev)) : 0
    const box = boxOf[key]
    if (dir) track(gsap.fromTo(box, { x: dir * 28 }, { x: 0, duration: 0.26, ease: 'power3.out' }))
    fillBox(key)
  }
  if (isMobile) {
    Object.values(ringOf).forEach((r) => r.addEventListener('click', () => setActive(r.dataset.anchor)))
    Object.values(tabOf).forEach((t) => t.addEventListener('click', () => setActive(t.dataset.anchor)))
    // teclado en el tablist: flechas izquierda/derecha (patrón ARIA de pestañas)
    tabsEl?.addEventListener('keydown', (e) => {
      const step = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0
      if (!step) return
      const next = ORDER[(ORDER.indexOf(active) + step + ORDER.length) % ORDER.length]
      setActive(next)
      tabOf[next].focus()
    })
    // deslizar sobre el panel cambia de pestaña
    let sx = 0
    let sy = 0
    el.addEventListener('touchstart', (e) => ([sx, sy] = [e.touches[0].clientX, e.touches[0].clientY]), { passive: true })
    el.addEventListener(
      'touchend',
      (e) => {
        if (!e.target.closest('.bio__box')) return
        const dx = e.changedTouches[0].clientX - sx
        const dy = e.changedTouches[0].clientY - sy
        if (Math.abs(dx) < 50 || Math.abs(dx) < Math.abs(dy) * 1.5) return
        const i = ORDER.indexOf(active) + (dx < 0 ? 1 : -1)
        if (i >= 0 && i < ORDER.length) setActive(ORDER[i])
      },
      { passive: true },
    )
  }

  // ── B1: barra de escaneo ──
  // xray = true → llega desde la lente del hero: el esqueleto ya se ve completo y la barra solo fija
  // las miras.
  const runScan = (onCross, xray) => {
    const o = { p: 0 }
    const crossed = new Set()
    gsap.set(scan, { opacity: 1 })
    return track(
      gsap.to(o, {
        p: 1,
        duration: SCAN_DUR,
        ease: 'none',
        onUpdate: () => {
          const pct = `${(o.p * 100).toFixed(2)}%`
          if (!xray) scene.style.setProperty('--scan', pct)
          scan.style.top = pct
          ORDER.forEach((k) => {
            if (!crossed.has(k) && o.p >= sceneFrac[k]) {
              crossed.add(k)
              onCross(k)
            }
          })
        },
        onComplete: () => {
          scene.style.setProperty('--scan', '100%')
          ORDER.forEach((k) => !crossed.has(k) && onCross(k)) // por si una mira quedó fuera de la escena
          track(gsap.to(scan, { opacity: 0, duration: 0.2 }))
        },
      }),
    )
  }

  const reveal = ({ xray = false } = {}) => {
    layoutAll()
    scene.classList.add('is-on')
    if (quality.reducedMotion) {
      scene.style.setProperty('--scan', '100%')
      if (isMobile) {
        gsap.set(Object.values(ringOf), { opacity: 1 })
        gsap.set(tabsEl, { opacity: 1 })
        setActive('about', true)
      } else {
        ORDER.forEach((k) => {
          gsap.set([lockOf[k], tagOf[k]], { opacity: 1 })
          tagOf[k].textContent = tagOf[k].dataset.text
          showWire(wireOf[k], 0)
          fillBox(k, true)
        })
      }
      return
    }
    if (xray) scene.style.setProperty('--scan', '100%')
    if (!isMobile) return runScan(lockOn, xray)
    // celular: los puntos aparecen al pasar la barra; al terminar sube el dossier con "Quién soy"
    ORDER.forEach((k) => (boxOf[k].hidden = true))
    runScan((k) => track(gsap.fromTo(ringOf[k], { opacity: 0, scale: 2 }, { opacity: 1, scale: 1, duration: 0.22, ease: 'power3.out' })))
    track(
      gsap.fromTo(
        tabsEl,
        { opacity: 0, y: 24 },
        { opacity: 1, y: 0, duration: 0.3, ease: 'power3.out', delay: SCAN_DUR * 0.75, onStart: () => setActive('about') },
      ),
    )
  }

  // salida: se apagan paneles, líneas y miras; después la barra sube borrando el esqueleto. Con
  // lens = true (vuelta a Inicio por la lente del hero, desktop) el esqueleto se queda: la lente lo
  // cierra en el shader.
  const leave = (onDone, { lens = false } = {}) => {
    running.forEach((a) => a.kill())
    running = []
    if (quality.reducedMotion) {
      onDone?.()
      return
    }
    const parts = [...Object.values(boxOf), ...Object.values(lockOf), ...Object.values(wireOf), ...Object.values(ringOf), tabsEl].filter(Boolean)
    gsap.to(parts, {
      opacity: 0,
      duration: 0.18,
      ease: 'power2.in',
      onComplete: () => {
        if (lens) return onDone?.()
        const o = { p: 1 }
        gsap.set(scan, { opacity: 1 })
        gsap.to(o, {
          p: 0,
          duration: 0.45,
          ease: 'power1.in',
          onUpdate: () => {
            const pct = `${(o.p * 100).toFixed(2)}%`
            scene.style.setProperty('--scan', pct)
            scan.style.top = pct
          },
          onComplete: () => onDone?.(),
        })
      },
    })
  }

  // al redimensionar: reubica miras/líneas (sin animar) y el párrafo vuelve a partir líneas solo
  let rt
  addEventListener(
    'resize',
    () => {
      clearTimeout(rt)
      rt = setTimeout(() => {
        if (el.hidden) return
        split?.revert()
        split = null
        layoutAll()
        ORDER.forEach((k) => (wireOf[k].style.strokeDasharray = 'none'))
      }, 150)
    },
    { passive: true },
  )

  return { el, prepare, reveal, leave }
}
