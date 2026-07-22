// Stage — canvas WebGL ÚNICO y persistente (#gl, fixed inset:0), sobre OGL.
// No se auto-suscribe al ticker: expone render() y main.js lo llama AL FINAL del frame,
// después de que todos los módulos actualizaron sus uniforms (evita 1 frame de lag).

import { Renderer, Transform } from 'ogl'
import { quality } from '../core/quality.js'

let renderer
let scene

export const stage = {
  init() {
    renderer = new Renderer({ alpha: true, antialias: false, dpr: quality.dpr })
    const gl = renderer.gl
    gl.clearColor(0, 0, 0, 0) // transparente hasta que una escena lo llene

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
  render() {
    if (renderer) renderer.render({ scene })
  },
  get renderer() {
    return renderer
  },
  get scene() {
    return scene
  },
}
