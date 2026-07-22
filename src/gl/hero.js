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

  void main() {
    // contain: la ilustración se ve completa (aspect-lock). Barras --void donde sobra,
    // para que la nav diegética caiga exacta sobre los edificios (ADENDUM §1).
    float ra = uResolution.x / uResolution.y;
    float ia = uImageSize.x / uImageSize.y;
    vec2 scale = ra > ia ? vec2(ia / ra, 1.0) : vec2(1.0, ra / ia);
    vec2 cuv = (vUv - 0.5) / scale + 0.5;
    if (cuv.x < 0.0 || cuv.x > 1.0 || cuv.y < 0.0 || cuv.y > 1.0) {
      gl_FragColor = vec4(0.004, 0.004, 0.21, 1.0); // --void en las barras
      return;
    }
    vec2 drift = vec2(sin(uTime * 0.25), cos(uTime * 0.2)) * 0.18;
    vec2 look = uMouse + drift;
    // fondo se mueve poco, personaje más → separación de profundidad, sin duplicado
    vec3 bg = texture2D(uBg, cuv + look * uStrengthBg).rgb;
    vec4 ch = texture2D(uChar, cuv + look * uStrengthChar);
    vec3 comp = mix(bg, ch.rgb, ch.a);
    // difuminar bordes hacia --void: disuelve la costura de las barras (aspect-lock)
    float edge = smoothstep(0.0, 0.03, cuv.x) * smoothstep(1.0, 0.97, cuv.x) *
                 smoothstep(0.0, 0.03, cuv.y) * smoothstep(1.0, 0.97, cuv.y);
    gl_FragColor = vec4(mix(vec3(0.004, 0.004, 0.21), comp, edge), 1.0);
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
  const inv = new URLSearchParams(location.search).get('parallax') === 'inv'
  const big = quality.isTouch ? 0.011 : 0.016
  const small = quality.isTouch ? 0.004 : 0.006
  // normal: el personaje se mueve más. ?parallax=inv: el fondo se mueve más (comparar en vivo)
  const kBg = still ? 0 : inv ? big : small
  const kChar = still ? 0 : inv ? small : big

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
