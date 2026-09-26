// viewer.js — G1 (revisión 25/9): visor a pantalla completa de la galería. Clic en la obra → crece
// desde el letrero hasta llenar la pantalla sobre fondo void (por encima del CRT: acá se evalúa el
// detalle). En imágenes: zoom con rueda, pellizco o doble clic, y arrastre para moverse. Flechas,
// teclado, deslizar y Esc funcionan igual que en la galería.
//
// El visor no crea su propia copia de la obra: TOMA PRESTADO el nodo que está en el letrero (el
// <picture> o el <video>) y lo devuelve al cerrar. Así un video sigue donde iba, con su sonido, y no
// se descarga nada dos veces. category.js decide qué obra se muestra; el visor solo presenta.

import { gsap } from 'gsap'
import { quality } from '../core/quality.js'

const TXT = {
  es: {
    dialog: 'Visor de obra',
    close: 'Cerrar visor',
    prev: 'Obra anterior',
    next: 'Obra siguiente',
    hintImg: 'Rueda o pellizco para ampliar · arrastra para moverte · Esc para cerrar',
    hintTouch: 'Pellizca para ampliar · desliza para cambiar de obra',
    hint: 'Esc para cerrar',
  },
  en: {
    dialog: 'Artwork viewer',
    close: 'Close viewer',
    prev: 'Previous work',
    next: 'Next work',
    hintImg: 'Scroll or pinch to zoom · drag to pan · Esc to close',
    hintTouch: 'Pinch to zoom · swipe to change work',
    hint: 'Esc to close',
  },
}
const MAX_ZOOM = 4

// rectángulo de una media de proporción w/h encajada (contain) dentro de r
const fitRect = (w, h, r) => {
  const s = Math.min(r.width / w, r.height / h)
  const W = w * s
  const H = h * s
  return { left: r.left + (r.width - W) / 2, top: r.top + (r.height - H) / 2, width: W, height: H }
}

