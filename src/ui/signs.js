// fitSigns — escala cada sílaba para llenar el ancho útil de su letrero, de modo que
// todas las líneas del mismo letrero queden con el MISMO ancho (portado del prototipo v6).
// offsetWidth ignora la perspectiva (rotateY), así que la medición es correcta.

// Ajusta un conjunto de letreros. Reutilizable: la home lo usa, y la réplica del Home
// dentro de la pantalla central (central-home.js) también.
export function fitSigns(frames) {
  if (!frames.length) return
  frames.forEach((frame) => {
    const cs = getComputedStyle(frame)
    const padX = parseFloat(cs.paddingLeft) + parseFloat(cs.paddingRight)
    const padY = parseFloat(cs.paddingTop) + parseFloat(cs.paddingBottom)
    const targetW = frame.clientWidth - padX
    const availH = frame.clientHeight - padY
    // Guard REAL: no basta con clientWidth>0. Durante el primer layout el marco llega a medir ~18px
    // (aún sin su ancho definitivo), y con el padding restado targetW queda ~0 → fontSize 0px, que
    // se quedaba pegado hasta que otro evento disparaba el refit segundos después (el "texto chico
    // por un par de segundos" que reportó Charlie). Si el marco todavía no tiene ancho útil, se deja
    // el tamaño del CSS base y el ResizeObserver de abajo vuelve a llamar en cuanto crezca.
    if (targetW < 40 || availH <= 0) return
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

  // Primer intento YA, sin esperar a las fuentes: si el layout está listo, los letreros salen
  // ajustados desde el primer pintado. Antes el único disparo era fonts.ready, así que cualquier
  // demora ahí dejaba el texto en el tamaño del CSS base (chico) mientras tanto.
  fit()
  // Segunda pasada al llegar las fuentes reales: cambian las métricas del texto y por tanto el
  // tamaño que hace calzar cada sílaba con el ancho del marco.
  document.fonts?.ready?.then(fit)
  // El layout del hero no está listo cuando se resuelve fonts.ready: los marcos aún miden ~18px y
  // recién adquieren su ancho real más tarde (medido: 2.7 s después en dev). Observarlos reajusta
  // en el mismo frame en que crecen, en vez de depender de que algo más dispare un refit.
  if ('ResizeObserver' in window) {
    let raf = 0
    const ro = new ResizeObserver(() => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(fit) // 1 sola pasada por frame aunque cambien los 4 marcos
    })
    frames.forEach((f) => ro.observe(f))
  }
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
