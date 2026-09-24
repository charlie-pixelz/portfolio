// category.js — P3.B: página de categoría (billboard del callejón). Muestra las obras de
// una categoría dentro del lienzo del letrero, con flechas para navegar, caja de descripción
// y secuencia de "encendido" (las lámparas iluminan el lienzo). Data-driven desde casos.json.

import { gsap } from 'gsap'
import { quality } from '../core/quality.js'
import casos from '../../files/proyectos/casos.json'

// Media OPTIMIZADA (la genera `npm run media`; los originales viven en _src/, fuera del bundle).
// Se indexa por id ("ia-3") con todas sus variantes: avif/webp (+ jpg/png del máster como último
// respaldo) para imágenes, mp4 + poster para videos. casos.json acepta "ia-3" o "ia-3.mp4".
const files = import.meta.glob('../../assets/proyectos/*/*.{avif,webp,jpg,png,mp4}', {
  eager: true,
  query: '?url',
  import: 'default',
})
const media = {}
for (const [path, url] of Object.entries(files)) {
  const m = /^(.+?)(-poster)?\.(\w+)$/.exec(path.split('/').pop())
  if (!m) continue
  const e = (media[m[1]] ||= {})
  if (m[2]) e.poster = url
  else e[m[3]] = url
}
const idOf = (file) => file.replace(/\.\w+$/, '')
const srcOf = (it) => media[idOf(it.media)] || {}

const CAT_TITLE = {
  ilustracion: { es: 'Ilustraciones', en: 'Illustrations' },
  motion: { es: 'Diseño Audiovisual', en: 'Motion Design' },
  web: { es: 'Diseño Web', en: 'Web Design' },
  ia: { es: 'Proyectos con IA', en: 'AI Projects' },
}

