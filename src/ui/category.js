// category.js — P3.B: página de categoría (billboard del callejón). Muestra las obras de
// una categoría dentro del lienzo del letrero, con flechas para navegar, caja de descripción
// y secuencia de "encendido" (las lámparas iluminan el lienzo). Data-driven desde casos.json.

import { gsap } from 'gsap'
import { quality } from '../core/quality.js'
import casos from '../../files/proyectos/casos.json'

// URLs de la media OPTIMIZADA (solo los slugs de nivel superior; los originales viven en _src/)
const mediaUrls = import.meta.glob('../../assets/proyectos/*/*.{jpg,png,mp4}', {
  eager: true,
  query: '?url',
  import: 'default',
})
const urlFor = (file) => {
  const hit = Object.entries(mediaUrls).find(([p]) => p.endsWith('/' + file))
  return hit ? hit[1] : ''
}

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
  const counterEl = el.querySelector('.cat__counter')
  const prevBtn = el.querySelector('.cat__arrow--prev')
  const nextBtn = el.querySelector('.cat__arrow--next')
  const reveal = [...el.querySelectorAll('.cat__reveal')] // flechas, caja, volver → aparecen tras el encendido

  let items = []
  let idx = 0

  const render = () => {
    const it = items[idx]
    if (!it) return
    canvas.querySelectorAll('video').forEach((v) => v.pause())
    canvas.textContent = ''
    let node
    if (it.type === 'video') {
      node = document.createElement('video')
      node.src = urlFor(it.media)
      node.muted = true
      node.loop = true
      node.autoplay = true
      node.playsInline = true
      node.setAttribute('playsinline', '')
      node.play?.().catch(() => {})
    } else {
      node = document.createElement('img')
      node.src = urlFor(it.media)
      node.alt = it.title[lang]
      node.loading = 'lazy'
    }
    node.className = 'cat__media'
    canvas.appendChild(node)
    titleEl.textContent = it.title[lang]
    descEl.textContent = it.desc[lang]
    tagsEl.innerHTML = it.tags.map((t) => `<li>${t}</li>`).join('')
    if (counterEl) counterEl.textContent = `${idx + 1} / ${items.length}`
  }

  const move = (d) => {
    if (!items.length) return
    idx = (idx + d + items.length) % items.length
    render()
  }
  prevBtn?.addEventListener('click', (e) => {
    e.preventDefault()
    move(-1)
  })
  nextBtn?.addEventListener('click', (e) => {
    e.preventDefault()
    move(1)
  })

  // poblar SIN encender (lámparas apagadas, chrome oculto) — lo llama el router antes del zoom
  const prepare = (cat) => {
    items = casos[cat] || []
    idx = 0
    if (nameEl) nameEl.textContent = CAT_TITLE[cat]?.[lang] || ''
    render()
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

  return { el, prepare, lightOn, reset, catTitle: (cat) => CAT_TITLE[cat]?.[lang] || '' }
}
