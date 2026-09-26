// Stage — canvas WebGL ÚNICO y persistente (#gl, fixed inset:0), sobre OGL.
// No se auto-suscribe al ticker: expone render() y main.js lo llama AL FINAL del frame,
// después de que todos los módulos actualizaron sus uniforms (evita 1 frame de lag).

import { Renderer, Transform } from 'ogl'
import { quality } from '../core/quality.js'

let renderer
let scene
let idle = false // true = el último frame ya limpió el canvas y no hay nada visible que dibujar
let drew = false // el cuadro anterior se dibujó (en reposo, el siguiente tick mide cuánto costó)

// Resolución dinámica: si el dispositivo no sostiene ~45 fps con el shader a pantalla completa,
// se baja la densidad de píxeles del canvas por pasos (el CRT/grano disimula la pérdida de nitidez)
// en vez de dejar que todo el sitio se trabe. Solo baja, nunca sube (evita oscilar); en un equipo
// que rinde bien no se toca nunca.
const MIN_DPR = 0.75
const SAMPLE = 60 // frames por ventana de medición
const SLOW_MS = 22 // mediana por encima de esto (~45 fps) = el shader le queda grande al equipo
let samples = []
let warmup = 90 // se ignoran los primeros frames (carga, compilación del shader, decode de texturas)

const adapt = (dt) => {
  // durante una transición de ruta el costo es del DOM (desenfoques, zooms), no del shader: no cuenta
  if (document.body.dataset.transitioning) {
    samples = []
    return
  }
  if (warmup > 0) return warmup--
  const ms = dt * 1000
  if (ms <= 0 || ms > 250) return // pestaña en segundo plano / pausa: no es rendimiento real
  samples.push(ms)
  if (samples.length < SAMPLE) return
  samples.sort((a, b) => a - b)
  const median = samples[SAMPLE >> 1]
  samples = []
  if (median <= SLOW_MS || renderer.dpr <= MIN_DPR) return
  renderer.dpr = Math.max(MIN_DPR, +(renderer.dpr * 0.75).toFixed(2))
  renderer.setSize(window.innerWidth, window.innerHeight)
  warmup = 30 // deja asentar la nueva resolución antes de volver a medir
}

export const stage = {
  init() {
    renderer = new Renderer({ alpha: true, antialias: false, dpr: quality.dpr })
    const gl = renderer.gl
    // sin contexto WebGL (bloqueado/deshabilitado) OGL devuelve gl=null: antes eso lanzaba acá y
    // tumbaba TODO main.js, así que el fallback CSS de hero.js (`no-webgl`) nunca llegaba a correr
    if (!gl) {
      renderer = null
      return null
    }
    gl.clearColor(0, 0, 0, 0) // transparente hasta que una escena lo llene

    // Sin aceleración por hardware (el navegador dibuja WebGL con el procesador: SwiftShader,
    // llvmpipe…; pasa en máquinas virtuales, GPUs bloqueadas y en el entorno de PageSpeed) cada
    // cuadro del shader a pantalla completa cuesta decenas de ms de CPU. Ahí se arranca a la
    // densidad mínima en vez de esperar a que adapt() la baje paso a paso.
    try {
      const info = gl.getExtension('WEBGL_debug_renderer_info')
      const name = String(gl.getParameter(info ? info.UNMASKED_RENDERER_WEBGL : gl.RENDERER))
      if (/swiftshader|llvmpipe|softpipe|software|basic render/i.test(name)) {
        stage.software = true
        renderer.dpr = 0.5
      }
    } catch {}

    const canvas = gl.canvas
    canvas.id = 'gl'
    canvas.setAttribute('aria-hidden', 'true')
    document.body.prepend(canvas)

    scene = new Transform()

    const resize = () => renderer.setSize(window.innerWidth, window.innerHeight)
    window.addEventListener('resize', resize, { passive: true })
    resize()

    return { renderer, scene }
  },
  // hero.js: `hold` = saltar este cuadro (reposo); `calm` = se está dibujando a ritmo de reposo, así
  // que el intervalo entre cuadros no dice nada del rendimiento del equipo (no se mide)
  hold: false,
  calm: false,
  software: false,
  render(dt = 0) {
    if (!renderer) return
    if (this.hold) {
      // reposo: este tick no dibuja, pero su dt es lo que tardó el cuadro anterior → sí se mide
      // (sin esto la resolución nunca bajaba en reposo y cada cuadro salía carísimo)
      if (drew && !document.hidden) adapt(dt)
      drew = false
      return
    }
    // sin nada visible (p.ej. el hero oculto en otra sección): se dibuja UNA vez más para limpiar
    // el canvas y después se deja de renderizar hasta que algo vuelva a ser visible
    const active = scene.children.some((c) => c.visible)
    if (!active && idle) return
    idle = !active
    renderer.render({ scene })
    drew = active
    if (active && !this.calm) adapt(dt)
  },
  get renderer() {
    return renderer
  },
  get scene() {
    return scene
  },
}
