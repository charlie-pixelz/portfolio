// P1.A — Preloader: la escena del hero se GENERA por dither atado al progreso REAL de carga
// (grayscale + scanlines + tinte "pantalla"), con el ojo rojo cuya pupila sigue al cursor.
// Al 100% aparece el selector de idioma; al elegir → glitch → /es/ o /en/ (hero a color).
// Depurar con ?p=0.4 para congelar el progreso. reduced-motion: sin animación de tiempo.

import { Program, Mesh, Plane, Texture } from 'ogl'
import { stage } from './stage.js'
import { pointer } from '../core/pointer.js'
import { quality } from '../core/quality.js'
import { ticker } from '../core/ticker.js'
import { preload } from '../core/loader.js'

const vertex = /* glsl */ `
  attribute vec2 uv;
  attribute vec3 position;
  varying vec2 vUv;
  void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }
`

const fragment = /* glsl */ `
  precision highp float;
  uniform sampler2D uScene;
  uniform vec2 uResolution;
  uniform vec2 uImageSize;
  uniform float uProgress;
  uniform vec2 uMouse;
  uniform float uEyeActive;
  uniform float uDpr;
  uniform float uTime;
  uniform float uGlitch; // 0 limpio · 1 glitch de salida (transición al hero)
  varying vec2 vUv;

  float hash(vec2 p) { return fract(sin(dot(p, vec2(41.31, 289.17))) * 43758.5453); }

  void main() {
    vec3 voidc = vec3(0.0118, 0.0157, 0.0157); // #030404 (se mezcla más con la imagen)
    float ra = uResolution.x / uResolution.y;
    float ia = uImageSize.x / uImageSize.y;
    vec2 scale = ra > ia ? vec2(ia / ra, 1.0) : vec2(1.0, ra / ia);
    vec2 cuv = (vUv - 0.5) / scale + 0.5;

    // glitch de salida "cambio de canal": desplazamiento de bandas horizontales
    float g = uGlitch;
    if (g > 0.001) {
      float band = floor(cuv.y * 22.0);
      cuv.x += (hash(vec2(band, floor(uTime * 16.0))) - 0.5) * 0.08 * g;
    }

    vec3 col = voidc;
    if (cuv.x >= 0.0 && cuv.x <= 1.0 && cuv.y >= 0.0 && cuv.y <= 1.0) {
      vec3 W = vec3(0.299, 0.587, 0.114);
      // motivo de "generación": celdas horizontales axis-aligned (sin diagonal). El mismo grid
      // pixela la imagen (mosaico) y dispara el dither por celda. Menos celdas = motivo más grande.
      vec2 CELLS = vec2(150.0, 190.0); // celda ≈ 2:1 (ancha) → trazos horizontales
      vec2 cell = floor(cuv * CELLS);
      vec2 quv = (cell + 0.5) / CELLS; // centro de celda → imagen pixelada a la escala del motivo
      vec3 lc; // luminancia por canal (aberración cromática al glitchear)
      if (g > 0.001) {
        float ca = 0.006 * g;
        lc = vec3(
          dot(texture2D(uScene, quv + vec2(ca, 0.0)).rgb, W),
          dot(texture2D(uScene, quv).rgb, W),
          dot(texture2D(uScene, quv - vec2(ca, 0.0)).rgb, W)
        );
      } else {
        lc = vec3(dot(texture2D(uScene, quv).rgb, W));
      }
      float row = gl_FragCoord.y / uDpr;
      float scan = 0.55 + 0.45 * step(0.5, fract(row / 3.0)); // scanlines
      float th = hash(cell);                                   // umbral por celda (generación bloque a bloque)
      float revealed = step(th, uProgress);                    // dither atado al %
      vec3 tint = vec3(0.72, 0.92, 0.95);                      // cian-blanco de "pantalla"
      col = mix(voidc, tint * pow(lc, vec3(0.8)) * 1.08 * scan, revealed);
      if (g > 0.001) col += (hash(cell + uTime) - 0.5) * 0.3 * g; // estática
      float edge = smoothstep(0.0, 0.03, cuv.x) * smoothstep(1.0, 0.97, cuv.x) *
                   smoothstep(0.0, 0.03, cuv.y) * smoothstep(1.0, 0.97, cuv.y);
      col = mix(voidc, col, edge); // disuelve la costura de las barras
    }

    // ojo rojo + pupila que sigue al cursor (rango restringido). Visible desde 0%.
    // 10% menos de recorrido hacia la izquierda: más allá del hombro se pierde la ilusión de estar "dentro del ojo".
    float mx = uMouse.x < 0.0 ? uMouse.x * 0.9 : uMouse.x;
    vec2 pupil = vec2(0.52, 0.57) + vec2(mx, uMouse.y) * vec2(0.006, 0.006);
    float d = distance(cuv, pupil);
    vec3 red = mix(vec3(0.470, 0.0, 0.0), vec3(0.973, 0.0, 0.0), uEyeActive); // #780000→#F80000
    float core = smoothstep(0.00988, 0.0, d); // tamaño -5%
    float halo = (0.35 + 0.55 * uEyeActive) * smoothstep(0.057, 0.0, d); // -5%
    col += red * (core + halo);

    gl_FragColor = vec4(col, 1.0);
  }
`

