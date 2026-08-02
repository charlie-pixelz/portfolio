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
  uniform float uEyeStatic;  // 1 = pupila fija (mobile: no hay cursor que seguir)
  uniform float uEyeFlicker; // 0..1 destello irregular (reemplaza al seguimiento en mobile)
  uniform vec2 uPupil;       // posicion de la pupila en UV de imagen — DISTINTA por plataforma
  uniform vec2 uEyeR;        // radios (nucleo, halo) en unidades de ANCHO de imagen en pantalla
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
      // grid horizontal: el mismo motivo pixela la imagen (mosaico) y dibuja las filas de fósforo.
      vec2 CELLS = vec2(150.0, 190.0); // celda ≈ 2:1 (ancha) → trazos horizontales
      vec2 cf = cuv * CELLS;
      vec2 cell = floor(cf);
      vec2 cfrac = fract(cf) - 0.5;    // posición dentro de la celda (-0.5..0.5)
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
      // pixel SUAVE (no bloque duro): cada celda es un blob de fósforo con bordes redondeados,
      // más comprimido en vertical → lee como filas horizontales (motivo tipo ASCII/CRT).
      float soft = 0.42 + 0.58 * smoothstep(0.58, 0.12, max(abs(cfrac.x) * 0.82, abs(cfrac.y) * 1.5));
      // generación RADIAL desde el centro hacia afuera (+ dither por celda = borde irregular)
      float dc = distance(cuv, vec2(0.5)) / 0.72;             // 0 centro → ~1 esquinas
      float th = clamp(dc, 0.0, 1.0) * 0.82 + hash(cell) * 0.18;
      float revealed = smoothstep(th - 0.06, th + 0.02, uProgress);
      vec3 tint = vec3(0.58, 0.96, 0.90);                     // fósforo teal (referencia)
      col = mix(voidc, tint * pow(lc, vec3(0.85)) * 1.38 * soft, revealed); // brillo +20%
      if (g > 0.001) col += (hash(cell + uTime) - 0.5) * 0.3 * g; // estática
      float edge = smoothstep(0.0, 0.03, cuv.x) * smoothstep(1.0, 0.97, cuv.x) *
                   smoothstep(0.0, 0.03, cuv.y) * smoothstep(1.0, 0.97, cuv.y);
      col = mix(voidc, col, edge); // disuelve la costura de las barras
    }

    // ojo rojo. Visible desde 0%. uEyeStatic=1 (mobile) → pupila FIJA, sin seguimiento; su vida la
    // da uEyeFlicker (un destello irregular desde JS) en vez del cursor, que en touch no existe.
    // 10% menos de recorrido hacia la izquierda: más allá del hombro se pierde la ilusión de estar "dentro del ojo".
    float mx = uMouse.x < 0.0 ? uMouse.x * 0.9 : uMouse.x;
    // uPupil viene de JS y es DISTINTA en desktop y mobile: cada uno dithera una imagen distinta
    // (hero_desktop_clean vs hero_mobile_clean), o sea otro encuadre, y la pupila esta en UV de
    // IMAGEN. Tenerla hardcodeada aqui hacia que calibrar mobile descuadrara desktop.
    // OJO con el signo de la Y: en cuv el eje va INVERTIDO respecto a la pantalla (cuv.y=1 es el
    // borde de ARRIBA), por eso bajar en pantalla = restar en cuv.
    // (Sin acentos graves en este comentario: el shader vive dentro de un template literal de JS.)
    vec2 pupil = uPupil + vec2(mx, uMouse.y) * vec2(0.006, 0.006) * (1.0 - uEyeStatic);
    // "el ojo quedó apretado" (Charlie 31/7): cuv son UV de IMAGEN, que no es cuadrada, así que un
    // distance() plano daba un óvalo — horizontal en desktop (ia 1.64) y vertical/aplastado en el
    // hero móvil (ia 0.56). Dividir la componente Y por el aspecto mide en píxeles de PANTALLA:
    // el ojo queda redondo en cualquier formato, y el radio pasa a estar en unidades de ancho.
    vec2 ec = vec2(1.0, 1.0 / ia);
    float d = distance(cuv * ec, pupil * ec);
    float act = max(uEyeActive, uEyeFlicker);
    vec3 red = mix(vec3(0.470, 0.0, 0.0), vec3(0.973, 0.0, 0.0), act); // #780000→#F80000
    float core = smoothstep(uEyeR.x, 0.0, d);
    float halo = (0.35 + 0.55 * act) * smoothstep(uEyeR.y, 0.0, d);
    col += red * (core + halo);

    gl_FragColor = vec4(col, 1.0);
  }
`

export function initPreloader({ sceneUrl, preloadUrls = [], isMobile = false }) {
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
      uEyeStatic: { value: isMobile ? 1 : 0 },
      uEyeFlicker: { value: 0 },
      // Calibrados por separado sobre CADA imagen (ver uPupil en el shader). Los radios van en
      // unidades de ancho-de-imagen-en-pantalla — la métrica del ojo es circular (se corrige el
      // aspecto), así que el mismo valor da un círculo igual de redondo en los dos formatos.
      // Mobile los tiene ~2x porque ahí la escena se ve mucho más chica (pedido de Charlie 1/8).
      uPupil: { value: isMobile ? [0.56, 0.5707] : [0.52, 0.57] },
      uEyeR: { value: isMobile ? [0.0206, 0.1086] : [0.0105, 0.058] },
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
  const RAMP = 1.6 // duración del ramp continuo del % (sin pausas), para apreciar la generación
  let elapsed = 0
  let done = false
  let eyeActive = 0
  // mobile: el ojo no sigue nada (Charlie 31/7, "en esta versión lo dejaría estático, quizá solo
  // con un efecto glitch"). En su lugar, UN destello por evento cada 2.4–4.8 s — irregular, como
  // el neón viejo, y jamás más de 3 destellos/s (WCAG 2.3.1).
  let flicker = 0
  let blipT = 0
  let nextBlip = 1.2 + Math.random() * 2

  ticker.add((t, dt) => {
    elapsed += dt
    let p
    if (forcedP !== null) p = forcedP
    else if (reduced) p = state.progress
    else p = Math.min(state.progress, elapsed / RAMP) // nunca miente: cap por carga real Y por el ramp

    program.uniforms.uProgress.value = p
    program.uniforms.uTime.value = t * 0.001
    program.uniforms.uMouse.value = [pointer.pos.x, pointer.pos.y]

    // desktop: el ojo se aviva al acercar el cursor al selector (arriba-centro), una vez visible.
    // mobile: base fija y tenue; la "vida" la pone el destello de abajo.
    const target = isMobile ? (done ? 0.3 : 0) : done ? Math.max(0, 1 - Math.hypot(pointer.pos.x, pointer.pos.y - 0.8) / 1.1) : 0
    eyeActive += (target - eyeActive) * Math.min(1, dt * 6)
    program.uniforms.uEyeActive.value = eyeActive

    if (isMobile && !reduced) {
      blipT += dt
      if (blipT >= nextBlip) {
        blipT = 0
        nextBlip = 2.4 + Math.random() * 2.4
        flicker = 1
      }
      flicker = Math.max(0, flicker - dt / 0.3) // un solo destello, decae en 300 ms
      program.uniforms.uEyeFlicker.value = flicker * 0.9
    }

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
