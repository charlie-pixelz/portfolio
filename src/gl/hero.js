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
  uniform float uGlitch; // 0 = limpio · 1 = glitch máximo (transición de entrada)
  varying vec2 vUv;

  float hash(vec2 p) { return fract(sin(dot(p, vec2(41.31, 289.17))) * 43758.5453); }

  // compone fondo (opaco) + personaje (alpha) en una uv dada
  vec3 scene(vec2 uv, vec2 look) {
    vec3 bg = texture2D(uBg, uv + look * uStrengthBg).rgb;
    vec4 ch = texture2D(uChar, uv + look * uStrengthChar);
    return mix(bg, ch.rgb, ch.a);
  }

  void main() {
    // contain: la ilustración se ve completa (aspect-lock). Barras --void donde sobra,
    // para que la nav diegética caiga exacta sobre los edificios (ADENDUM §1).
    vec3 voidc = vec3(0.0, 0.0039, 0.0824); // #000115
    float ra = uResolution.x / uResolution.y;
    float ia = uImageSize.x / uImageSize.y;
    vec2 scale = ra > ia ? vec2(ia / ra, 1.0) : vec2(1.0, ra / ia);
    vec2 cuv = (vUv - 0.5) / scale + 0.5;

    // glitch "cambio de canal": desplazamiento de bandas horizontales
    float g = uGlitch;
    if (g > 0.001) {
      float band = floor(cuv.y * 22.0);
      float j = hash(vec2(band, floor(uTime * 16.0)));
      cuv.x += (j - 0.5) * 0.08 * g;
    }

    if (cuv.x < 0.0 || cuv.x > 1.0 || cuv.y < 0.0 || cuv.y > 1.0) {
      gl_FragColor = vec4(voidc, 1.0);
      return;
    }

    vec2 drift = vec2(sin(uTime * 0.25), cos(uTime * 0.2)) * 0.18;
    vec2 look = uMouse + drift;

    vec3 comp;
    if (g > 0.001) {
      float ca = 0.006 * g; // aberración cromática (separa R/B)
      comp.r = scene(cuv + vec2(ca, 0.0), look).r;
      comp.g = scene(cuv, look).g;
      comp.b = scene(cuv - vec2(ca, 0.0), look).b;
      float st = hash(cuv * vec2(420.0, 320.0) + uTime); // estática
      comp += (st - 0.5) * 0.35 * g;
    } else {
      comp = scene(cuv, look);
    }

    // difuminar bordes hacia --void: disuelve la costura de las barras (aspect-lock)
    float edge = smoothstep(0.0, 0.03, cuv.x) * smoothstep(1.0, 0.97, cuv.x) *
                 smoothstep(0.0, 0.03, cuv.y) * smoothstep(1.0, 0.97, cuv.y);
    gl_FragColor = vec4(mix(voidc, comp, edge), 1.0);
  }
