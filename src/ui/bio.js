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

  // zonas del esqueleto (en % de la escena) a las que apunta cada cable (ref. maqueta):
  // ¿Quién es? → cuello · Herramientas → cabeza · Habilidades → hombro derecho (del personaje)
  const ANCHORS = { about: [50, 41], tools: [50, 26], skills: [40, 54] }

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
      if (a[1] < boxTop) {
        // objetivo por encima de la caja (Habilidades → hombro): sube desde el hombro y entra por ARRIBA
        const ex = exitLeft ? leftX + (rightX - leftX) * 0.16 : rightX - (rightX - leftX) * 0.16
        pts = `${a[0]},${a[1]} ${ex.toFixed(2)},${a[1]} ${ex.toFixed(2)},${boxTop.toFixed(2)}`
      } else {
        // objetivo a la altura de la caja: baja/sube desde el ancla y entra por el LATERAL
        const ex = exitLeft ? leftX : rightX
        const ey = Math.min(Math.max(a[1], boxTop + 5), boxBottom - 5)
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
        if (!keepCursor) node.classList.remove('is-typing')
      },
    })
  }

  // deja todo en el estado "apagado" (lo llama el router antes de entrar)
  const prepare = () => {
    titleEl.textContent = ''
    textEl.textContent = ''
    titleEl.classList.remove('is-typing')
    textEl.classList.remove('is-typing')
    gsap.set(boxes, { opacity: 0 })
    gsap.set(el.querySelectorAll('.bio__tool'), { opacity: 0 })
    gsap.set(el.querySelectorAll('.bio__skills li'), { opacity: 0 })
    const w = wires ? [...wires.children] : []
    if (w.length) gsap.set(w, { opacity: 0 })
    scene?.classList.remove('is-on', 'is-off')
  }

  // secuencia completa de encendido + cajas + tipeo
  const reveal = () => {
    // rellena el texto para medir la altura REAL de las cajas (la de About crece con el párrafo)
    // y dibujar los cables al punto correcto → luego se vacía para el tipeo.
    titleEl.textContent = c.title
    textEl.textContent = c.about
    drawWires()
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

    // orden pedido: el cable SE DIBUJA primero (nace del centro, llega a la caja) y RECIÉN AHÍ
    // aparece la caja en su extremo — no simultáneo ni al revés.
    const tl = gsap.timeline({ delay: 0.7 }) // arranca al asentarse el flicker (antes 0.9)
    boxes.forEach((box, i) => {
      const wire = wires.querySelector(`.bio__wire[data-for="${box.dataset.anchor}"]`)
      if (wire) tl.to(wire, { strokeDashoffset: 0, duration: 0.4, ease: 'power1.in' }, i === 0 ? undefined : '-=0.1')
      tl.to(box, { opacity: 1, scale: 1, duration: 0.3, ease: 'back.out(1.6)' })
    })
    // tipeo del título + párrafo (caja about) — pausado; el párrafo conserva la barra parpadeando
    tl.add(() => typeInto(titleEl, c.title, 1.2), '>-0.1')
    tl.add(() => typeInto(textEl, c.about, 3.8, true), '>0.2')
    // herramientas: pop de íconos escalonado, luego su nombre
    tl.to('.bio__tool', { opacity: 1, scale: 1, duration: 0.32, ease: 'back.out(2)', stagger: 0.06, startAt: { scale: 0.3 } }, '<0.1')
    // habilidades: entran en cascada
    tl.to('.bio__skills li', { opacity: 1, x: 0, duration: 0.3, stagger: 0.09, startAt: { x: -12 } }, '<0.2')
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
