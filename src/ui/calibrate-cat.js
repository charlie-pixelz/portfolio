// calibrate-cat.js — modo de calibración del LIENZO de la galería (solo con ?calcat).
// Muestra una categoría encendida y pone un recuadro arrastrable/redimensionable sobre
// .cat__canvas. Arrastra las esquinas al marco real del letrero; abajo salen los valores
// left/top/width/height (en % del billboard) listos para pegar. Dev-only (import dinámico).

export function initCalibrateCat(category) {
  if (!category) return
  const hero = document.querySelector('.hero')
  if (hero) hero.hidden = true
  const room = document.querySelector('.room')
  if (room) room.hidden = true
  const el = category.el
  el.hidden = false
  document.body.classList.add('route-category')
  category.prepare('ilustracion')
  category.lightOn()

  const stage = el.querySelector('.cat__stage')
  const canvas = el.querySelector('.cat__canvas')

  // rect actual (% del stage). Se mide con getBoundingClientRect en el frame siguiente,
  // cuando el billboard ya tiene layout (al arrancar estaba oculto → medidas en 0/NaN).
  const rect = { left: 23.4, top: 19.4, width: 53.2, height: 49.2 } // fallback = CSS actual
  const measure = () => {
    const s = stage.getBoundingClientRect()
    const c = canvas.getBoundingClientRect()
    if (!s.width || !c.width) return
    rect.left = ((c.left - s.left) / s.width) * 100
    rect.top = ((c.top - s.top) / s.height) * 100
    rect.width = (c.width / s.width) * 100
    rect.height = (c.height / s.height) * 100
    applyRect()
    allHandles.forEach((fn) => fn())
    refresh()
  }

  const applyRect = () => {
    canvas.style.left = rect.left + '%'
    canvas.style.top = rect.top + '%'
    canvas.style.width = rect.width + '%'
    canvas.style.height = rect.height + '%'
    canvas.style.outline = '2px dashed #33ff66'
    canvas.style.outlineOffset = '0'
  }
  applyRect()

  const out = document.createElement('textarea')
  out.readOnly = true
  out.style.cssText =
    'position:fixed;right:8px;bottom:8px;z-index:99999;width:min(460px,46vw);height:120px;font:12px/1.4 monospace;background:#000c;color:#33ff66;border:1px solid #33ff66;padding:6px;white-space:pre;'
  document.body.appendChild(out)

  const info = document.createElement('div')
  info.textContent =
    'CALIBRACIÓN DEL LIENZO — arrastra la esquina ↖ (mueve) y la ↘ (tamaño) al marco real del letrero. Copia el texto de abajo-derecha y pégamelo.'
  info.style.cssText =
    'position:fixed;top:8px;left:8px;right:8px;z-index:99999;color:#33ff66;font:13px/1.4 monospace;background:#000c;padding:6px 10px;border:1px solid #33ff66;'
  document.body.appendChild(info)

  const refresh = () => {
    out.value =
      `.cat__canvas {\n` +
      `  left: ${rect.left.toFixed(1)}%;\n` +
      `  top: ${rect.top.toFixed(1)}%;\n` +
      `  width: ${rect.width.toFixed(1)}%;\n` +
      `  height: ${rect.height.toFixed(1)}%;\n}`
  }
  refresh()

  const srect = () => stage.getBoundingClientRect()
  const mkHandle = (which, cursor) => {
    const h = document.createElement('div')
    h.style.cssText =
      `position:absolute;width:20px;height:20px;margin:-10px;border-radius:50%;background:#33ff66;border:2px solid #000;box-shadow:0 0 4px #000;cursor:${cursor};touch-action:none;z-index:99999;`
    stage.appendChild(h)
    const place = () => {
      h.style.left = (which === 'tl' ? rect.left : rect.left + rect.width) + '%'
      h.style.top = (which === 'tl' ? rect.top : rect.top + rect.height) + '%'
    }
    place()
    h.addEventListener('pointerdown', (e) => {
      e.preventDefault()
      h.setPointerCapture(e.pointerId)
      const move = (ev) => {
        const s = srect()
        const x = ((ev.clientX - s.x) / s.width) * 100
        const y = ((ev.clientY - s.y) / s.height) * 100
        if (which === 'tl') {
          const right = rect.left + rect.width
          const bottom = rect.top + rect.height
          rect.left = Math.min(x, right - 2)
          rect.top = Math.min(y, bottom - 2)
          rect.width = right - rect.left
          rect.height = bottom - rect.top
        } else {
          rect.width = Math.max(2, x - rect.left)
          rect.height = Math.max(2, y - rect.top)
        }
        applyRect()
        allHandles.forEach((fn) => fn())
        refresh()
      }
      const up = () => {
        document.removeEventListener('pointermove', move)
        document.removeEventListener('pointerup', up)
      }
      document.addEventListener('pointermove', move)
      document.addEventListener('pointerup', up)
    })
    return place
  }
  const allHandles = []
  allHandles.push(mkHandle('tl', 'nwse-resize'))
  allHandles.push(mkHandle('br', 'nwse-resize'))

  // ya con todo creado, mide el rect real cuando el billboard tiene layout
  requestAnimationFrame(measure)
  requestAnimationFrame(() => requestAnimationFrame(measure)) // reintento por si el 1.º fue muy pronto
}
