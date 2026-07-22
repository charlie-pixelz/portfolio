// P1.B — Hero con profundidad (fake 3D por depth-map).
// Un plano fullscreen con la ilustración + su mapa de profundidad; las UVs se desplazan
// según (depth - 0.5) * puntero * uStrength, con drift ambiental para que "respire".
// Fallback: reduced-motion / tier low → uStrength 0 (imagen estática). Sin WebGL → clase CSS.

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
  uniform sampler2D uTexture;
  uniform sampler2D uDepth;
  uniform vec2 uResolution;
  uniform vec2 uImageSize;
  uniform vec2 uMouse;
  uniform float uStrength;
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
    float depth = texture2D(uDepth, cuv).r;
    // drift ambiental sutil para que respire sin input
    vec2 drift = vec2(sin(uTime * 0.25), cos(uTime * 0.2)) * 0.35;
    vec2 look = uMouse + drift;
    vec2 offset = (depth - 0.5) * look * uStrength;
    gl_FragColor = vec4(texture2D(uTexture, cuv + offset).rgb, 1.0);
  }
`

export function initHero(heroUrl, depthUrl) {
  const renderer = stage.renderer
  if (!renderer) {
    document.body.classList.add('no-webgl') // fallback CSS
    return
  }
  const gl = renderer.gl

  const texOpts = { generateMipmaps: false, wrapS: gl.CLAMP_TO_EDGE, wrapT: gl.CLAMP_TO_EDGE }
  const uTexture = new Texture(gl, texOpts)
  const uDepth = new Texture(gl, texOpts)

  const strength =
    quality.reducedMotion || quality.tier === 'low' ? 0.0 : quality.isTouch ? 0.012 : 0.018

  const program = new Program(gl, {
    vertex,
    fragment,
    uniforms: {
      uTexture: { value: uTexture },
      uDepth: { value: uDepth },
      uResolution: { value: [window.innerWidth, window.innerHeight] },
      uImageSize: { value: [2400, 1465] }, // se corrige con el tamaño real al cargar
      uMouse: { value: [0, 0] },
      uStrength: { value: strength },
      uTime: { value: 0 },
    },
  })

  const mesh = new Mesh(gl, { geometry: new Plane(gl, { width: 2, height: 2 }), program })
  mesh.setParent(stage.scene)

  // Cargar imágenes → texturas
  const colorImg = new Image()
  colorImg.onload = () => {
    uTexture.image = colorImg
    program.uniforms.uImageSize.value = [colorImg.naturalWidth, colorImg.naturalHeight]
  }
  colorImg.src = heroUrl

  const depthImg = new Image()
  depthImg.onload = () => {
    uDepth.image = depthImg
  }
  depthImg.src = depthUrl

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
