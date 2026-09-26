// P1.B — Hero con profundidad, versión MULTI-CAPA (sin fantasma) + depth map real (H1, revisión 25/9).
// Un shader compone dos planos: fondo (opaco, con desplazamiento POR PROFUNDIDAD según el depth map
// real — los edificios cercanos se mueven más que el fondo de la calle) + personaje (alpha, plano
// único). Como el fondo tiene data real detrás del personaje, al moverse no lo duplica.
// Fallback: reduced-motion / tier low → strengths 0 (estático). Sin WebGL → clase CSS.

import { Program, Mesh, Plane, Texture } from 'ogl'
import { gsap } from 'gsap'
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
  uniform float uDrift;  // 1 = deriva ambiental normal · 0 = quieto (la lente de rayos X lo apaga al expandirse)
  // B4 — lente de rayos X: muestra la radiografía (alineada al píxel con el hero, ADENDUM §4) dentro
  // de un círculo. uLens = centro en coordenadas de la imagen (y hacia arriba), uLensR = radio en
  // altos de imagen, uLensFill = 0..1 cuánto se completó la expansión a pantalla completa.
  uniform sampler2D uXray;
  uniform vec2 uLens;
  uniform float uLensR;
  uniform float uLensFill;
  uniform float uVBlur; // T3: desenfoque vertical del barrido a Contacto, en px de pantalla (0 = nítido)
  uniform float uWipe; // celular: altura ya escaneada desde arriba (0..1), la radiografía queda por encima
  varying vec2 vUv;

  float hash(vec2 p) { return fract(sin(dot(p, vec2(41.31, 289.17))) * 43758.5453); }

  // compone fondo (desplazado píxel a píxel según el depth map) + personaje (alpha, plano único)
  vec3 scene(vec2 uv, vec2 look) {
    vec4 ch = texture2D(uChar, uv + look * uStrengthChar);
    // blanco = cerca, negro = lejos (mismo criterio que ADENDUM §4/ART_DIR). El punto de fuga de la
    // calle queda ~0 → no se mueve (ancla natural); lo más cercano del fondo se mueve al pico.
    float depth = clamp(texture2D(uDepth, uv).r * uDepthNorm, 0.0, 1.0);
    // uDepth es un mapa SOLO del fondo (hero_bgdepth): la silueta del personaje, que en el depth
    // map original ocupa el extremo blanco, viene rellenada con la profundidad de la calle que la
    // rodea. Con el mapa original el fondo leía esa silueta como "lo más cercano" y se desplazaba
    // de más justo en el contorno (aro); enmascararlo en el shader solo movía el borde de lugar.
    vec2 bgOffset = look * uStrengthBg * depth;
    vec3 bg = texture2D(uBg, uv + bgOffset).rgb;
    return mix(bg, ch.rgb, ch.a);
  }

  void main() {
    // contain: la ilustración se ve completa (aspect-lock). Barras --void donde sobra,
    // para que la nav diegética caiga exacta sobre los edificios (ADENDUM §1).
    // al completarse la lente, las barras toman el fondo de Biografía (#000206): el cambio a esa
    // página no se nota
    vec3 voidc = mix(vec3(0.0, 0.0039, 0.0824), vec3(0.0, 0.0078, 0.0235), uLensFill); // #000115 → #000206
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
    vec2 look = uMouse + drift * uDrift;

    vec3 comp;
    if (g > 0.001) {
      float ca = 0.006 * g; // aberración cromática (separa R/B)
      comp.r = scene(suv + vec2(ca, 0.0), look).r;
      comp.g = scene(suv, look).g;
      comp.b = scene(suv - vec2(ca, 0.0), look).b;
      float st = hash(cuv * vec2(420.0, 320.0) + uTime); // estática
      comp += (st - 0.5) * 0.35 * g;
    } else if (uVBlur > 0.3) {
      // T3: el barrido a Contacto desenfocaba el canvas con filter: blur() de CSS (lo más caro de
      // toda la navegación en celular). Acá son 7 muestras en vertical, en la GPU.
      float stepv = uVBlur / (uResolution.y * scale.y) / 3.0;
      comp = vec3(0.0);
      for (int i = -3; i <= 3; i++) comp += scene(suv + vec2(0.0, float(i) * stepv), look);
      comp /= 7.0;
    } else {
      comp = scene(suv, look);
    }

    if (uLensR > 0.0005) {
      vec2 d = (cuv - uLens) * vec2(ia, 1.0);
      float dist = length(d);
      float px = 1.0 / (uResolution.y * scale.y); // un píxel de pantalla, en altos de imagen
      float inside = 1.0 - smoothstep(uLensR - px * 1.5, uLensR, dist);
      // la radiografía se mueve con el PERSONAJE (el esqueleto va debajo de él)
      vec3 xr = texture2D(uXray, suv + look * uStrengthChar).rgb;
      comp = mix(comp, xr, inside);
      // aro fósforo de ~2 px con un halo corto; se apaga al completarse la expansión
      float e = abs(dist - uLensR);
      float ring = (1.0 - smoothstep(px, px * 2.5, e)) + exp(-e / (px * 9.0)) * 0.3;
      comp += vec3(0.2, 1.0, 0.4) * ring * (1.0 - uLensFill);
    }

    if (uWipe > 0.0005) {
      float px = 1.0 / (uResolution.y * scale.y);
      float fromTop = 1.0 - cuv.y;
      float above = 1.0 - smoothstep(uWipe - px, uWipe, fromTop);
      vec3 xr = texture2D(uXray, suv + look * uStrengthChar).rgb;
      comp = mix(comp, xr, above);
      // línea de escaneo (misma que la de la página) + estela tenue sobre lo recién expuesto
      float e = abs(fromTop - uWipe);
      float line = (1.0 - smoothstep(px, px * 2.5, e)) + exp(-e / (px * 14.0)) * 0.35;
      float trail = above * exp(-(uWipe - fromTop) / 0.07) * 0.14;
      comp += vec3(0.2, 1.0, 0.4) * (line + trail) * (1.0 - uLensFill);
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

// B4 — lente de rayos X (solo desktop). El router la usa como transición Inicio ↔ Biografía cuando
// está lista; si no (celular, movimiento reducido, textura sin bajar), sigue con el fundido.
// T3 — el router pide el desenfoque del barrido a Contacto en px (lo aplica el shader, no CSS)
export const heroFx = { blur: () => {} }
export const heroLens = { ready: false, expand: (done) => done(), contract: (done) => done() }
// centro del cráneo en la imagen (x desde la izquierda, y desde ABAJO), medido sobre bio_desktop_2400w
const HEAD = [0.495, 0.574]
const LENS_R = 0.15 // radio de la lente al pasar por el letrero, en altos de imagen
const LENS_FULL = 1.15 // radio que cubre todo el encuadre desde el cráneo (esquina más lejana ≈ 1.0)

export function initHero(bgUrl, charUrl, depthUrl, xrayUrl) {
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
  const uXray = new Texture(gl, texOpts)

  const isMobileLayout = document.documentElement.classList.contains('is-mobile')

  // (31/7) `still` ya NO incluye tier low. El parallax de este shader son dos uniforms: cambiar su
  // valor no cuesta ni un draw call más, así que apagarlo en tier low no ahorraba nada y sí dejaba
  // el hero (la pieza central del sitio) completamente muerto en la mayoría de los teléfonos
  // reales, que caen en 'low' por deviceMemory ≤ 4 GB. Ahora tier low = parallax a la mitad.
  const still = quality.reducedMotion
  const normal = new URLSearchParams(location.search).get('parallax') === 'normal'
  // ?pk=N multiplica la intensidad sobre el default, para probar valores en vivo (tope 8). Con
  // valores altos el borde de la textura puede estirarse a la vista: es parte de lo que se evalúa.
  const pk = Math.min(8, Math.max(0, Number(new URLSearchParams(location.search).get('pk')) || 1))
  const k = (quality.tier === 'low' ? 0.5 : 1) * pk
  // H1 (revisión 25/9): el fondo se desplaza según el depth map real, no como una lámina plana —
  // el punto de fuga se queda quieto y solo lo cercano se mueve al pico. Intensidad elegida por
  // Charlie probando con ?pk=2 (25/9): ×4 el fondo y ×2 el personaje respecto de antes de H1
  // (0.0208 / 0.0078 desktop). En celular volvió a probar con el giroscopio y pidió otro ×2 (?pk=2
  // sobre el default táctil anterior, 0.044 / 0.008).
  const big = (quality.isTouch ? 0.088 : 0.0832) * k
  const small = (quality.isTouch ? 0.016 : 0.0156) * k
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
      uDrift: { value: 1 },
      uXray: { value: uXray },
      uLens: { value: [...HEAD] },
      uLensR: { value: 0 },
      uLensFill: { value: 0 },
      uWipe: { value: 0 },
      uVBlur: { value: 0 },
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

  heroFx.blur = (px) => (program.uniforms.uVBlur.value = px)

  // ── B4: lente de rayos X ──
  // Desktop: al pasar el cursor por el letrero "Biografía" se abre una lente sobre el cráneo del
  // personaje (el letrero está sobre la calle, no sobre él: una lente bajo el cursor mostraría solo
  // la calle en radiografía). Mover el cursor dentro del letrero la corre un poco, como un visor. Al
  // hacer clic, la lente se expande a toda la pantalla y esa es la transición a Biografía.
  // Celular (sin cursor): la barra de escaneo de Biografía baja por el hero y convierte al personaje
  // en su radiografía en el mismo lugar (la radiografía móvil está alineada con el hero móvil).
  const lensable = !!xrayUrl && !still
  const mode = isMobileLayout ? 'wipe' : 'lens'
  const L = { r: 0, fill: 0, w: 0, x: HEAD[0], y: HEAD[1] }
  const off = { x: 0, y: 0 }
  let hover = false
  let transit = false
  if (lensable) {
    let loading = false
    const loadXray = () => {
      if (loading) return
      loading = true
      const img = new Image()
      img.onload = () => {
        uXray.image = img
        heroLens.ready = true
      }
      img.src = xrayUrl
    }
    // se baja con la primera señal de intención hacia Biografía (letrero o menú) o, si no llega
    // (en celular no hay hover antes del toque), a los pocos segundos: para entonces main.js ya la
    // precargó, así que sale del caché
    const intent = (e) => e.target.closest?.('[data-route="bio"]') && loadXray()
    document.addEventListener('pointerover', intent, { passive: true })
    document.addEventListener('focusin', intent)
    setTimeout(loadXray, 4000)
    if (mode === 'lens' && !quality.isTouch) {
      const bioSign = document.querySelector('.sign[data-route="bio"]')
      bioSign?.addEventListener('pointerenter', () => (hover = true))
      bioSign?.addEventListener('pointerleave', () => (hover = false))
      bioSign?.addEventListener('pointermove', (e) => {
        const r = bioSign.getBoundingClientRect()
        off.x = ((e.clientX - r.left) / r.width - 0.5) * 2
        off.y = -((e.clientY - r.top) / r.height - 0.5) * 2
      })
    }
    const U = program.uniforms
    const D = mode === 'lens' ? 0.62 : 0.8 // el barrido recorre toda la altura: un poco más largo
    heroLens.expand = (done) => {
      transit = true
      if (mode === 'lens') gsap.to(L, { r: LENS_FULL, duration: D, ease: 'power2.in' })
      else gsap.to(L, { w: 1.02, duration: D, ease: 'none' })
      gsap.to(L, { fill: 1, duration: 0.25, delay: D - 0.25, ease: 'none' })
      // al terminar, encuadre idéntico al de la página de Biografía: sin overscan ni deriva
      gsap.to(U.uZoom, { value: 1, duration: D, ease: 'power2.inOut' })
      gsap.to(U.uDrift, {
        value: 0,
        duration: D,
        ease: 'power2.inOut',
        onComplete: () => {
          hover = false
          done()
        },
      })
    }
    // vuelta: arranca completa (misma imagen que la página que se va) y se cierra — la lente sobre
    // el cráneo; el barrido sube devolviendo al personaje
    heroLens.contract = (done) => {
      transit = true
      gsap.to(L, { fill: 0, duration: 0.2, ease: 'none' })
      if (mode === 'lens') gsap.to(L, { r: 0, duration: 0.6, ease: 'power2.out' })
      else gsap.to(L, { w: 0, duration: 0.6, ease: 'none' })
      gsap.to(U.uZoom, { value: 1.05, duration: 0.6, ease: 'power2.inOut' })
      gsap.to(U.uDrift, {
        value: 1,
        duration: 0.6,
        ease: 'power2.inOut',
        onComplete: () => {
          transit = false
          done()
        },
      })
    }
    heroLens.full = () => {
      gsap.killTweensOf([L, U.uZoom, U.uDrift])
      Object.assign(L, { fill: 1, x: HEAD[0], y: HEAD[1] }, mode === 'lens' ? { r: LENS_FULL } : { w: 1.02 })
      U.uZoom.value = 1
      U.uDrift.value = 0
      transit = true
    }
  }

  // El router "asienta" el hero al salir a Biografía (recentra el personaje, sin parallax del
  // mouse) y lo reactiva al volver. Lerp hacia el objetivo para que la vuelta al centro no salte.
  let settled = false
  const hm = { x: 0, y: 0 }
  addEventListener('cp:hero-settle', () => (settled = true))
  addEventListener('cp:hero-resume', () => (settled = false))

  // Reposo (revisión de rendimiento, 26/9): sin nadie moviendo el mouse/teléfono y sin transición
  // en curso, lo único que se mueve es la deriva ambiental — tan lenta (≈0.2 px por paso) que a
  // 8 cuadros/s se ve igual que a 60. Ahí se dibuja 1 de cada ~8 cuadros: menos trabajo del
  // procesador por cuadro (letreros + shader), menos batería, y menos "Total Blocking Time" en
  // PageSpeed (60 → objetivo 85). Cualquier movimiento vuelve al ritmo completo en el acto.
  const IDLE_MS = 125
  let lastDraw = 0

  ticker.add((t, dt) => {
    // fuera de Inicio (galería, Biografía, Contacto) el hero está tapado/oculto: sin esto el shader
    // seguía dibujándose a pantalla completa cada frame por nada (GPU + batería, clave en móvil).
    // stage.render() deja de dibujar cuando no queda ninguna malla visible.
    mesh.visible = !heroEl?.hidden
    stage.hold = false
    if (!mesh.visible) return
    const tx = settled ? 0 : pointer.pos.x
    const ty = settled ? 0 : pointer.pos.y
    const busy =
      Math.abs(tx - hm.x) + Math.abs(ty - hm.y) > 0.0005 ||
      entering ||
      transit ||
      hover ||
      L.r > 0.001 ||
      !!document.body.dataset.transitioning
    stage.calm = !busy
    if (!busy && t - lastDraw < IDLE_MS) {
      stage.hold = true // este cuadro no se dibuja
      return
    }
    lastDraw = t
    const time = t * 0.001
    program.uniforms.uTime.value = time
    hm.x += (tx - hm.x) * 0.12
    hm.y += (ty - hm.y) * 0.12
    program.uniforms.uMouse.value = [hm.x, hm.y]
    if (lensable) {
      if (!transit) {
        const k = 1 - Math.exp(-dt * 12)
        L.r += ((hover && heroLens.ready ? LENS_R : 0) - L.r) * k
        const kp = 1 - Math.exp(-dt * 8)
        L.x += (HEAD[0] + (hover ? off.x * 0.05 : 0) - L.x) * kp
        L.y += (HEAD[1] + (hover ? off.y * 0.04 : 0) - L.y) * kp
      }
      program.uniforms.uLensR.value = L.r < 0.001 ? 0 : L.r
      program.uniforms.uWipe.value = L.w
      program.uniforms.uLensFill.value = L.fill
      program.uniforms.uLens.value = [L.x, L.y]
    }
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
