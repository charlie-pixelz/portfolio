// Stage — canvas WebGL ÚNICO y persistente (#gl, fixed inset:0), sobre OGL.
// En Fase 1 la escena está vacía (solo limpia cada frame); es la base sobre la que
// P1+ montará los planos: hero depth-map, CRT, imágenes DOM→WebGL, VideoTexture, glitch.

import { Renderer, Transform } from 'ogl'
import { ticker } from '../core/ticker.js'
import { quality } from '../core/quality.js'

let renderer
let scene

export const stage = {
  init() {
    renderer = new Renderer({ alpha: true, antialias: false, dpr: quality.dpr })
    const gl = renderer.gl
    gl.clearColor(0, 0, 0, 0) // transparente: deja ver el fondo CSS; aún sin escena

    const canvas = gl.canvas
    canvas.id = 'gl'
    canvas.setAttribute('aria-hidden', 'true')
    document.body.prepend(canvas)

    scene = new Transform()

    const resize = () => renderer.setSize(window.innerWidth, window.innerHeight)
    window.addEventListener('resize', resize, { passive: true })
    resize()

    // Render dentro del RAF único.
    ticker.add(() => renderer.render({ scene }))

    return { renderer, scene }
  },
  get renderer() {
    return renderer
  },
  get scene() {
    return scene
  },
}
