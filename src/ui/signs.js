// fitSigns — escala cada sílaba para llenar el ancho útil de su letrero, de modo que
// todas las líneas del mismo letrero queden con el MISMO ancho (portado del prototipo v6).
// offsetWidth ignora la perspectiva (rotateY), así que la medición es correcta.

// Ajusta un conjunto de letreros. Reutilizable: la home lo usa, y la réplica del Home
// dentro de la pantalla central (central-home.js) también.
export function fitSigns(frames) {
  if (!frames.length) return
  // móvil (<721px): layout distinto (grilla 2×2) → tamaño natural
  if (!matchMedia('(min-width: 721px)').matches) {
    frames.forEach((f) => f.querySelectorAll('.label i').forEach((el) => (el.style.fontSize = '')))
    return
  }
  // si están ocultos (clientWidth=0) NO medir: daría tamaños enormes que quedan pegados
  if (!frames[0].clientWidth) return
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
    // 2) si el stack es más alto que el marco, escala todo para que quepa
    const label = frame.querySelector('.label')
    if (label && label.scrollHeight > availH) {
      const k = availH / label.scrollHeight
      lines.forEach((el, i) => (el.style.fontSize = (sizes[i] * k).toFixed(2) + 'px'))
    }
  })
}

export function initSigns() {
  const frames = [...document.querySelectorAll('.hero .sign')] // solo la home (la central se ajusta aparte)
  if (!frames.length) return
  const fit = () => fitSigns(frames)

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
  // el router lo dispara al volver a Inicio (la home estaba oculta al medir)
  addEventListener('cp:refit-signs', fit)
}
