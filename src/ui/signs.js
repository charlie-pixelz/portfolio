// fitSigns — escala cada sílaba para llenar el ancho útil de su letrero, de modo que
// todas las líneas del mismo letrero queden con el MISMO ancho (portado del prototipo v6).
// offsetWidth ignora la perspectiva (rotateY), así que la medición es correcta.

export function initSigns() {
  const frames = [...document.querySelectorAll('.sign')]
  if (!frames.length) return

  function fit() {
    // móvil (<721px): layout distinto (grilla 2×2, pendiente) → tamaño natural
    if (!matchMedia('(min-width: 721px)').matches) {
      document.querySelectorAll('.label i').forEach((el) => (el.style.fontSize = ''))
      return
    }
    frames.forEach((frame) => {
      const cs = getComputedStyle(frame)
      const target = frame.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight)
      frame.querySelectorAll('.label i').forEach((el) => {
        el.style.fontSize = '100px'
        const w = el.offsetWidth
        if (w > 0) el.style.fontSize = ((100 * target) / w).toFixed(1) + 'px'
      })
    })
  }

  if (document.fonts?.ready) document.fonts.ready.then(fit)
  else fit()
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
