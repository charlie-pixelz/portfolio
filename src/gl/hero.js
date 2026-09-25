// P1.B — Hero con profundidad, versión MULTI-CAPA (sin fantasma) + depth map real (H1, revisión 25/9).
// Un shader compone dos planos: fondo (opaco, con desplazamiento POR PROFUNDIDAD según el depth map
// real — los edificios cercanos se mueven más que el fondo de la calle) + personaje (alpha, plano
// único). Como el fondo tiene data real detrás del personaje, al moverse no lo duplica.
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
  uniform sampler2D uDepth;
  uniform vec2 uResolution;
  uniform vec2 uImageSize;
  uniform vec2 uMouse;
  uniform float uStrengthBg;   // pico de desplazamiento del fondo (se modula por profundidad, no es plano)
  uniform float uStrengthChar; // personaje: plano único a distancia constante, sin variación de profundidad
  uniform float uDepthNorm;    // normaliza el rango de gris del FONDO puro (excluyendo al personaje, que
                                // ocupa el extremo blanco del mapa) a 0..1 — calibrado por asset, ver hero.js
  uniform float uZoom;         // overscan: agranda el encuadre para que el desplazamiento no revele el
                                // borde real de la textura (H1: recorte 4-6%)
  uniform float uTime;
  uniform float uGlitch; // 0 = limpio · 1 = glitch máximo (transición de entrada)
  varying vec2 vUv;

  float hash(vec2 p) { return fract(sin(dot(p, vec2(41.31, 289.17))) * 43758.5453); }

  // compone fondo (desplazado píxel a píxel según el depth map) + personaje (alpha, plano único)
  vec3 scene(vec2 uv, vec2 look) {
    // blanco = cerca, negro = lejos (mismo criterio que ADENDUM §4/ART_DIR). El punto de fuga de la
    // calle queda ~0 → no se mueve (ancla natural); lo más cercano del fondo se mueve al pico.
    float depth = clamp(texture2D(uDepth, uv).r * uDepthNorm, 0.0, 1.0);
    // el personaje ocupa el extremo blanco del MISMO mapa (es un solo depth map para toda la
    // escena) — sin esto, el fondo leía esa silueta como "lo más cercano" y se desplazaba al pico
    // justo ahí, generando un aro que se ve (y se mueve) de más en el borde del personaje, incluso
    // con el mouse quieto (drift ambiental amplificado). Atenuar por (1 - alpha del personaje EN
    // ESTA MISMA uv, sin desplazar) apaga la profundidad exactamente donde no aplica.
    float charHere = texture2D(uChar, uv).a;
    vec2 bgOffset = look * uStrengthBg * depth * (1.0 - charHere);
    vec3 bg = texture2D(uBg, uv + bgOffset).rgb;
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

    // overscan (H1): la MUESTRA se toma de un encuadre ligeramente más cerrado que el real — el
    // test de void de arriba ya usó el cuv sin zoom, así que las barras --void no se mueven.
    vec2 suv = (cuv - 0.5) / uZoom + 0.5;

    vec2 drift = vec2(sin(uTime * 0.25), cos(uTime * 0.2)) * 0.18;
    vec2 look = uMouse + drift;

    vec3 comp;
    if (g > 0.001) {
      float ca = 0.006 * g; // aberración cromática (separa R/B)
      comp.r = scene(suv + vec2(ca, 0.0), look).r;
      comp.g = scene(suv, look).g;
      comp.b = scene(suv - vec2(ca, 0.0), look).b;
      float st = hash(cuv * vec2(420.0, 320.0) + uTime); // estática
      comp += (st - 0.5) * 0.35 * g;
    } else {
      comp = scene(suv, look);
    }

    // difuminar bordes hacia --void: disuelve la costura de las barras (aspect-lock)
    float edge = smoothstep(0.0, 0.03, cuv.x) * smoothstep(1.0, 0.97, cuv.x) *
                 smoothstep(0.0, 0.03, cuv.y) * smoothstep(1.0, 0.97, cuv.y);
    gl_FragColor = vec4(mix(voidc, comp, edge), 1.0);
  }