export function initCategory({ lang }) {
  const el = document.querySelector('.category')
  if (!el) return null
  const canvas = el.querySelector('.cat__canvas')
  const luces = el.querySelector('.cat__luces')
  const nameEl = el.querySelector('.cat__name')
  const titleEl = el.querySelector('.cat__title')
  const descEl = el.querySelector('.cat__desc')
  const tagsEl = el.querySelector('.cat__tags')
  const linkEl = el.querySelector('.cat__link')
  const counterEl = el.querySelector('.cat__counter')
  const prevBtn = el.querySelector('.cat__arrow--prev')
  const nextBtn = el.querySelector('.cat__arrow--next')
  const reveal = [...el.querySelectorAll('.cat__reveal')] // flechas, caja, volver → aparecen tras el encendido

  // botón de audio (solo obras con sonido). Se crea una vez; render() lo muestra/oculta.
  const muteBtn = document.createElement('button')
  muteBtn.className = 'cat__mute cat__reveal'
  muteBtn.hidden = true
  muteBtn.type = 'button'
  el.querySelector('.cat__stage')?.appendChild(muteBtn)
  reveal.push(muteBtn)
  let currentMedia = null
  const muteLabel = { es: { on: 'Silenciar', off: 'Activar sonido' }, en: { on: 'Mute', off: 'Unmute' } }
  const setMuted = (m) => {
    if (!currentMedia) return
    currentMedia.muted = m
    muteBtn.classList.toggle('is-muted', m)
    muteBtn.setAttribute('aria-label', m ? muteLabel[lang].off : muteLabel[lang].on)
  }
  muteBtn.addEventListener('click', (e) => {
    e.preventDefault()
    const wasMuted = currentMedia?.muted
    setMuted(!wasMuted)
    if (wasMuted && currentMedia) {
      // al activar el sonido, reinicia la pieza desde el principio
      currentMedia.currentTime = 0
      currentMedia.play?.().catch(() => {})
    }
  })

  let items = []
  let idx = 0

  // construye la media de una obra. Devuelve { node, el }: `node` va al DOM (un <picture> en las
  // imágenes, para que el navegador elija AVIF → WebP → JPG) y `el` es el <img>/<video> que se estiliza.
  // blur=true → copia decorativa para el relleno.
  const makeMedia = (it, blur) => {
    const s = srcOf(it)
    let el
    let node
    if (it.type === 'video') {
      el = node = document.createElement('video')
      el.muted = true
      el.loop = true
      el.autoplay = true
      el.playsInline = true
      el.setAttribute('playsinline', '')
      if (s.poster) el.poster = s.poster // primer frame al instante, sin lienzo negro mientras carga
      el.src = s.mp4 || ''
      el.play?.().catch(() => {})
    } else {
      node = document.createElement('picture')
      if (s.avif) node.append(Object.assign(document.createElement('source'), { type: 'image/avif', srcset: s.avif }))
      if (s.webp) node.append(Object.assign(document.createElement('source'), { type: 'image/webp', srcset: s.webp }))
      el = document.createElement('img')
      el.decoding = 'async'
      node.append(el)
      // el src va DESPUÉS de meter el <img> en el <picture>: si no, arranca bajando el JPG antes de
      // ver los <source> y termina descargando dos formatos
      el.src = s.jpg || s.png || s.webp || ''
    }
    if (blur) el.setAttribute('aria-hidden', 'true')
    else if (it.type === 'image') el.alt = it.title[lang]
    return { node, el }
  }

  // precarga liviana de una obra: la imagen en el formato que se va a usar, o el poster del video
  // (el video en sí arranca por streaming al mostrarse — faststart — y el poster tapa la espera)
  const preloaded = new Set()
  const preloadItem = (it) => {
    if (!it || preloaded.has(it.media)) return
    preloaded.add(it.media)
    if (it.type === 'video') {
      const p = srcOf(it).poster
      if (p) new Image().src = p
    } else {
      makeMedia(it, false) // <picture> suelto: descarga el mismo formato que elegirá al mostrarse
    }
  }
  const preloadNeighbors = () => {
    if (items.length < 2) return
    preloadItem(items[(idx + 1) % items.length])
    preloadItem(items[(idx - 1 + items.length) % items.length])
  }

  const render = () => {
    const it = items[idx]
    if (!it) return
    canvas.querySelectorAll('video').forEach((v) => v.pause())
    canvas.textContent = ''

    // relleno de las zonas vacías (obras que no calzan con el lienzo horizontal, p. ej. verticales):
    // copia del mismo medio en "cover" borroso ("relleno de la obra"), o un color fijo (it.bg).
    const heavy = quality.tier !== 'low'
    if (it.bg) {
      const fill = document.createElement('div')
      fill.className = 'cat__fill'
      fill.style.background = it.bg
      canvas.appendChild(fill)
    } else if (it.type === 'image' || heavy) {
      const fill = makeMedia(it, true)
      fill.el.className = 'cat__fill cat__fill--media'
      canvas.appendChild(fill.node)
    } else {
      const fill = document.createElement('div')
      fill.className = 'cat__fill' // fallback oscuro (CSS) en tier bajo con video
      canvas.appendChild(fill)
    }

    // media principal (contain por defecto; it.fit:"cover" para un recorte sutil)
    const { node, el: media } = makeMedia(it, false)
    media.className = 'cat__media'
    if (it.fit === 'cover') media.classList.add('cat__media--cover')
    canvas.appendChild(node)
    currentMedia = it.type === 'video' ? media : null
    preloaded.add(it.media)

    // botón de audio solo si la obra tiene sonido (it.sound)
    if (it.type === 'video' && it.sound) {
      muteBtn.hidden = false
      setMuted(true)
    } else {
      muteBtn.hidden = true
    }

    titleEl.textContent = it.title[lang]
    descEl.textContent = it.desc[lang]
    tagsEl.innerHTML = it.tags.map((t) => `<li>${t}</li>`).join('')
    if (counterEl) counterEl.textContent = `${idx + 1} / ${items.length}`
    if (linkEl) {
      if (it.link) {
        linkEl.href = it.link
        linkEl.hidden = false
      } else {
        linkEl.hidden = true
        linkEl.removeAttribute('href')
      }
    }
  }

  const move = (d) => {
    if (!items.length) return
    idx = (idx + d + items.length) % items.length
    render()
    preloadNeighbors()
  }
  prevBtn?.addEventListener('click', (e) => {
    e.preventDefault()
    move(-1)
  })
  nextBtn?.addEventListener('click', (e) => {
    e.preventDefault()
    move(1)
  })
  // teclado (← →) y swipe horizontal en touch: lo esperable en un carrusel, sin tocar la UI
  document.addEventListener('keydown', (e) => {
    if (el.hidden || e.altKey || e.metaKey || e.ctrlKey || /input|textarea|select/i.test(e.target.tagName)) return
    if (e.key === 'ArrowRight') move(1)
    else if (e.key === 'ArrowLeft') move(-1)
  })
  let sx = 0
  let sy = 0
  const stage = el.querySelector('.cat__stage')
  stage?.addEventListener('touchstart', (e) => ({ clientX: sx, clientY: sy } = e.touches[0]), { passive: true })
  stage?.addEventListener(
    'touchend',
    (e) => {
      const t = e.changedTouches[0]
      const dx = t.clientX - sx
      if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(t.clientY - sy) * 1.5) move(dx < 0 ? 1 : -1)
    },
    { passive: true },
  )

  // poblar SIN encender (lámparas apagadas, chrome oculto) — lo llama el router antes del zoom
  const prepare = (cat) => {
    items = casos[cat] || []
    idx = 0
    if (nameEl) nameEl.textContent = CAT_TITLE[cat]?.[lang] || ''
    render()
    preloadNeighbors()
    gsap.set(luces, { opacity: 0 })
    gsap.set(reveal, { opacity: 0, y: 10 })
  }

  // secuencia de encendido: flicker cálido de las lámparas → aparece el chrome
  const lightOn = () => {
    if (quality.reducedMotion) {
      gsap.set(luces, { opacity: 1 })
      gsap.set(reveal, { opacity: 1, y: 0 })
      return
    }
    gsap
      .timeline()
      .to(luces, { opacity: 0.4, duration: 0.07 })
      .to(luces, { opacity: 0.06, duration: 0.06 })
      .to(luces, { opacity: 0.75, duration: 0.05 })
      .to(luces, { opacity: 0.18, duration: 0.07 })
      .to(luces, { opacity: 1, duration: 0.55, ease: 'power2.out' })
      .to(reveal, { opacity: 1, y: 0, duration: 0.35, stagger: 0.07 }, '-=0.2')
  }

  const reset = () => {
    canvas.querySelectorAll('video').forEach((v) => v.pause())
  }

  // intención de entrar a Proyectos (hover/clic del letrero): se precarga SOLO la primera obra de
  // cada categoría — la que se ve al abrirla —; el resto llega de a una (la anterior y la siguiente
  // a la que se está mirando). Antes se precargaba TODA la galería (~8 MB con 16 casos): así el
  // costo de entrada ya no crece con la cantidad de casos.
  let warmed = false
  const warm = () => {
    if (warmed) return
    warmed = true
    Object.values(casos).forEach((list) => preloadItem(list[0]))
  }

  return { el, prepare, lightOn, reset, warm, catTitle: (cat) => CAT_TITLE[cat]?.[lang] || '' }
}
