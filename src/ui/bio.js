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
    about:
      'Soy un desarrollador, diseñador e ilustrador chileno, con 9 años de trayectoria entre retail, consultoras, productoras y startups. Mi trabajo cruza la ilustración de personajes, la creación de piezas publicitarias, la dirección de marca y el motion graphics, pero lo que sostiene todo es el criterio: no soy solo un ejecutor, tengo pensamiento crítico y un ojo de diseñador extremadamente refinado para decidir qué funciona y por qué. Hoy sumo la IA generativa a mi flujo como una herramienta más — para explorar, generar, iterar y testear más rápido, sin reducir la exigencia ni la calidad con la que siempre trabajo.',
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
      "I'm a Chilean developer, designer and illustrator with 9 years of experience across retail, consultancies, production studios and startups. My work spans character illustration, advertising pieces, brand direction and motion graphics, but what holds it all together is judgment: I'm not just an executor — I have critical thinking and an extremely refined designer's eye to decide what works and why. Today I add generative AI to my workflow as one more tool — to explore, generate, iterate and test faster, without lowering the standard or quality I always work with.",
    toolsTitle: 'Tools',
    skillsTitle: 'Skills',
    skills: [
      'Art direction & brand development',
      'Character illustration & 2D graphic design',
      'Motion graphics & animation',
      'Web design & UX/UI',
      'Strategic integration of generative AI',
    ],
  },
}

export function initBio({ lang }) {
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

  // zonas del esqueleto (en % de la escena) a las que apunta cada cable. Medidas por análisis de
  // píxeles de bio_desktop_2400w.webp (no a ojo): el cuello real está en y≈65-67% (antes 41%,
  // que caía en plena cara); la cabeza en y≈30-35% (antes 26%, que caía por ENCIMA del cráneo,
  // en el fondo); el hombro derecho del personaje en y≈73-75%, x≈32-40% (antes y=54%, altura de
  // mitad de cuello, muy por encima del hombro real). Esto era la causa de que los cables
  // "no se mostraran bien" — apuntaban a partes equivocadas del cuerpo.
  const ANCHORS = { about: [49, 66], tools: [50, 32], skills: [37, 74] }

  // texto estático (títulos de caja + nombres de herramientas no cambian por idioma)
  toolsTitleEl.textContent = c.toolsTitle
  skillsTitleEl.textContent = c.skillsTitle
  toolsUl.innerHTML = TOOLS.map(
    ([name, file]) =>
      `<li class="bio__tool"><img class="bio__tool-ico" src="${iconFor(file)}" alt="" width="40" height="40" loading="lazy"><span class="bio__tool-name">${name}</span></li>`,
  ).join('')
  skillsUl.innerHTML = c.skills.map((s) => `<li>${s}</li>`).join('')

  // dibuja los cables conectores como líneas ORTOGONALES delgadas (sin círculo en el extremo),
  // que apuntan a zonas concretas del esqueleto. SVG con viewBox 0..100 (x e y independientes).
  const drawWires = () => {
    wires.innerHTML = ''
    const sr = scene.getBoundingClientRect()
    boxes.forEach((box) => {
      const key = box.dataset.anchor
      const a = ANCHORS[key]
      if (!a) return
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
      const line = document.createElementNS('http://www.w3.org/2000/svg', 'polyline')
      line.setAttribute('points', pts)
      line.setAttribute('fill', 'none')
      line.setAttribute('class', 'bio__wire')
      line.dataset.for = key
      wires.append(line)
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
  }

  // secuencia completa de encendido + cajas + tipeo
  const reveal = () => {
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
    gsap.to([...boxes, ...wireEls], {
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
