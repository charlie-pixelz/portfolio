// contacto.js — P3.D: página Contacto (azotea). Video loop de fondo + panel capa-OS con los
// datos de contacto + letrero "Inicio" horizontal (apagado; enciende al hover) como capa aparte
// del video. El video solo se reproduce mientras Contacto está activo (play/pause por el router).
// reduced-motion → poster estático (sin reproducir). ART_DIR §6.5 / ADENDUM §5.

import { gsap } from 'gsap'
import { quality } from '../core/quality.js'
import { sfx } from '../core/sound.js'
import webmUrl from '../../assets/efecto-loop/contacto_loop_1080.webm'
import mp4Url from '../../assets/efecto-loop/contacto_loop_1080_h264.mp4'
import posterUrl from '../../assets/efecto-loop/contacto_poster.webp'
// Mobile (30/7): mismo video (recortado vía CSS object-position, no un render aparte) — solo el
// poster tiene una versión propia, ya encuadrada 2/3 ciudad + 1/3 personaje (pedido de Charlie).
import posterMobileUrl from '../../assets/efecto-loop/contacto_poster_mobile.webp'

const CONTENT = {
  es: {
    tagline: '¿Creamos algo impresionante?', // cabe en una línea
    status: 'Disponible', // C3
    statusDetail: 'freelance y full-time',
    copy: 'Copiar',
    copied: 'Copiado',
    copiedSr: 'Email copiado al portapapeles',
    cv: 'Descargar PDF',
  },
  en: {
    tagline: 'Shall we create something amazing?', // va en 2 líneas (caja más alta)
    status: 'Available',
    statusDetail: 'freelance & full-time',
    copy: 'Copy',
    copied: 'Copied',
    copiedSr: 'Email copied to clipboard',
    cv: 'Download PDF',
  },
}
const EMAIL = 'c.perez.grafica@gmail.com'
// C1: solo el PDF del idioma de la página (public/cv/). Charlie (26/9) quitó el acceso al otro
// idioma: daba la impresión de que solo ese se podía descargar
const CV = { es: '/cv/CV_Carlos_Perez_2026_ES.pdf', en: '/cv/CV_Carlos_Perez_2026_EN.pdf' }
// links reales (los abre el usuario con su clic; wa.me/linkedin en pestaña nueva)
const LINKS = [
  { label: 'WhatsApp', value: '+56 9 9473 8880', href: 'https://wa.me/56994738880', ext: true },
  { label: 'Email', value: EMAIL, href: `mailto:${EMAIL}`, ext: false, copy: true },
  { label: 'LinkedIn', value: '/in/charlie-pixelz', href: 'https://www.linkedin.com/in/charlie-pixelz', ext: true },
]

