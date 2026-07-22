// P1.B — Hero con profundidad, versión MULTI-CAPA (sin fantasma).
// Un shader compone dos planos: fondo (opaco) + personaje (alpha), cada uno con su propio
// parallax. Como el fondo tiene data real detrás del personaje, al moverse no lo duplica.
// Fallback: reduced-motion / tier low → strengths 0 (estático). Sin WebGL → clase CSS.

import { Program, Mesh, Plane, Texture } from 'ogl'
import { stage } from './stage.js'
import { pointer } from '../core/pointer.js'
import { quality } from '../core/quality.js'
import { ticker } from '../core/ticker.js'

const vertex = /* glsl */ `
  attribute vec2 uv;
  attribute vec3 position;
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`

const fragment = /* glsl */ `
  precision highp float;
  uniform sampler2D uBg;
  uniform sampler2D uChar;
  uniform vec2 uResolution;
  uniform vec2 uImageSize;
  uniform vec2 uMouse;
  uniform float uStrengthBg;
  uniform float uStrengthChar;
  uniform float uTime;
  varying vec2 vUv;

  // UV tipo background-size: cover (rellena y recorta, centrado)
  vec2 coverUv(vec2 uv, vec2 res, vec2 img) {
    vec2 ratio = vec2(
      min((res.x / res.y) / (img.x / img.y), 1.0),
      min((res.y / res.x) / (img.y / img.x), 1.0)
    );
    return vec2(
      uv.x * ratio.x + (1.0 - ratio.x) * 0.5,
      uv.y * ratio.y + (1.0 - ratio.y) * 0.5
    );
  }

  void main() {
    vec2 cuv = coverUv(vUv, uResolution, uImageSize);
    vec2 drift = vec2(sin(uTime * 0.25), cos(uTime * 0.2)) * 0.18;
    vec2 look = uMouse + drift;
    // fondo se mueve poco, personaje más → separación de profundidad, sin duplicado
    vec3 bg = texture2D(uBg, cuv + look * uStrengthBg).rgb;
    vec4 ch = texture2D(uChar, cuv + look * uStrengthChar);
    gl_FragColor = vec4(mix(bg, ch.rgb, ch.a), 1.0);
  }
`

export function initHero(bgUrl, charUrl) {
  const renderer = stage.renderer
  if (!renderer) {
    document.body.classList.add('no-webgl') // fallback CSS
    return
  }
  const gl = renderer.gl
  const texOpts = { generateMipmaps: false, wrapS: gl.CLAMP_TO_EDGE, wrapT: gl.CLAMP_TO_EDGE }
  const uBg = new Texture(gl, texOpts)
  const uChar = new Texture(gl, texOpts)

  const still = quality.reducedMotion || quality.tier === 'low'
  const kBg = still ? 0 : quality.isTouch ? 0.004 : 0.006
  const kChar = still ? 0 : quality.isTouch ? 0.011 : 0.016

  const program = new Program(gl, {
    vertex,
    fragment,
    uniforms: {
      uBg: { value: uBg },
      uChar: { value: uChar },
      uResolution: { value: [window.innerWidth, window.innerHeight] },
      uImageSize: { value: [2400, 1465] }, // se corrige con el tamaño real al cargar
      uMouse: { value: [0, 0] },
      uStrengthBg: { value: kBg },
      uStrengthChar: { value: kChar },
      uTime: { value: 0 },
    },
  })
  const mesh = new Mesh(gl, { geometry: new Plane(gl, { width: 2, height: 2 }), program })
  mesh.setParent(stage.scene)

  const load = (tex, url, setSize) => {
    const img = new Image()
    img.onload = () => {
      tex.image = img
      if (setSize) program.uniforms.uImageSize.value = [img.naturalWidth, img.naturalHeight]
    }
    img.src = url
  }
  load(uBg, bgUrl, true)
  load(uChar, charUrl, false)

  window.addEventListener(
    'resize',
    () => {
      program.uniforms.uResolution.value = [window.innerWidth, window.innerHeight]
    },
    { passive: true },
  )

  ticker.add((t) => {
    program.uniforms.uTime.value = t * 0.001
    program.uniforms.uMouse.value = [pointer.pos.x, pointer.pos.y]
  })
}
