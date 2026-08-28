// AssetLoader — precarga imágenes + fuentes y expone progreso REAL (0..1).
// El % del preloader se ata a esto: un loader que miente está prohibido (ART_DIR §6.1).

// document.fonts.ready solo espera las fuentes que YA empezaron a descargarse. Si nada en el
// DOM del preloader usa Handjet/Doto/etc. (el preloader es 100% canvas), el navegador nunca las
// pide y esa promesa se resuelve "gratis" sin haberlas cargado — el % llega a 100% mintiendo, y
// el flash real ocurre después: el hero pinta las letreros con la fuente de respaldo (font-display:
// swap) y recién cuando terminan de llegar, fitSigns() las reajusta (el "salto" de tamaño que vio
// Charlie). Forzamos el fetch de las 6 familias acá para que .ready las cuente de verdad.
const FONT_FAMILIES = ['Space Grotesk', 'Doto', 'Glitch Goblin', 'Handjet', 'Rubik Glitch', 'Press Start 2P']
let fontsForced = false

// Idempotente: se llama tanto desde acá (rama preloader, /) como desde la entrada de main.js para
// las páginas /es/ /en/ (que NO pasan por preload() — main.js las va a buscar directo). Sin esta
// segunda llamada, recargar /es/ o /en/ de frente dejaba el mismo bug sin corregir.
export function forceFontLoad() {
  if (fontsForced || !document.fonts?.load) return
  fontsForced = true
  FONT_FAMILIES.forEach((f) => document.fonts.load(`400 16px "${f}"`).catch(() => {}))
}

export function preload(urls) {
  const total = urls.length + 1 // +1 = document.fonts.ready
  let loaded = 0
  const state = { progress: 0 }
  const bump = () => {
    loaded++
    state.progress = loaded / total
  }
  urls.forEach((url) => {
    const img = new Image()
    img.onload = bump
    img.onerror = bump // un asset que falla no bloquea la carga
    img.src = url
  })
  if (document.fonts?.ready) {
    forceFontLoad()
    document.fonts.ready.then(bump)
  } else {
    bump()
  }
  return state
}
