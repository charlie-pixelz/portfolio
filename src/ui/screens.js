// screens.js — coloca el contenido de cada pantalla (callejón + etiqueta) sobre el
// PLANO EN PERSPECTIVA del monitor, con una homografía (matrix3d) que mapea el
// rectángulo de la caja → el cuadrilátero del monitor (data-quad). Así el contenido
// se ve "proyectado" en la pantalla inclinada, no como un recorte plano pegado.
// Basado en el clásico general-2D-projection (Paul Nash / MDN matrix3d).

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
  return [
    m[0] * v[0] + m[1] * v[1] + m[2] * v[2],
    m[3] * v[0] + m[4] * v[1] + m[5] * v[2],
    m[6] * v[0] + m[7] * v[1] + m[8] * v[2],
  ]
}
// base que lleva (1,0,0),(0,1,0),(0,0,1) a los 4 puntos dados (el 4º define la escala)
function basis(x1, y1, x2, y2, x3, y3, x4, y4) {
  const m = [x1, x2, x3, y1, y2, y3, 1, 1, 1]
  const v = mulv(adj(m), [x4, y4, 1])
  return mul(m, [v[0], 0, 0, 0, v[1], 0, 0, 0, v[2]])
}
// homografía: mapea el cuadrilátero fuente (a*) al destino (x*), ambos en orden TL,TR,BL,BR
function projection(a1, b1, a2, b2, a3, b3, a4, b4, x1, y1, x2, y2, x3, y3, x4, y4) {
  return mul(basis(x1, y1, x2, y2, x3, y3, x4, y4), adj(basis(a1, b1, a2, b2, a3, b3, a4, b4)))
}

// cuadrilátero del monitor (data-quad, en % de la caja) para cada categoría, cacheado
const quads = {}
const planeOf = {}

// aplica la homografía a un plano, interpolando el cuadrilátero del monitor hacia el
// rectángulo plano por t (0 = perspectiva de la sala · 1 = frontal, matriz identidad).
function applyPlane(cat, t = 0) {
  const plane = planeOf[cat]
  const q = quads[cat]
  if (!plane || !q) return
  const w = plane.offsetWidth
  const h = plane.offsetHeight
  if (!w || !h) return // oculto → no medir
  // rectángulo plano de la caja, en % (TL,TR,BR,BL)
  const flat = [[0, 0], [100, 0], [100, 100], [0, 100]]
  const lerp = (i) => [q[i][0] + (flat[i][0] - q[i][0]) * t, q[i][1] + (flat[i][1] - q[i][1]) * t]
  const px = (i) => {
    const p = lerp(i)
    return [(p[0] / 100) * w, (p[1] / 100) * h]
  }
  const [tl, tr, br, bl] = [px(0), px(1), px(2), px(3)]
  // fuente = rectángulo de la caja (TL,TR,BL,BR); destino = cuadrilátero interpolado
  const m3 = projection(
    0, 0, w, 0, 0, h, w, h,
    tl[0], tl[1], tr[0], tr[1], bl[0], bl[1], br[0], br[1],
  )
  for (let i = 0; i < 9; i++) m3[i] /= m3[8]
  const m = [m3[0], m3[3], 0, m3[6], m3[1], m3[4], 0, m3[7], 0, 0, 1, 0, m3[2], m3[5], 0, m3[8]]
  plane.style.transform = 'matrix3d(' + m.map((n) => +n.toFixed(6)).join(',') + ')'
}

// el router la llama durante el zoom-in a categoría para "enderezar" la pantalla antes
// del cambio a la galería (y al revés en el zoom-out).
export function flattenScreen(cat, t) {
  applyPlane(cat, t)
}

export function initScreens() {
  const screens = [...document.querySelectorAll('.screen[data-cat]')]
  if (!screens.length) return

  screens.forEach((screen) => {
    const cat = screen.dataset.cat
    planeOf[cat] = screen.querySelector('.screen__plane')
    // data-quad = "TLx,TLy TRx,TRy BRx,BRy BLx,BLy" en % de la caja
    quads[cat] = screen.dataset.quad
      .trim()
      .split(/\s+/)
      .map((p) => p.split(',').map(Number))
  })

  const fit = () => screens.forEach((s) => applyPlane(s.dataset.cat, 0)) // t=0 → perspectiva de sala

  if (document.fonts?.ready) document.fonts.ready.then(fit)
  fit()
  let timer
  addEventListener(
    'resize',
    () => {
      clearTimeout(timer)
      timer = setTimeout(fit, 120)
    },
    { passive: true },
  )
  // el router lo dispara al abrir la sala: al cargar estaba oculta (offsetWidth=0)
  // y la homografía no se podía medir. Aquí ya es visible.
  addEventListener('cp:refit-screens', fit)
}
