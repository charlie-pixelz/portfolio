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
      const padX = parseFloat(cs.paddingLeft) + parseFloat(cs.paddingRight)
      const padY = parseFloat(cs.paddingTop) + parseFloat(cs.paddingBottom)
      const targetW = frame.clientWidth - padX
      const availH = frame.clientHeight - padY
      const lines = [...frame.querySelectorAll('.label i')]
      // 1) cada sílaba llena el ancho del marco (look "justificado" del v6)
      const sizes = lines.map((el) => {
        el.style.fontSize = '100px'
        const w = el.offsetWidth
        return w > 0 ? (100 * targetW) / w : 100
      })
      lines.forEach((el, i) => (el.style.fontSize = sizes[i].toFixed(2) + 'px'))
      // 2) si el stack (p. ej. C/O/N/T/A/C/T) es más alto que el marco, escala todo para que quepa
      const label = frame.querySelector('.label')
      if (label && label.scrollHeight > availH) {
        const k = availH / label.scrollHeight
        lines.forEach((el, i) => (el.style.fontSize = (sizes[i] * k).toFixed(2) + 'px'))
      }
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