export function initContacto({ lang, isMobile = false }) {
  const el = document.querySelector('.contacto')
  if (!el) return null
  const c = CONTENT[lang] || CONTENT.es
  const video = el.querySelector('.contacto__video')
  const taglineEl = el.querySelector('.contacto__tagline')
  const linksUl = el.querySelector('.contacto__links')
  const crumb = el.querySelector('.contacto__crumb')
  const panel = el.querySelector('.contacto__panel')
  const glitchEl = el.querySelector('.contacto__glitch')

  // fuentes del video (preload none: solo baja al entrar). El poster se asigna recién al precalentar
  // o al entrar: el atributo `poster` descarga aunque el <video> esté oculto, y a la carga de Inicio
  // le sumaba 70 KB en paralelo con las texturas del hero.
  const poster = isMobile ? posterMobileUrl : posterUrl
  const setPoster = () => {
    if (!video.poster) video.poster = poster
  }
  video.innerHTML = `<source src="${webmUrl}" type="video/webm"><source src="${mp4Url}" type="video/mp4">`

  // contenido (la tagline hace de título de la caja; el nombre "Contacto" va en el breadcrumb)
  taglineEl.textContent = c.tagline
  // C3: línea de disponibilidad, sobre la tagline (lectura tipo "estado del sistema")
  const status = document.createElement('p')
  status.className = 'contacto__status'
  status.innerHTML = `<span class="contacto__dot" aria-hidden="true"></span><b>${c.status}</b> · ${c.statusDetail}`
  taglineEl.before(status)

  const rows = [
    ...LINKS.map((l) => ({ ...l, ev: l.label.toLowerCase() })),
    { label: 'CV', value: c.cv, href: CV[lang], download: true, ev: `cv-${lang}` },
  ]
  linksUl.innerHTML = rows
    .map(
      (l) =>
        `<li><a class="contacto__link" href="${l.href}" data-ev="${l.ev}"` +
        (l.ext ? ' target="_blank" rel="noopener"' : '') +
        (l.download ? ' download' : '') +
        `><span class="contacto__link-label">${l.label}</span>` +
        `<span class="contacto__link-value">${l.value}</span></a>` +
        // C2: copiar el email sin depender de un cliente de correo configurado
        (l.copy ? `<button class="contacto__chip" type="button" data-copy>${c.copy}</button>` : '') +
        `</li>`,
    )
    .join('')
  const live = document.createElement('span')
  live.className = 'sr-only'
  live.setAttribute('aria-live', 'polite')
  panel.appendChild(live)

  // GoatCounter: único clic que de verdad importa medir acá — el resto de la navegación (rutas
  // internas) ya la cuenta router.js. Estos links salen del sitio (wa.me/mailto/linkedin/PDF), así
  // que sin un evento explícito no quedarían registrados en ningún lado.
  const count = (ev) => window.goatcounter?.count?.({ path: `contacto-click-${ev}`, event: true })
  el.querySelectorAll('[data-ev]').forEach((a) => a.addEventListener('click', () => count(a.dataset.ev)))

  // navigator.clipboard solo existe en contexto seguro (https/localhost): en la IP de la red local
  // (pruebas en el celular) cae al execCommand de siempre
  const copyText = async (text) => {
    try {
      await navigator.clipboard.writeText(text)
      return true
    } catch {
      const ta = document.createElement('textarea')
      ta.value = text
      ta.setAttribute('readonly', '')
      ta.style.cssText = 'position:fixed;top:0;left:0;opacity:0;pointer-events:none'
      document.body.appendChild(ta)
      ta.select()
      let ok = false
      try {
        ok = document.execCommand('copy')
      } catch {}
      ta.remove()
      return ok
    }
  }
  const copyBtn = linksUl.querySelector('[data-copy]')
  let copyTimer
  copyBtn?.addEventListener('click', async () => {
    if (!(await copyText(EMAIL))) return
    count('copiar-email')
    sfx('confirm')
    copyBtn.textContent = `${c.copied} ✓`
    copyBtn.classList.add('is-done')
    live.textContent = c.copiedSr
    clearTimeout(copyTimer)
    copyTimer = setTimeout(() => {
      copyBtn.textContent = c.copy
      copyBtn.classList.remove('is-done')
      live.textContent = ''
    }, 1800)
  })

  const revealTargets = [panel, crumb]

  const prepare = () => {
    setPoster()
    gsap.set(revealTargets, { opacity: 0 })
    gsap.set(el.querySelectorAll('.contacto__links > li'), { opacity: 0 })
  }

  // "cambio de canal" al reiniciar el loop (la costura no es suave): cortes horizontales +
  // aberración cromática (video.is-glitch) + estática/banda de barrido (overlay .contacto__glitch).
  // No es strobe de pantalla completa a alto contraste — pulso corto (~0.32s), WCAG 2.3.1.
  let glitched = false
  const fireGlitch = () => {
    video.classList.remove('is-glitch')
    glitchEl?.classList.remove('is-on')
    void video.offsetWidth // reinicia ambas animaciones
    video.classList.add('is-glitch')
    glitchEl?.classList.add('is-on')
    setTimeout(() => {
      video.classList.remove('is-glitch')
      glitchEl?.classList.remove('is-on')
    }, 340)
  }
  video.addEventListener('timeupdate', () => {
    if (quality.reducedMotion || !video.duration) return
    const remain = video.duration - video.currentTime
    if (remain > 0.5) glitched = false
    if (remain < 0.18 && !glitched) {
      glitched = true
      fireGlitch()
    }
  })

  // idempotente: lo llaman el idle Y la intención (hover/foco del letrero) — un segundo load()
  // reiniciaría la descarga ya en curso (o el video que ya se está viendo)
  let warmed = false

  // arranca el video (durante el barrido). muted → autoplay permitido. reduced-motion = poster fijo.
  const enter = () => {
    warmed = true // si el idle llega después, un load() reiniciaría el video que ya se está viendo
    if (!quality.reducedMotion) video.play?.().catch(() => {})
  }

  // precalienta el video (idle): baja los datos por adelantado → el 1.er barrido no se frena
  // al hacer play (el "freno" era el decode del video en la primera reproducción).
  const warm = () => {
    setPoster()
    if (quality.reducedMotion || warmed) return
    warmed = true
    video.preload = 'auto'
    try {
      video.load()
    } catch {}
  }

  // reveal del panel + letrero (tras el barrido a la azotea): la caja aparece un momento DESPUÉS
  // de llegar — solo la caja/links, el breadcrumb de navegación se mantiene disponible de
  // inmediato. (30/7 solo mobile con 1.8s → 31/7 bajado a 0.3s → 1/8 mismo delay en desktop,
  // pedido de Charlie: el barrido se lee igual en los dos.)
  const reveal = () => {
    if (quality.reducedMotion) {
      gsap.set(revealTargets, { opacity: 1, y: 0 })
      gsap.set(el.querySelectorAll('.contacto__links > li'), { opacity: 1 })
      return
    }
    gsap.fromTo(crumb, { opacity: 0, y: -10 }, { opacity: 1, y: 0, duration: 0.4, ease: 'power2.out' })
    gsap
      .timeline({ delay: 0.3 })
      .fromTo(panel, { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 0.5, ease: 'power2.out' })
      .to(el.querySelectorAll('.contacto__links > li'), { opacity: 1, x: 0, duration: 0.35, stagger: 0.1, startAt: { x: -14 } }, '-=0.2')
  }

  const leave = () => {
    video.pause?.()
  }

  return { el, prepare, enter, reveal, leave, warm }
}
