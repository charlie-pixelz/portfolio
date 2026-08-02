// bio.js — P3.C: página Biografía en "modo rayos X" (ART_DIR §6.4 / ADENDUM §4).
// La escena es el esqueleto verde fósforo (misma pose que el hero). Al entrar: encendido de
// máquina de rayos X (flicker duro, en CSS) → las cajas capa-OS "salen" desde puntos del
// esqueleto hacia afuera (con un cable conector) y el texto se escribe con efecto teclado.
// Herramientas: cada ícono hace pop antes de aparecer su nombre. reduced-motion → todo directo.

import { gsap } from 'gsap'
import { quality } from '../core/quality.js'

const iconUrls = import.meta.glob('../../assets/icons/icon_*.png', { eager: true, query: '?url', import: 'default' })
const iconFor = (f) => Object.entries(iconUrls).find(([p]) => p.endsWith('/' + f))?.[1] || ''

const TOOLS = [
  ['Illustrator', 'icon_Illustrator.png'],
  ['Photoshop', 'icon_Photoshop.png'],
  ['After Effects', 'icon_AfterEffects.png'],
  ['Premiere Pro', 'icon_Premiere.png'],
  ['Figma', 'icon_Figma.png'],
  ['Adobe Xd', 'icon_AdobeXd.png'],
  ['Dreamweaver', 'icon_Dreamweaver.png'],
  ['Claude', 'icon_Claude.png'],
  ['Higgsfield', 'icon_Higgsfield.png'],
  ['Kling AI', 'icon_Kling.png'],
  ['Magnific', 'icon_Magnific.png'],
]

const CONTENT = {
  es: {
    title: '¿Quién es Charlie?',
    // (2/8) 2.ª redacción del docx — reemplaza la versión resumida del 1/8
    about:
      'Soy desarrollador, diseñador e ilustrador chileno, con 9 años entre retail, consultoras, productoras y startups. Mi trabajo cruza ilustración de personajes, piezas publicitarias, dirección de marca y motion graphics, sostenido por criterio humano: pensamiento crítico y ojo de diseñador, para decidir qué funciona y cómo puede funcionar mejor. Actualmente uso la IA como otra herramienta en mi flujo creativo sin reducir la calidad de mi trabajo.',
    toolsTitle: 'Herramientas',
    skillsTitle: 'Habilidades',
    skills: [
      'Dirección de arte y desarrollo de marca',
      'Ilustración de personajes y diseño gráfico 2D',
      'Motion graphics y animación',
      'Diseño web y UX/UI',
      'Integración estratégica de IA generativa',
    ],
  },
  en: {
    title: 'Who is Charlie?',
    about:
      "I'm a Chilean developer, designer and illustrator with 9 years across retail, consulting, production studios and startups. My work spans character illustration, advertising pieces, brand direction and motion graphics, held together by human judgment: critical thinking and a designer's eye for what works and how it can work better. Recently added generative AI to my creative process without lowering the quality of my work.",
    toolsTitle: 'Tools',
    skillsTitle: 'Skills',
    skills: [
      'Art direction & brand development',
      'Character illustration & 2D graphic design',
      'Motion graphics & animation',
      'Web design & UX/UI',
      'Strategic integration of generative AI tools',
    ],
  },
}

