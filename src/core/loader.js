// AssetLoader — precarga imágenes + fuentes y expone progreso REAL (0..1).
// El % del preloader se ata a esto: un loader que miente está prohibido (ART_DIR §6.1).

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
  if (document.fonts?.ready) document.fonts.ready.then(bump)
  else bump()
  return state
}