export function initPreloader({ sceneUrl, preloadUrls = [] }) {
  const pct = document.getElementById('pct')
  const langSelect = document.getElementById('langSelect')
  const links = langSelect ? [...langSelect.querySelectorAll('a[data-lang]')] : []

  // ambas opciones "apagadas" por defecto (sin preselección lit); Charlie elige.

  const EXIT = 0.42 // duración del glitch de salida (≈500 ms con el margen de navegación)
  let exiting = false

  // click → guardar idioma + glitch de salida (o crossfade si reduced-motion) + navegar
  links.forEach((a) =>
    a.addEventListener('click', (e) => {
      e.preventDefault()
      try {
        localStorage.setItem('cp-lang', a.dataset.lang)
      } catch {}
      const href = a.getAttribute('href')
      const main = document.querySelector('.preloader')
      if (main) main.classList.add('is-exiting') // desvanece la UI (%/marca/selector)
      if (quality.reducedMotion || !stage.renderer) {
        setTimeout(() => (location.href = href), 260) // crossfade corto (a11y)
      } else {
        exiting = true // arranca el glitch de shader desde el ticker central
        setTimeout(() => (location.href = href), 460)
      }
    }),
  )

  function reveal() {
    if (langSelect) langSelect.hidden = false
    document.body.classList.add('loaded')
  }

  const renderer = stage.renderer
  if (!renderer) {
    if (pct) pct.textContent = '100%'
    reveal()
    return
  }

  const gl = renderer.gl
  const uScene = new Texture(gl, {
    generateMipmaps: false,
    wrapS: gl.CLAMP_TO_EDGE,
    wrapT: gl.CLAMP_TO_EDGE,
  })
  const program = new Program(gl, {
    vertex,
    fragment,
    uniforms: {
      uScene: { value: uScene },
      uResolution: { value: [window.innerWidth, window.innerHeight] },
      uImageSize: { value: [2400, 1465] },
      uProgress: { value: 0 },
      uMouse: { value: [0, 0] },
      uEyeActive: { value: 0 },
      uDpr: { value: quality.dpr },
      uTime: { value: 0 },
      uGlitch: { value: 0 },
    },
  })
  new Mesh(gl, { geometry: new Plane(gl, { width: 2, height: 2 }), program }).setParent(stage.scene)

  const sceneImg = new Image()
  sceneImg.onload = () => {
    uScene.image = sceneImg
    program.uniforms.uImageSize.value = [sceneImg.naturalWidth, sceneImg.naturalHeight]
  }
  sceneImg.src = sceneUrl

  window.addEventListener(
    'resize',
    () => (program.uniforms.uResolution.value = [window.innerWidth, window.innerHeight]),
    { passive: true },
  )

  const state = preload([sceneUrl, ...preloadUrls])
  const forced = new URLSearchParams(location.search).get('p')
  const forcedP = forced !== null ? Math.max(0, Math.min(1, parseFloat(forced))) : null
  const reduced = quality.reducedMotion
  const MIN = 1.2 // duración mínima para que la generación se lea
  let elapsed = 0
  let done = false
  let eyeActive = 0

  ticker.add((t, dt) => {
    elapsed += dt
    let p
    if (forcedP !== null) p = forcedP
    else if (reduced) p = state.progress
    else p = Math.min(state.progress, elapsed / MIN) // nunca miente: cap por carga real Y por tiempo

    program.uniforms.uProgress.value = p
    program.uniforms.uTime.value = t * 0.001
    program.uniforms.uMouse.value = [pointer.pos.x, pointer.pos.y]

    // ojo se aviva al acercar el cursor al selector (arriba-centro), una vez visible
    const target = done ? Math.max(0, 1 - Math.hypot(pointer.pos.x, pointer.pos.y - 0.8) / 1.1) : 0
    eyeActive += (target - eyeActive) * Math.min(1, dt * 6)
    program.uniforms.uEyeActive.value = eyeActive

    if (pct) {
      const v = Math.round(p * 100)
      pct.textContent = v + '%'
      pct.setAttribute('aria-valuenow', String(v))
    }
    if (!done && p >= 1) {
      done = true
      reveal()
    }

    // glitch de salida: 0 → 1 al elegir idioma (justo antes de navegar)
    if (exiting) {
      program.uniforms.uGlitch.value = Math.min(1, program.uniforms.uGlitch.value + dt / EXIT)
    }
  })
}
