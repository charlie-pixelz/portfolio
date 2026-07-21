// Charlie Pixelz — entrada compartida del esqueleto.
// La arquitectura de efectos (canvas persistente, RAF único, PointerManager,
// QualityManager, Lenis) llega en Fase 1 (ANIMATION_SPEC §0); aquí solo lo mínimo.

import './styles/tokens.css'
import './styles/base.css'

// Recuerda el idioma de esta página para que la próxima visita salte el selector.
const p = location.pathname
const lang = p.includes('/en/') ? 'en' : p.includes('/es/') ? 'es' : null
if (lang) {
  try {
    localStorage.setItem('cp-lang', lang)
  } catch {}
}
