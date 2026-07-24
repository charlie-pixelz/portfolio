// calibrate.js — modo de calibración (solo con ?cal en la URL). Muestra la sala y pone
// puntos arrastrables en las 4 esquinas de cada pantalla. Arrastra cada punto al vidrio
// real del monitor; abajo aparecen los valores exactos (frame%) listos para pegar.
// Es dev-only: se carga por import dinámico, no entra en el bundle normal.

function adj(m) {
  return [
    m[4] * m[8] - m[5] * m[7], m[2] * m[7] - m[1] * m[8], m[1] * m[5] - m[2] * m[4],
    m[5] * m[6] - m[3] * m[8], m[0] * m[8] - m[2] * m[6], m[2] * m[3] - m[0] * m[5],
    m[3] * m[7] - m[4] * m[6], m[1] * m[6] - m[0] * m[7], m[0] * m[4] - m[1] * m[3],
  ]
}
function mul(a, b) {
  const r = []
  for (let i = 0; i < 3; i++)
    for (let j = 0; j < 3; j++) {
      let s = 0
      for (let k = 0; k < 3; k++) s += a[3 * i + k] * b[3 * k + j]
      r[3 * i + j] = s
    }
  return r
}
function mulv(m, v) {
  return [m[0] * v[0] + m[1] * v[1] + m[2] * v[2], m[3] * v[0] + m[4] * v[1] + m[5] * v[2], m[6] * v[0] + m[7] * v[1] + m[8] * v[2]]
}
function basis(x1, y1, x2, y2, x3, y3, x4, y4) {
  const m = [x1, x2, x3, y1, y2, y3, 1, 1, 1]
  const v = mulv(adj(m), [x4, y4, 1])
  return mul(m, [v[0], 0, 0, 0, v[1], 0, 0, 0, v[2]])
}
function projection(a1, b1, a2, b2, a3, b3, a4, b4, x1, y1, x2, y2, x3, y3, x4, y4) {
  return mul(basis(x1, y1, x2, y2, x3, y3, x4, y4), adj(basis(a1, b1, a2, b2, a3, b3, a4, b4)))
}