`

export function initHero(bgUrl, charUrl) {
  const renderer = stage.renderer
  if (!renderer) {
    document.body.classList.add('no-webgl') // fallback CSS
    document.body.classList.add('hero-ready') // sin shader no hay nada que esperar: mostrar ya
    return
  }
  const gl = renderer.gl
  const texOpts = { generateMipmaps: false, wrapS: gl.CLAMP_TO_EDGE, wrapT: gl.CLAMP_TO_EDGE }
  const uBg = new Texture(gl, texOpts)
  const uChar = new Texture(gl, texOpts)

  // (31/7) `still` ya NO incluye tier low. El parallax de este shader son dos uniforms: cambiar su
  // valor no cuesta ni un draw call más, así que apagarlo en tier low no ahorraba nada y sí dejaba
  // el hero (la pieza central del sitio) completamente muerto en la mayoría de los teléfonos
  // reales, que caen en 'low' por deviceMemory ≤ 4 GB. Ahora tier low = parallax a la mitad.
  const still = quality.reducedMotion
  const normal = new URLSearchParams(location.search).get('parallax') === 'normal'
  const k = quality.tier === 'low' ? 0.5 : 1
  const big = (quality.isTouch ? 0.011 : 0.0208) * k // desktop +30% (1/8, pedido de Charlie)
  const small = (quality.isTouch ? 0.004 : 0.0078) * k
  // Charlie eligió el parallax INVERTIDO (fondo se mueve más) como default; ?parallax=normal lo invierte
  const kBg = still ? 0 : normal ? small : big
  const kChar = still ? 0 : normal ? big : small

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
      uGlitch: { value: still ? 0 : 1 }, // entra glitcheado y se resuelve (continúa la transición del preloader)
    },
  })
  const mesh = new Mesh(gl, { geometry: new Plane(gl, { width: 2, height: 2 }), program })
  mesh.setParent(stage.scene)

  // glitch de entrada: al cargar el fondo, resolvemos uGlitch 1 → 0 (≈550 ms) desde el ticker central
  const ENTER = 0.55
  let entering = false

  const load = (tex, url, setSize) => {
    const img = new Image()
    img.onload = () => {
      tex.image = img
      if (setSize) {
        program.uniforms.uImageSize.value = [img.naturalWidth, img.naturalHeight]
        if (!still) entering = true // arranca la resolución del glitch cuando hay señal
        // avisa que la escena YA tiene textura: hasta acá el canvas está transparente y el DOM del
        // hero (letreros + lockup) se vería flotando sobre el fondo del body. base.css los revela
        // con esta clase. Sin esto, al elegir idioma se veía la pantalla azul con los letreros
        // durante todo lo que tarda main.js en bajar/parsear/ejecutar (segundos en dev).
        document.body.classList.add('hero-ready')
      }
    }
    img.src = url
  }
  load(uBg, bgUrl, true)
  load(uChar, charUrl, false)

  // Nav diegética: los letreros siguen el MISMO desplazamiento que el fondo (look * kBg),
  // así se sienten montados en los edificios de la escena en vez de flotar (ADENDUM §1).
  const nav = document.querySelector('.neon-nav')
  const heroEl = document.querySelector('.hero')
  let heroW = 0
  let heroH = 0
  const measure = () => {
    if (!heroEl) return
    const r = heroEl.getBoundingClientRect()
    heroW = r.width
    heroH = r.height
  }
  measure()

  window.addEventListener(
    'resize',
    () => {
      program.uniforms.uResolution.value = [window.innerWidth, window.innerHeight]
      measure()
    },
    { passive: true },
  )

  // El router "asienta" el hero al salir a Biografía (recentra el personaje, sin parallax del
  // mouse) y lo reactiva al volver. Lerp hacia el objetivo para que la vuelta al centro no salte.
  let settled = false
  const hm = { x: 0, y: 0 }
  addEventListener('cp:hero-settle', () => (settled = true))
  addEventListener('cp:hero-resume', () => (settled = false))

  ticker.add((t, dt) => {
    const time = t * 0.001
    program.uniforms.uTime.value = time
    const tx = settled ? 0 : pointer.pos.x
    const ty = settled ? 0 : pointer.pos.y
    hm.x += (tx - hm.x) * 0.12
    hm.y += (ty - hm.y) * 0.12
    program.uniforms.uMouse.value = [hm.x, hm.y]
    if (entering) {
      const g = Math.max(0, program.uniforms.uGlitch.value - dt / ENTER)
      program.uniforms.uGlitch.value = g
      if (g <= 0) entering = false
    }
    // los letreros siguen la intensidad del PERSONAJE (kChar), no la del fondo → se mueven menos
    if (nav && kChar > 0) {
      if (!heroW) measure() // layout puede no estar listo en el init
      const lx = hm.x + Math.sin(time * 0.25) * 0.18
      const ly = hm.y + Math.cos(time * 0.2) * 0.18
      nav.style.transform = `translate(${(-lx * kChar * heroW).toFixed(2)}px, ${(-ly * kChar * heroH).toFixed(2)}px)`
    }
  })
}
