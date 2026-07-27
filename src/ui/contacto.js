// contacto.js — P3.D: página Contacto (azotea). Video loop de fondo + panel capa-OS con los
// datos de contacto + letrero "Inicio" horizontal (apagado; enciende al hover) como capa aparte
// del video. El video solo se reproduce mientras Contacto está activo (play/pause por el router).
// reduced-motion → poster estático (sin reproducir). ART_DIR §6.5 / ADENDUM §5.

import { gsap } from 'gsap'
import { quality } from '../core/quality.js'
import webmUrl from '../../assets/efecto-loop/contacto_loop_1080.webm'
import mp4Url from '../../assets/efecto-loop/contacto_loop_1080_h264.mp4'
import posterUrl from '../../assets/efecto-loop/contacto_poster.webp'

const CONTENT = {
  es: { tagline: '¿Necesitas crear algo impresionante?' },
  en: { tagline: 'Need to create something amazing?' },
}
// links reales (los abre el usuario con su clic; wa.me/linkedin en pestaña nueva)
const LINKS = [
  { label: 'WhatsApp', value: '+56 9 9473 8880', href: 'https://wa.me/56994738880', ext: true },
  { label: 'Email', value: 'c.perez.grafica@gmail.com', href: 'mailto:c.perez.grafica@gmail.com', ext: false },
  { label: 'LinkedIn', value: '/in/charlie-pixelz', href: 'https://www.linkedin.com/in/charlie-pixelz', ext: true },
]

export function initContacto({ lang }) {
  const el = document.querySelector('.contacto')
  if (!el) return null
  const c = CONTENT[lang] || CONTENT.es
  const video = el.querySelector('.contacto__video')
  const taglineEl = el.querySelector('.contacto__tagline')
  const linksUl = el.querySelector('.contacto__links')
  const crumb = el.querySelector('.contacto__crumb')
  const panel = el.querySelector('.contacto__panel')

  // fuentes del video (preload none: solo baja al entrar). poster estático mientras tanto.
  video.poster = posterUrl
  video.innerHTML = `<source src="${webmUrl}" type="video/webm"><source src="${mp4Url}" type="video/mp4">`

  // contenido (la tagline hace de título de la caja; el nombre "Contacto" va en el breadcrumb)
  taglineEl.textContent = c.tagline
  linksUl.innerHTML = LINKS.map(
    (l) =>
      `<li><a class="contacto__link" href="${l.href}"${l.ext ? ' target="_blank" rel="noopener"' : ''}>` +
      `<span class="contacto__link-label">${l.label}</span>` +
      `<span class="contacto__link-value">${l.value}</span></a></li>`,
  ).join('')

  const revealTargets = [panel, crumb]

  const prepare = () => {
    gsap.set(revealTargets, { opacity: 0 })
    gsap.set(el.querySelectorAll('.contacto__link'), { opacity: 0 })
  }

  // glitch breve al reiniciar el loop del video (loop no perfecto → camuflamos la costura).
  // 'timeupdate' no da el punto exacto, pero basta con dispararlo al acercarse al final.
  let glitched = false
  video.addEventListener('timeupdate', () => {
    if (quality.reducedMotion || !video.duration) return
    const remain = video.duration - video.currentTime
    if (remain > 0.5) glitched = false
    if (remain < 0.16 && !glitched) {
      glitched = true
      video.classList.remove('is-glitch')
      void video.offsetWidth // reinicia la animación
      video.classList.add('is-glitch')
      setTimeout(() => video.classList.remove('is-glitch'), 280)
    }
  })

  // arranca el video (durante el barrido). muted → autoplay permitido. reduced-motion = poster fijo.
  const enter = () => {
    if (!quality.reducedMotion) video.play?.().catch(() => {})
  }

  // reveal del panel + letrero (tras el barrido a la azotea)
  const reveal = () => {
    if (quality.reducedMotion) {
      gsap.set(revealTargets, { opacity: 1, y: 0 })
      gsap.set(el.querySelectorAll('.contacto__link'), { opacity: 1 })
      return
    }
    gsap
      .timeline()
      .fromTo(panel, { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 0.5, ease: 'power2.out' })
      .to(el.querySelectorAll('.contacto__link'), { opacity: 1, x: 0, duration: 0.35, stagger: 0.1, startAt: { x: -14 } }, '-=0.2')
      .fromTo(crumb, { opacity: 0, y: -10 }, { opacity: 1, y: 0, duration: 0.4, ease: 'power2.out' }, '-=0.35')
  }

  const leave = () => {
    video.pause?.()
  }

  return { el, prepare, enter, reveal, leave }
}