export function initCalibrate() {
  const room = document.querySelector('.room')
  const hero = document.querySelector('.hero')
  if (!room) return
  hero.hidden = true
  room.hidden = false
  document.body.classList.add('route-room')
  const crt = document.querySelector('.crt')
  if (crt) crt.style.display = 'none'
  const frame = room.querySelector('.room__frame')
  const screens = [...room.querySelectorAll('.screen')]
  const colors = { ilustracion: '#00ff66', motion: '#4bdff4', web: '#f202cd', ia: '#ffd500', central: '#ffffff' }

  // esquinas actuales (frame%) desde clip-path (local) + caja
  const parse = (s) => {
    const m = s.style.clipPath.match(/polygon\(([^)]+)\)/)
    const L = parseFloat(s.style.left), T = parseFloat(s.style.top), W = parseFloat(s.style.width), H = parseFloat(s.style.height)
    return m[1].split(',').map((p) => {
      const [x, y] = p.trim().split(/\s+/).map(parseFloat)
      return { x: L + (x / 100) * W, y: T + (y / 100) * H }
    })
  }
  const data = screens.map((s) => ({ el: s, cat: s.dataset.cat || 'central', pts: parse(s) }))

  const apply = (d) => {
    const xs = d.pts.map((p) => p.x), ys = d.pts.map((p) => p.y)
    const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys)
    const W = maxX - minX, H = maxY - minY
    d.box = { left: minX, top: minY, width: W, height: H }
    d.local = d.pts.map((p) => [((p.x - minX) / W) * 100, ((p.y - minY) / H) * 100])
    d.el.style.left = minX + '%'
    d.el.style.top = minY + '%'
    d.el.style.width = W + '%'
    d.el.style.height = H + '%'
    d.el.style.clipPath = 'polygon(' + d.local.map((p) => p[0].toFixed(2) + '% ' + p[1].toFixed(2) + '%').join(', ') + ')'
    const plane = d.el.querySelector('.screen__plane')
    if (plane && d.cat !== 'central') {
      plane.style.display = ''
      const w = plane.offsetWidth, h = plane.offsetHeight
      if (w && h) {
        const q = d.local, px = (i) => [(q[i][0] / 100) * w, (q[i][1] / 100) * h]
        const [tl, tr, br, bl] = [px(0), px(1), px(2), px(3)]
        const t = projection(0, 0, w, 0, 0, h, w, h, tl[0], tl[1], tr[0], tr[1], bl[0], bl[1], br[0], br[1])
        for (let i = 0; i < 9; i++) t[i] /= t[8]
        const M = [t[0], t[3], 0, t[6], t[1], t[4], 0, t[7], 0, 0, 1, 0, t[2], t[5], 0, t[8]]
        plane.style.transform = 'matrix3d(' + M.map((n) => +n.toFixed(6)).join(',') + ')'
      }
    }
  }
  data.forEach(apply)

  const layer = document.createElement('div')
  layer.style.cssText = 'position:absolute;inset:0;z-index:200;'
  frame.appendChild(layer)

  const out = document.createElement('textarea')
  out.readOnly = true
  out.style.cssText =
    'position:fixed;right:8px;bottom:8px;z-index:99999;width:min(560px,46vw);height:190px;font:11px/1.35 monospace;background:#000c;color:#33ff66;border:1px solid #33ff66;padding:6px;white-space:pre;'
  document.body.appendChild(out)

  const info = document.createElement('div')
  info.textContent = 'CALIBRACIÓN — arrastra cada punto a la esquina del vidrio del monitor. Cuando calcen, copia TODO el texto de abajo-derecha y pégamelo.'
  info.style.cssText =
    'position:fixed;top:8px;left:8px;right:8px;z-index:99999;color:#33ff66;font:13px/1.4 monospace;background:#000c;padding:6px 10px;border:1px solid #33ff66;'
  document.body.appendChild(info)

  const refresh = () => {
    out.value = data
      .map((d) => {
        const b = d.box
        const clip = 'polygon(' + d.local.map((p) => p[0].toFixed(2) + '% ' + p[1].toFixed(2) + '%').join(', ') + ')'
        const quad = d.local.map((p) => p[0].toFixed(2) + ',' + p[1].toFixed(2)).join(' ')
        return `[${d.cat}] left:${b.left.toFixed(2)}% top:${b.top.toFixed(2)}% width:${b.width.toFixed(2)}% height:${b.height.toFixed(2)}%\n  quad="${quad}"\n  clip=${clip}`
      })
      .join('\n')
  }
  refresh()

  const frect = () => frame.getBoundingClientRect()
  data.forEach((d) => {
    d.pts.forEach((pt) => {
      const hnd = document.createElement('div')
      hnd.style.cssText =
        `position:absolute;width:18px;height:18px;margin:-9px;border-radius:50%;background:${colors[d.cat]};border:2px solid #000;box-shadow:0 0 4px #000;cursor:grab;touch-action:none;left:${pt.x}%;top:${pt.y}%;`
      layer.appendChild(hnd)
      hnd.addEventListener('pointerdown', (e) => {
        e.preventDefault()
        hnd.setPointerCapture(e.pointerId)
        const move = (ev) => {
          const f = frect()
          pt.x = ((ev.clientX - f.x) / f.width) * 100
          pt.y = ((ev.clientY - f.y) / f.height) * 100
          hnd.style.left = pt.x + '%'
          hnd.style.top = pt.y + '%'
          apply(d)
          refresh()
        }
        const up = () => {
          document.removeEventListener('pointermove', move)
          document.removeEventListener('pointerup', up)
        }
        document.addEventListener('pointermove', move)
        document.addEventListener('pointerup', up)
      })
    })
  })
}