`

// Multiplicador de profundidad POR LETRERO (H1: "cada letrero con su propia profundidad"), leído a
// mano del depth map real en la posición de cada sign (ver notas de la revisión 25/9). Relativo entre
// sí (no absoluto): centrado en ~1 para no perder el nivel de movimiento ya aprobado, con el rango
// completo repartido entre el letrero más cercano (~1.4) y el más lejano (~0.6). data-route "home" no
// existe como atributo en el HTML — se resuelve como clave 'home' por defecto.
const SIGN_DEPTH = {
  desktop: { home: 1.4, projects: 0.66, bio: 0.6, contacto: 1.28 },
  mobile: { home: 1.09, projects: 0.6, bio: 0.91, contacto: 1.4 },
}

export function initHero(bgUrl, charUrl, depthUrl) {
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
  const uDepth = new Texture(gl, texOpts)

  const isMobileLayout = document.documentElement.classList.contains('is-mobile')

  // (31/7) `still` ya NO incluye tier low. El parallax de este shader son dos uniforms: cambiar su
  // valor no cuesta ni un draw call más, así que apagarlo en tier low no ahorraba nada y sí dejaba
  // el hero (la pieza central del sitio) completamente muerto en la mayoría de los teléfonos
  // reales, que caen en 'low' por deviceMemory ≤ 4 GB. Ahora tier low = parallax a la mitad.
  const still = quality.reducedMotion
  const normal = new URLSearchParams(location.search).get('parallax') === 'normal'
  // ?pk=2 multiplica la intensidad del parallax: para probar valores en vivo antes de fijar uno
  // (no cambia el default). Tope en 4: más allá el borde de la textura se estira a la vista.
  const pk = Math.min(4, Math.max(0, Number(new URLSearchParams(location.search).get('pk')) || 1))
  const k = (quality.tier === 'low' ? 0.5 : 1) * pk
  // H1 (revisión 25/9): el fondo ahora se desplaza según el depth map real, no como una lámina
  // plana — el punto de fuga se queda quieto y solo lo cercano se mueve al pico, así que ese pico
  // puede subir ×2 sin verse forzado. Antes: 0.0208 desktop / 0.011 touch.
  const big = (quality.isTouch ? 0.022 : 0.0416) * k
  const small = (quality.isTouch ? 0.004 : 0.0078) * k
  // Charlie eligió el parallax INVERTIDO (fondo se mueve más) como default; ?parallax=normal lo invierte
  const kBg = still ? 0 : normal ? small : big
  const kChar = still ? 0 : normal ? big : small
  // rango de gris del FONDO puro en cada asset (excluye al personaje, que ocupa el extremo blanco):
  // desktop llega hasta ~0.55 en sus puntos más cercanos, mobile (retrato cerrado, poco fondo real)
  // apenas ~0.08 — normalizar cada uno a su propio rango evita que el mobile quede casi sin efecto.
  const depthNorm = isMobileLayout ? 12.5 : 1.818

  const program = new Program(gl, {
    vertex,
    fragment,
    uniforms: {
      uBg: { value: uBg },
      uChar: { value: uChar },
      uDepth: { value: uDepth },
      uResolution: { value: [window.innerWidth, window.innerHeight] },
      uImageSize: { value: [2400, 1465] }, // se corrige con el tamaño real al cargar
      uMouse: { value: [0, 0] },
      uStrengthBg: { value: kBg },
      uStrengthChar: { value: kChar },
      uDepthNorm: { value: depthNorm },
      uZoom: { value: 1.05 }, // overscan 5% (H1: rango pedido 4-6%)
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
  load(uDepth, depthUrl, false)

  // Nav diegética: cada letrero sigue el desplazamiento del fondo (kChar × su propia profundidad),
  // así se sienten montados en SU edificio, no todos a la misma distancia (H1, revisión 25/9).
  // El tilt (rotateY, o rotate en modo ?signs=2d) se lee una vez de la custom property y se hornea en
  // el string de transform: si se pisa solo con translate(), el style inline gana a la regla CSS de
  // .sign y el letrero pierde la inclinación por completo.
  const isFlat = document.documentElement.classList.contains('signs-2d')
  const depthTable = SIGN_DEPTH[isMobileLayout ? 'mobile' : 'desktop']
  const signs = [...document.querySelectorAll('.sign')].map((el) => {
    const route = el.dataset.route || 'home'
    const angleProp = isFlat ? '--rz' : '--ry'
    const angle = getComputedStyle(el).getPropertyValue(angleProp).trim() || '0deg'
    return { el, depthMul: depthTable[route] ?? 1, rotate: isFlat ? `rotate(${angle})` : `rotateY(${angle})` }
  })
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
    // fuera de Inicio (galería, Biografía, Contacto) el hero está tapado/oculto: sin esto el shader
    // seguía dibujándose a pantalla completa cada frame por nada (GPU + batería, clave en móvil).
    // stage.render() deja de dibujar cuando no queda ninguna malla visible.
    mesh.visible = !heroEl?.hidden
    if (!mesh.visible) return
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
    // los letreros siguen la intensidad del PERSONAJE (kChar) × su propia profundidad
    if (signs.length && kChar > 0) {
      if (!heroW) measure() // layout puede no estar listo en el init
      const lx = hm.x + Math.sin(time * 0.25) * 0.18
      const ly = hm.y + Math.cos(time * 0.2) * 0.18
      for (const s of signs) {
        const m = kChar * s.depthMul
        s.el.style.transform = `translate(${(-lx * m * heroW).toFixed(2)}px, ${(-ly * m * heroH).toFixed(2)}px) ${s.rotate}`
      }
    }
  })
}
