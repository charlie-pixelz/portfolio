// central-home.js — Punto 4: la pantalla central proyecta una réplica ESTÁTICA del Home
// (letreros + lockup) pero con "Proyectos" encendido en vez de "Inicio", reforzando que
// estás dentro de la sala de Proyectos. Se clona el DOM real del hero (vector-nítido y
// siempre sincronizado), sin animaciones ni interacción. Escala con la caja central, así
// que en el empalme del zoom cruza con el Home real (Proyectos → Inicio).

import { fitSigns } from './signs.js'

export function initCentralHome() {
  const plane = document.querySelector('.screen--central .screen__plane')
  const heroNav = document.querySelector('.hero .neon-nav')
  const heroBrand = document.querySelector('.hero .brand')
  if (!plane || !heroNav || !heroBrand) return

  const stage = document.createElement('div')
  stage.className = 'central-home'
  stage.setAttribute('aria-hidden', 'true') // decorativo: el Home real ya está en el DOM

  const nav = heroNav.cloneNode(true)
  const brand = heroBrand.cloneNode(true)

  // encender "Proyectos" en vez de "Inicio"
  nav.querySelectorAll('.sign').forEach((s) => s.removeAttribute('aria-current'))
  const proj = nav.querySelector('[data-route="projects"]')
  if (proj) proj.setAttribute('aria-current', 'page')

  // matar interacción/rutas del clon
  nav.querySelectorAll('a').forEach((a) => {
    a.removeAttribute('href')
    a.removeAttribute('data-route')
    a.setAttribute('tabindex', '-1')
  })

  stage.append(nav, brand)
  plane.appendChild(stage)

  const signs = [...stage.querySelectorAll('.sign')]
  const fit = () => fitSigns(signs)

  if (document.fonts?.ready) document.fonts.ready.then(fit)
  fit()
  // la sala está oculta al cargar (clientWidth=0); el router dispara esto al abrirla
  addEventListener('cp:refit-screens', fit)
  let t
  addEventListener(
    'resize',
    () => {
      clearTimeout(t)
      t = setTimeout(fit, 120)
    },
    { passive: true },
  )
}