export function initBio({ lang, isMobile = false }) {
  const el = document.querySelector('.bio')
  if (!el) return null
  const c = CONTENT[lang] || CONTENT.es
  const scene = el.querySelector('.bio__scene')
  const wires = el.querySelector('.bio__wires')
  const titleEl = el.querySelector('.bio__title')
  const textEl = el.querySelector('.bio__text')
  const toolsTitleEl = el.querySelector('.bio__box--tools .bio__box-title')
  const skillsTitleEl = el.querySelector('.bio__box--skills .bio__box-title')
  const toolsUl = el.querySelector('.bio__tools')
  const skillsUl = el.querySelector('.bio__skills')
  const boxes = [...el.querySelectorAll('.bio__box')]
  const aboutBox = el.querySelector('.bio__box--about')
  const rings = [...el.querySelectorAll('.bio__ring')]

  // zonas del esqueleto (en % de la escena) a las que apunta cada cable. Medidas por análisis de
  // píxeles de bio_desktop_2400w.webp (no a ojo): el cuello real está en y≈65-67% (antes 41%,
  // que caía en plena cara); la cabeza en y≈30-35% (antes 26%, que caía por ENCIMA del cráneo,
  // en el fondo); el hombro derecho del personaje en y≈73-75%, x≈32-40% (antes y=54%, altura de
  // mitad de cuello, muy por encima del hombro real). Esto era la causa de que los cables
  // "no se mostraran bien" — apuntaban a partes equivocadas del cuerpo.
  const ANCHORS_DESKTOP = { about: [49, 66], tools: [50, 32], skills: [37, 74] }
  // mobile: anclas medidas sobre el render REAL (bio_mobile_desktop_4602w.webp con `cover` en
  // 100vw×100svh), no sobre la maqueta — el encuadre no es el mismo. Los aros del HTML usan estas
  // MISMAS coordenadas.
  // Calibrados TODOS en el viewport real de Charlie (425×767) y verificados a ojo sobre el render
  // en vivo — no reconstruyendo la imagen aparte. El método bueno: superponer aros candidatos
  // sobre la página real y comparar en una captura; reconstruir el `cover` en un <canvas> aparte
  // me dio dos veces coordenadas desplazadas (el bounding-box de la máscara oscura englobaba
  // AMBAS cuencas y el centroide caía en el puente nasal).
  //   tools  → cuenca del ojo izquierda del cráneo.
  //   about  → cuello, lado izquierdo.
  //   skills → cabeza del húmero (hombro derecho). x=92% no es solo anatomía: la caja de
  //            Habilidades termina en x=87%, así que el ancla necesita separarse lo suficiente
  //            para que el TRAMO HORIZONTAL del cable se vea (5 puntos). Con el ancla a 87.5% el
  //            codo medía 0.5 puntos y el cable parecía una línea recta. y=80% lo despeja de la
  //            caja de Herramientas, que termina en 75% de alto en este viewport.
  const ANCHORS_MOBILE = { tools: [35, 43], about: [30, 64], skills: [92, 80] }
  const ANCHORS = isMobile ? ANCHORS_MOBILE : ANCHORS_DESKTOP

  // texto estático (títulos de caja + nombres de herramientas no cambian por idioma)
  toolsTitleEl.textContent = c.toolsTitle
  skillsTitleEl.textContent = c.skillsTitle
  toolsUl.innerHTML = TOOLS.map(
    ([name, file]) =>
      `<li class="bio__tool"><img class="bio__tool-ico" src="${iconFor(file)}" alt="" width="40" height="40" loading="lazy"><span class="bio__tool-name">${name}</span></li>`,
  ).join('')
  skillsUl.innerHTML = c.skills.map((s) => `<li>${s}</li>`).join('')

  // Los cables son líneas ORTOGONALES delgadas (sin círculo en el extremo) que apuntan a zonas
  // concretas del esqueleto. SVG con viewBox 0..100 (x e y independientes).
  // Cables mobile — geometría de las maquetas (31/7): SIEMPRE 2 tramos ortogonales, empezando en
  // el ancla (el trazo nace del esqueleto) y entrando a la caja por el borde que le corresponde:
  //   tools  (panel derecho, Mobile-03): sube por el eje del ancla → entra por el borde IZQUIERDO
  //   skills (caja angosta arriba, Mobile-02): sube por el eje del ancla → entra por el DERECHO
  //   about  (caja ancha arriba, Mobile-01): va en horizontal hasta un carril cerca del borde
  //          izquierdo de la caja → sube y entra por ABAJO
  // Antes había un tramo extra (codo doble) en tools y una entrada centrada por abajo en los otros
  // dos: eso era lo que a Charlie "no le convencían las strings".
  const drawWireMobile = (key) => {
    const a = ANCHORS[key]
    const box = el.querySelector(`.bio__box--${key}`)
    const wire = wires.querySelector(`.bio__wire[data-for="${key}"]`)
    if (!a || !box || !wire) return
    const sr = scene.getBoundingClientRect()
    const br = box.getBoundingClientRect()
    const boxTop = ((br.top - sr.top) / sr.height) * 100
    const boxBottom = ((br.bottom - sr.top) / sr.height) * 100
    const boxLeft = ((br.left - sr.left) / sr.width) * 100
    const boxRight = ((br.right - sr.left) / sr.width) * 100
    const p = (x, y) => `${x.toFixed(2)},${y.toFixed(2)}`
    let pts
    if (key === 'about') {
      const laneX = boxLeft + 5 // carril vertical pegado al borde izquierdo, como en la maqueta
      pts = `${p(a[0], a[1])} ${p(laneX, a[1])} ${p(laneX, boxBottom)}`
    } else {
      // entra por el lateral, a un octavo de la altura de la caja desde arriba (maquetas 02/03)
      const entryY = boxTop + (boxBottom - boxTop) * 0.13
      const edgeX = key === 'tools' ? boxLeft : boxRight
      pts = `${p(a[0], a[1])} ${p(a[0], entryY)} ${p(edgeX, entryY)}`
    }
    wire.setAttribute('points', pts)
  }

  const drawWires = () => {
    wires.innerHTML = ''
    const sr = scene.getBoundingClientRect()
    boxes.forEach((box) => {
      const key = box.dataset.anchor
      const a = ANCHORS[key]
      if (!a) return
      const line = document.createElementNS('http://www.w3.org/2000/svg', 'polyline')
      line.setAttribute('fill', 'none')
      line.setAttribute('class', 'bio__wire')
      line.dataset.for = key
      wires.append(line) // primero en el DOM (vacío) — drawWireMobile() lo necesita para medir

      if (isMobile) {
        drawWireMobile(key)
        return
      }

      const br = box.getBoundingClientRect()
      const boxTop = ((br.top - sr.top) / sr.height) * 100
      const boxBottom = ((br.bottom - sr.top) / sr.height) * 100
      const leftX = ((br.left - sr.left) / sr.width) * 100
      const rightX = ((br.right - sr.left) / sr.width) * 100
      const exitLeft = key !== 'about' // about mira al esqueleto por su derecha; el resto por la izquierda
      // el trazo empieza en el ANCLA (esqueleto) y termina en la caja — se "dibuja" naciendo del
      // centro y llegando a la caja, no al revés (pedido de Charlie 28/7)
      let pts
      if (a[1] < boxTop - 8) {
        // objetivo CLARAMENTE por encima de la caja: sube y entra por ARRIBA. Umbral (-8) a
        // propósito: si el ancla está solo un poco por encima del borde (como Habilidades, casi
        // a la misma altura), el codo de este camino queda de 1% y no se nota — mejor que caiga
        // al codo lateral de abajo, que siempre fuerza un tramo vertical visible.
        const ex = exitLeft ? leftX + (rightX - leftX) * 0.16 : rightX - (rightX - leftX) * 0.16
        pts = `${a[0]},${a[1]} ${ex.toFixed(2)},${a[1]} ${ex.toFixed(2)},${boxTop.toFixed(2)}`
      } else {
        // objetivo a la altura de la caja: entra por el LATERAL con un codo de 90° SIEMPRE visible
        // (si el ancla ya cae dentro del rango vertical de la caja, un codo "a secas" colapsa y el
        // cable queda recto). El codo se desplaza un tramo CORTO Y FIJO (8pt) desde el ancla, hacia
        // el centro vertical de la caja — no hacia su borde superior: con cajas altas (About ahora
        // se centra en toda la columna) entrar siempre por arriba obligaba a un rodeo larguísimo
        // (p.ej. el cuello, y=66, subiendo hasta el techo de la caja en y=19).
        const ex = exitLeft ? leftX : rightX
        // dirección del codo FIJA por caja (no derivada de comparar con el centro de la caja):
        // Herramientas/Habilidades se centran como grupo flex → su posición en px varía un poco
        // entre ES/EN según el largo del contenido, y comparar contra su centro podía cruzar el
        // umbral y voltear el codo de un idioma a otro (bug real: "Tools" salía al revés en EN).
        const DIR = { about: -1, tools: -1, skills: 1 }
        const ey = Math.min(Math.max(a[1] + DIR[key] * 8, boxTop + 5), boxBottom - 5)
        pts = `${a[0]},${a[1]} ${a[0]},${ey.toFixed(2)} ${ex.toFixed(2)},${ey.toFixed(2)}`
      }
      line.setAttribute('points', pts)
    })
  }

  // efecto "escritura de teclado". keepCursor → la barra de input sigue parpadeando al terminar.
  const typeInto = (node, text, dur, keepCursor = false) => {
    node.textContent = ''
    node.classList.add('is-typing')
    const o = { n: 0 }
    return gsap.to(o, {
      n: text.length,
      duration: dur,
      ease: 'none',
      onUpdate: () => (node.textContent = text.slice(0, Math.round(o.n))),
      onComplete: () => {
        node.textContent = text
        if (!keepCursor) {
          // 'is-typed' reserva el mismo espacio del cursor (invisible) → sin salto de layout
          node.classList.remove('is-typing')
          node.classList.add('is-typed')
        }
      },
    })
  }

  // deja todo en el estado "apagado" (lo llama el router antes de entrar)
  const prepare = () => {
    titleEl.textContent = ''
    textEl.textContent = ''
    titleEl.classList.remove('is-typing', 'is-typed')
    textEl.classList.remove('is-typing', 'is-typed')
    gsap.set(boxes, { opacity: 0 })
    gsap.set(el.querySelectorAll('.bio__tool'), { opacity: 0 })
    gsap.set(el.querySelectorAll('.bio__skills li'), { opacity: 0 })
    const w = wires ? [...wires.children] : []
    if (w.length) gsap.set(w, { opacity: 0 })
    if (aboutBox) aboutBox.style.minHeight = ''
    scene?.classList.remove('is-on', 'is-off')
    activeKey = null
    gsap.set(rings, { opacity: 1 }) // leave() los apaga; reset acá para la próxima entrada
    rings.forEach((r) => {
      r.classList.remove('is-active')
      r.setAttribute('aria-pressed', 'false')
    })
  }

  // ── MOBILE: una caja visible a la vez, activada por los aros (no por timeline automático) ──
  let activeKey = null

  const setRingActive = (key) => {
    rings.forEach((r) => {
      const on = r.dataset.anchor === key
      r.classList.toggle('is-active', on)
      r.setAttribute('aria-pressed', String(on))
    })
  }

  const childrenFor = (key) =>
    key === 'tools' ? el.querySelectorAll('.bio__tool') : key === 'skills' ? el.querySelectorAll('.bio__skills li') : []

  const showBoxMobile = (key, instant = false) => {
    const box = el.querySelector(`.bio__box--${key}`)
    if (!box) return
    gsap.set(childrenFor(key), { opacity: 1, x: 0 }) // aparecen JUNTO con la caja (sin stagger)
    const wire = wires.querySelector(`.bio__wire[data-for="${key}"]`)
    if (instant || quality.reducedMotion) {
      gsap.set(box, { opacity: 1, scale: 1 })
      if (wire) {
        wire.style.strokeDasharray = 'none'
        gsap.set(wire, { opacity: 1 })
      }
      return
    }
    gsap.set(box, { opacity: 0, scale: 0.4 })
    if (wire) {
      const len = wire.getTotalLength ? wire.getTotalLength() : 60
      wire.style.strokeDasharray = len
      wire.style.strokeDashoffset = len
      wire.style.opacity = 1
      gsap
        .timeline()
        .to(wire, { strokeDashoffset: 0, duration: 0.32, ease: 'power1.in' })
        .to(box, { opacity: 1, scale: 1, duration: 0.24, ease: 'back.out(1.6)' })
    } else {
      gsap.to(box, { opacity: 1, scale: 1, duration: 0.24, ease: 'back.out(1.6)' })
    }
  }

  const hideBoxMobile = (key) => {
    const box = el.querySelector(`.bio__box--${key}`)
    const wire = wires.querySelector(`.bio__wire[data-for="${key}"]`)
    const targets = [box, wire].filter(Boolean)
    if (targets.length) gsap.to(targets, { opacity: 0, duration: 0.16, ease: 'power2.in' })
  }

  // caja activa por defecto = About ("¿Quién es Charlie?"), pedido explícito de Charlie (30/7)
  const activateAnchor = (key, instant = false) => {
    if (key === activeKey) return
    if (activeKey) hideBoxMobile(activeKey)
    activeKey = key
    setRingActive(key)
    showBoxMobile(key, instant)
  }
  rings.forEach((ring) => ring.addEventListener('click', () => activateAnchor(ring.dataset.anchor)))

  const revealMobile = () => {
    // contenido completo desde el inicio: la interacción se repite en cada tap, tipear de nuevo
    // cada vez se sentiría lento — el patrón "línea → caja" (pedido de Charlie) ya aporta el ritmo.
    titleEl.textContent = c.title
    textEl.textContent = c.about
    drawWires()
    gsap.set(boxes, { opacity: 0, scale: 1, x: 0, y: 0 })
    scene?.classList.remove('is-on', 'is-off')
    if (quality.reducedMotion) {
      scene?.classList.add('is-on')
      activateAnchor('about', true)
      return
    }
    void scene?.offsetWidth
    scene?.classList.add('is-on')
    gsap.delayedCall(0.56, () => activateAnchor('about')) // arranca al asentarse el flicker
  }

  // secuencia completa de encendido + cajas + tipeo (DESKTOP)
  const reveal = () => {
    if (isMobile) return revealMobile()
    // rellena el texto para medir la altura REAL de las cajas (la de About crece con el párrafo)
    // y dibujar los cables al punto correcto → luego se vacía para el tipeo.
    titleEl.textContent = c.title
    textEl.textContent = c.about
    drawWires()
    // fija la altura FINAL de la caja About (con el párrafo completo) como mínimo antes de vaciar
    // el texto para el tipeo — si no, la caja "colapsa" a casi nada (solo el título vacío) durante
    // el pop y luego crece de golpe a medida que se tipea, dando el efecto de "aparece arriba,
    // lejos de donde empieza la caja real" que reportó Charlie.
    if (aboutBox) aboutBox.style.minHeight = aboutBox.getBoundingClientRect().height + 'px'
    const wireEls = [...wires.querySelectorAll('.bio__wire')]
    if (quality.reducedMotion) {
      gsap.set(boxes, { opacity: 1, x: 0, y: 0, scale: 1 })
      gsap.set(['.bio__tool', '.bio__skills li'], { opacity: 1 })
      wireEls.forEach((w) => (w.style.strokeDasharray = 'none'))
      gsap.set(wireEls, { opacity: 1 })
      return
    }
    titleEl.textContent = ''
    textEl.textContent = ''
    // encendido de la máquina de rayos X (flicker CSS)
    scene?.classList.remove('is-on', 'is-off')
    void scene?.offsetWidth
    scene?.classList.add('is-on')

    // prepara el "trazo" de cada cable: dasharray = longitud → se dibuja animando el offset a 0.
    // el punto de partida del path es el ANCLA (drawWires ya lo deja así) → el trazo nace del
    // esqueleto y avanza hacia la caja.
    wireEls.forEach((w) => {
      const len = w.getTotalLength ? w.getTotalLength() : 60
      w.style.strokeDasharray = len
      w.style.strokeDashoffset = len
      w.style.opacity = 1
    })
    gsap.set(boxes, { opacity: 0, scale: 0.4, x: 0, y: 0 })

    // las 3 cajas aparecen UNA DESPUÉS DE OTRA (cable + caja + contenido completo) — no en
    // paralelo. Charlie aclaró (29/7) que "se centran como grupo" era solo sobre los márgenes
    // exteriores (arriba de Herramientas == abajo de Habilidades), no sobre el orden de aparición.
    const WIRE_DUR = 0.32
    const POP_DUR = 0.24
    const GAP = 0.25 // pausa entre el fin de una caja y el inicio de la siguiente
    const TITLE_DUR = 0.96
    const TITLE_TO_TEXT_GAP = 0.14
    const TEXT_DUR = 3.04
    const TOOLS_STAGGER = 0.048
    const TOOLS_DUR = 0.256
    const SKILLS_STAGGER = 0.072
    const SKILLS_DUR = 0.24

    const tl = gsap.timeline({ delay: 0.56 }) // arranca al asentarse el flicker
    let t = 0
    boxes.forEach((box) => {
      const key = box.dataset.anchor
      const wire = wires.querySelector(`.bio__wire[data-for="${key}"]`)
      if (wire) tl.to(wire, { strokeDashoffset: 0, duration: WIRE_DUR, ease: 'power1.in' }, t)
      tl.to(box, { opacity: 1, scale: 1, duration: POP_DUR, ease: 'back.out(1.6)' }, t + WIRE_DUR)
      t += WIRE_DUR + POP_DUR
      if (key === 'about') {
        tl.add(() => typeInto(titleEl, c.title, TITLE_DUR), t)
        t += TITLE_DUR + TITLE_TO_TEXT_GAP
        tl.add(() => typeInto(textEl, c.about, TEXT_DUR, true), t)
        t += TEXT_DUR
      } else if (key === 'tools') {
        tl.to(
          '.bio__tool',
          { opacity: 1, scale: 1, duration: TOOLS_DUR, ease: 'back.out(2)', stagger: TOOLS_STAGGER, startAt: { scale: 0.3 } },
          t,
        )
        t += (TOOLS.length - 1) * TOOLS_STAGGER + TOOLS_DUR
      } else if (key === 'skills') {
        tl.to('.bio__skills li', { opacity: 1, x: 0, duration: SKILLS_DUR, stagger: SKILLS_STAGGER, startAt: { x: -12 } }, t)
        t += (c.skills.length - 1) * SKILLS_STAGGER + SKILLS_DUR
      }
      t += GAP
    })
  }

  // apagado: primero se van las cajas/cables (rápido), y RECIÉN AHÍ parpadea el esqueleto SOLO
  // (antes se desvanecía todo junto con bio.el y el parpadeo casi no se veía). onDone se llama
  // cuando el flicker de apagado (CSS, ~0.95s) termina — el router oculta bio.el ahí.
  const leave = (onDone) => {
    if (quality.reducedMotion) {
      scene?.classList.remove('is-on', 'is-off')
      onDone?.()
      return
    }
    const wireEls = [...wires.querySelectorAll('.bio__wire')]
    // los aros (mobile) se apagan JUNTO con cajas/cables — antes se quedaban encendidos durante
    // TODO el flicker de apagado del esqueleto (950ms) y recién desaparecían de golpe al ocultar
    // .bio entero: se veían "flotando" sobre un esqueleto que ya se estaba yendo (Charlie 1/8).
    gsap.to([...boxes, ...wireEls, ...rings], {
      opacity: 0,
      duration: 0.22,
      ease: 'power2.in',
      onComplete: () => {
        scene?.classList.remove('is-on')
        void scene?.offsetWidth
        scene?.classList.add('is-off')
        setTimeout(() => onDone?.(), 950) // dura lo mismo que la animación bioXrayOff (CSS)
      },
    })
  }

  // redibuja los cables al redimensionar (las cajas se mueven con la escena)
  let rt
  addEventListener('resize', () => {
    clearTimeout(rt)
    rt = setTimeout(() => { if (!el.hidden) drawWires() }, 150)
  }, { passive: true })

  return { el, prepare, reveal, leave }
}
