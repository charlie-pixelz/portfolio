// menu.js — Menú "Pip-Boy": botón fijo (esquina sup. derecha, en TODAS las vistas) que despliega
// un panel capa-OS (.os-frame) con la navegación (Inicio/Proyectos/Biografía/Contacto) + idioma.
// Los ítems llevan data-route → los intercepta el router (SPA); el idioma es navegación real.
// El ítem de la sección actual se resalta vía clases del <body> (route-*), en CSS. ART_DIR §5.

import menuOff from '../../assets/icons/icon_menu-off.png'
import menuOn from '../../assets/icons/icon_menu-on.png'

export function initMenu() {
  const nav = document.querySelector('.pipboy')
  if (!nav) return
  const toggle = nav.querySelector('.pipboy__toggle')
  const panel = nav.querySelector('.pipboy__panel')
  if (!toggle || !panel) return

  // los íconos on/off (pixel-art) se inyectan como variables → el CSS los intercambia al abrir/hover
  toggle.style.setProperty('--menu-off', `url(${menuOff})`)
  toggle.style.setProperty('--menu-on', `url(${menuOn})`)

  let open = false
  const setOpen = (v) => {
    if (v === open) return
    open = v
    nav.classList.toggle('is-open', v)
    toggle.setAttribute('aria-expanded', String(v))
    panel.setAttribute('aria-hidden', String(!v))
  }

  toggle.addEventListener('click', (e) => {
    e.stopPropagation()
    setOpen(!open)
  })
  // al elegir un ítem, el router (data-route) o el cambio de idioma navega → cerramos el panel
  panel.querySelectorAll('a').forEach((a) => a.addEventListener('click', () => setOpen(false)))
  // cerrar con Escape (y devolver el foco al botón) o al hacer clic fuera
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && open) {
      setOpen(false)
      toggle.focus()
    }
  })
  document.addEventListener('click', (e) => {
    if (open && !nav.contains(e.target)) setOpen(false)
  })

  return { setOpen }
}