export function createViewer({ lang, onNav, onClose }) {
  const t = TXT[lang] || TXT.es
  const root = document.createElement('div')
  root.className = 'viewer'
  root.tabIndex = -1 // recibe el foco al hacer clic en la obra: el teclado sigue llegando al visor
  root.hidden = true
  root.setAttribute('role', 'dialog')
  root.setAttribute('aria-modal', 'true')
  root.setAttribute('aria-label', t.dialog)
  root.innerHTML =
    '<div class="viewer__bg"></div>' +
    '<div class="viewer__box"><div class="viewer__zoom"></div></div>' +
    `<button class="viewer__close" type="button" aria-label="${t.close}">✕</button>` +
    `<button class="viewer__arrow viewer__arrow--prev" type="button" aria-label="${t.prev}"></button>` +
    `<button class="viewer__arrow viewer__arrow--next" type="button" aria-label="${t.next}"></button>` +
    '<p class="viewer__caption"><span class="viewer__title"></span><span class="viewer__count"></span></p>' +
    '<p class="viewer__hint" aria-hidden="true"></p>'
  document.body.append(root)
  const bg = root.querySelector('.viewer__bg')
  const box = root.querySelector('.viewer__box')
  const zoomEl = root.querySelector('.viewer__zoom')
  const closeBtn = root.querySelector('.viewer__close')
  const prevBtn = root.querySelector('.viewer__arrow--prev')
  const nextBtn = root.querySelector('.viewer__arrow--next')
  const titleEl = root.querySelector('.viewer__title')
  const countEl = root.querySelector('.viewer__count')
  const hintEl = root.querySelector('.viewer__hint')
  const ui = [closeBtn, prevBtn, nextBtn, root.querySelector('.viewer__caption')]

  let isOpen = false
  let busy = false
  let media = null // <img>/<video> prestado
  let node = null // su contenedor (el <picture> en imágenes)
  let zoomable = false
  let nat = { w: 16, h: 9 }
  let returnFocus = null
  const z = { s: 1, x: 0, y: 0 }

  const naturalOf = (m) => {
    const w = m.naturalWidth || m.videoWidth
    const h = m.naturalHeight || m.videoHeight
    return w && h ? { w, h } : { w: 16, h: 9 }
  }
  // zona útil: márgenes chicos y espacio abajo para el título
  const area = () => {
    const m = Math.round(Math.min(innerWidth, innerHeight) * 0.04)
    return { left: m, top: m, width: innerWidth - 2 * m, height: innerHeight - 2 * m - 44 }
  }
  const place = () => {
    const r = fitRect(nat.w, nat.h, area())
    Object.assign(box.style, { left: `${r.left}px`, top: `${r.top}px`, width: `${r.width}px`, height: `${r.height}px` })
    return r
  }

  // ── zoom / arrastre (solo imágenes) ──
  const applyZoom = (animate) => {
    const w = box.offsetWidth
    const h = box.offsetHeight
    // no dejar que la imagen se despegue del recuadro: el borde nunca pasa al interior
    const mx = (w * (z.s - 1)) / 2
    const my = (h * (z.s - 1)) / 2
    z.x = Math.max(-mx, Math.min(mx, z.x))
    z.y = Math.max(-my, Math.min(my, z.y))
    const vars = { x: z.x, y: z.y, scale: z.s }
    if (animate && !quality.reducedMotion) gsap.to(zoomEl, { ...vars, duration: 0.3, ease: 'power3.out' })
    else gsap.set(zoomEl, vars)
    root.classList.toggle('is-zoomed', z.s > 1.01)
  }
  // zoom manteniendo fijo el punto (px, py) de la pantalla
  const zoomAt = (s, px, py, animate) => {
    const r = box.getBoundingClientRect()
    const cx = px - (r.left + r.width / 2)
    const cy = py - (r.top + r.height / 2)
    const next = Math.max(1, Math.min(MAX_ZOOM, s))
    z.x = cx - ((cx - z.x) * next) / z.s
    z.y = cy - ((cy - z.y) * next) / z.s
    z.s = next
    applyZoom(animate)
  }
  const resetZoom = () => {
    z.s = 1
    z.x = 0
    z.y = 0
    gsap.killTweensOf(zoomEl)
    gsap.set(zoomEl, { x: 0, y: 0, scale: 1 })
    root.classList.remove('is-zoomed')
  }

  root.addEventListener(
    'wheel',
    (e) => {
      if (!isOpen) return
      e.preventDefault()
      if (zoomable) zoomAt(z.s * Math.exp(-e.deltaY * 0.0015), e.clientX, e.clientY)
    },
    { passive: false },
  )
  // con la captura del puntero, el target de los eventos es siempre el visor: "sobre la obra" se
  // decide por coordenadas
  const inBox = (x, y) => {
    const r = box.getBoundingClientRect()
    return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom
  }
  root.addEventListener('dblclick', (e) => zoomable && inBox(e.clientX, e.clientY) && zoomAt(z.s > 1.01 ? 1 : 2.5, e.clientX, e.clientY, true))

  // punteros: 1 dedo/mouse = arrastrar (con zoom) o deslizar para cambiar de obra (sin zoom);
  // 2 dedos = pellizco
  const ptrs = new Map()
  let start = null
  root.addEventListener('pointerdown', (e) => {
    if (!isOpen || e.target.closest('button')) return
    ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY })
    try {
      root.setPointerCapture(e.pointerId)
    } catch {
      /* puntero ya inactivo: se sigue sin captura */
    }
    const [a, b] = [...ptrs.values()]
    start = { x: e.clientX, y: e.clientY, zx: z.x, zy: z.y, zs: z.s, dist: b ? Math.hypot(a.x - b.x, a.y - b.y) : 0, moved: false }
  })
  root.addEventListener('pointermove', (e) => {
    if (!start || !ptrs.has(e.pointerId)) return
    ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY })
    const pts = [...ptrs.values()]
    if (pts.length === 2 && zoomable) {
      const d = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y)
      if (start.dist) zoomAt((start.zs * d) / start.dist, (pts[0].x + pts[1].x) / 2, (pts[0].y + pts[1].y) / 2)
      start.moved = true
    } else if (pts.length === 1 && z.s > 1.01) {
      z.x = start.zx + (e.clientX - start.x)
      z.y = start.zy + (e.clientY - start.y)
      applyZoom()
      start.moved = true
    }
  })
  const end = (e) => {
    if (!ptrs.has(e.pointerId)) return
    ptrs.delete(e.pointerId)
    if (!start) return
    if (ptrs.size === 0) {
      const dx = e.clientX - start.x
      const dy = e.clientY - start.y
      // deslizar sin zoom = cambiar de obra
      if (!start.moved && z.s <= 1.01 && Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) onNav(dx < 0 ? 1 : -1)
      // toque en el fondo (fuera de la obra), sin arrastre = cerrar
      else if (!start.moved && Math.hypot(dx, dy) < 6 && !inBox(e.clientX, e.clientY)) onClose()
      start = null
    } else {
      // queda un dedo tras un pellizco: sigue arrastrando desde acá, sin salto
      const [p] = ptrs.values()
      start = { x: p.x, y: p.y, zx: z.x, zy: z.y, zs: z.s, dist: 0, moved: true }
    }
  }
  root.addEventListener('pointerup', end)
  root.addEventListener('pointercancel', end)

  closeBtn.addEventListener('click', () => onClose())
  prevBtn.addEventListener('click', () => onNav(-1))
  nextBtn.addEventListener('click', () => onNav(1))
  root.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') onClose()
    else if (e.key === 'ArrowRight') onNav(1)
    else if (e.key === 'ArrowLeft') onNav(-1)
    else if (e.key === 'Tab') {
      // foco atrapado en el visor (es un diálogo modal)
      const f = [closeBtn, prevBtn, nextBtn].filter((b) => !b.hidden)
      const i = f.indexOf(document.activeElement)
      e.preventDefault()
      f[(i + (e.shiftKey ? -1 : 1) + f.length) % f.length].focus()
    } else return
    e.preventDefault()
    e.stopPropagation()
  })
  addEventListener(
    'resize',
    () => {
      if (!isOpen) return
      place()
      resetZoom()
    },
    { passive: true },
  )

  const setContent = (m, n, meta) => {
    media = m
    node = n
    zoomable = m.tagName === 'IMG'
    nat = naturalOf(m)
    zoomEl.replaceChildren(n)
    titleEl.textContent = meta.title
    countEl.textContent = meta.count > 1 ? `${meta.index + 1} / ${meta.count}` : ''
    prevBtn.hidden = nextBtn.hidden = meta.count < 2
    hintEl.textContent = zoomable ? (quality.isTouch ? t.hintTouch : t.hintImg) : t.hint
    resetZoom()
    // si la imagen todavía no terminó de cargar, reencuadra cuando sepa su tamaño
    if (zoomable && !m.naturalWidth) m.addEventListener('load', () => media === m && ((nat = naturalOf(m)), place()), { once: true })
    if (!zoomable && !m.videoWidth) m.addEventListener('loadedmetadata', () => media === m && ((nat = naturalOf(m)), place()), { once: true })
  }

  // abre el visor con la obra `m` (dentro de `n`), que hoy se ve en `fromRect` (el lienzo). Al
  // cerrar, el foco vuelve a `returnTo` (con mouse el lienzo no queda enfocado al hacer clic)
  const open = (m, n, meta, fromRect, returnTo) => {
    if (isOpen || busy) return
    isOpen = true
    busy = true
    returnFocus = returnTo || document.activeElement
    root.hidden = false
    document.body.classList.add('viewer-open')
    setContent(m, n, meta)
    const r = place()
    closeBtn.focus({ preventScroll: true })
    const from = fitRect(nat.w, nat.h, fromRect)
    const done = () => (busy = false)
    if (quality.reducedMotion) {
      gsap.set([bg, ...ui], { opacity: 1 })
      return done()
    }
    gsap.fromTo(
      box,
      { x: from.left - r.left, y: from.top - r.top, scale: from.width / r.width, transformOrigin: '0 0' },
      { x: 0, y: 0, scale: 1, duration: 0.55, ease: 'expo.out', onComplete: done },
    )
    gsap.fromTo(bg, { opacity: 0 }, { opacity: 1, duration: 0.3 })
    gsap.fromTo(ui, { opacity: 0 }, { opacity: 1, duration: 0.25, delay: 0.25 })
    gsap.fromTo(hintEl, { opacity: 0 }, { opacity: 1, duration: 0.3, delay: 0.4 })
    gsap.to(hintEl, { opacity: 0, duration: 0.6, delay: 3.2 })
  }

  // cambia de obra sin cerrar (flechas/teclado/deslizar)
  const update = (m, n, meta) => {
    if (!isOpen) return
    setContent(m, n, meta)
    place()
    if (!quality.reducedMotion) gsap.fromTo(box, { opacity: 0 }, { opacity: 1, duration: 0.2 })
  }

  // cierra volviendo al lienzo (`toRect`); `giveBack(node)` devuelve la obra a su lugar. instant:
  // sin animación (el router se va a otra vista con el visor abierto)
  const close = (toRect, giveBack, instant = false) => {
    if (!isOpen) return
    const finish = () => {
      isOpen = false
      busy = false
      root.hidden = true
      document.body.classList.remove('viewer-open')
      gsap.set(box, { clearProps: 'transform,opacity' })
      resetZoom()
      const n = node
      media = node = null
      giveBack(n)
      if (!instant) returnFocus?.focus?.({ preventScroll: true })
    }
    if (instant || quality.reducedMotion || !toRect) return finish()
    busy = true
    const r = box.getBoundingClientRect()
    const to = fitRect(nat.w, nat.h, toRect)
    resetZoom()
    gsap.to(ui, { opacity: 0, duration: 0.15 })
    gsap.to(bg, { opacity: 0, duration: 0.35, delay: 0.1 })
    gsap.to(box, {
      x: to.left - r.left,
      y: to.top - r.top,
      scale: to.width / r.width,
      transformOrigin: '0 0',
      duration: 0.45,
      ease: 'expo.inOut',
      onComplete: finish,
    })
  }

  return { open, update, close, isOpen: () => isOpen }
}
