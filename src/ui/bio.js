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
  ['Premiere', 'icon_Premiere.png'],
  ['Figma', 'icon_Figma.png'],
  ['Adobe XD', 'icon_AdobeXd.png'],
  ['Dreamweaver', 'icon_Dreamweaver.png'],
  ['Claude', 'icon_Claude.png'],
  ['Higgsfield', 'icon_Higgsfield.png'],
  ['Kling', 'icon_Kling.png'],
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

  // puntos del esqueleto (en % de la escena) desde donde "sale" cada caja + su cable
  const ANCHORS = { about: [35, 57], tools: [65, 44], skills: [59, 82] }

  // texto estático (títulos de caja + nombres de herramientas no cambian por idioma)
  toolsTitleEl.textContent = c.toolsTitle
  skillsTitleEl.textContent = c.skillsTitle
  toolsUl.innerHTML = TOOLS.map(
    ([name, file]) =>
      `<li class="bio__tool"><img class="bio__tool-ico" src="${iconFor(file)}" alt="" width="40" height="40" loading="lazy"><span class="bio__tool-name">${name}</span></li>`,
  ).join('')
  skillsUl.innerHTML = c.skills.map((s) => `<li>${s}</li>`).join('')

  // dibuja los cables conectores (SVG, coords en % vía viewBox 0..100)
  const drawWires = () => {
    wires.innerHTML = ''
    boxes.forEach((box) => {
      const key = box.dataset.anchor
      const a = ANCHORS[key]
      if (!a) return
      const br = box.getBoundingClientRect()
      const sr = scene.getBoundingClientRect()
      // punto de la caja más cercano al esqueleto (borde interior, centro vertical)
      const bx = key === 'about' ? ((br.right - sr.left) / sr.width) * 100 : ((br.left - sr.left) / sr.width) * 100
      const by = ((br.top + br.height / 2 - sr.top) / sr.height) * 100
      const ns = 'http://www.w3.org/2000/svg'
      const line = document.createElementNS(ns, 'line')
      line.setAttribute('x1', a[0]); line.setAttribute('y1', a[1])
      line.setAttribute('x2', bx); line.setAttribute('y2', by)
      line.setAttribute('class', 'bio__wire')
      line.dataset.for = key
      const dot = document.createElementNS(ns, 'circle')
      dot.setAttribute('cx', a[0]); dot.setAttribute('cy', a[1]); dot.setAttribute('r', 0.6)
      dot.setAttribute('class', 'bio__node')
      dot.dataset.for = key
      wires.append(line, dot)
    })
  }

  // efecto "escritura de teclado": escribe text en el , con cursor mientras dura
  const typeInto = (node, text, dur) => {
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
        node.classList.remove('is-typing')
      },
    })
  }

  // deja todo en el estado "apagado" (lo llama el router antes de entrar)
  const prepare = () => {
    titleEl.textContent = ''
    textEl.textContent = ''
    gsap.set(boxes, { opacity: 0 })
    gsap.set(el.querySelectorAll('.bio__tool'), { opacity: 0 })
    gsap.set(el.querySelectorAll('.bio__skills li'), { opacity: 0 })
    const w = wires ? [...wires.children] : []
    if (w.length) gsap.set(w, { opacity: 0 })
    scene?.classList.remove('is-on', 'is-off')
  }

  // secuencia completa de encendido + cajas + tipeo
  const reveal = () => {
    drawWires()
    if (quality.reducedMotion) {
      titleEl.textContent = c.title
      textEl.textContent = c.about
      gsap.set(boxes, { opacity: 1, x: 0, y: 0, scale: 1 })
      gsap.set(['.bio__tool', '.bio__skills li'], { opacity: 1 })
      if (wires) gsap.set([...wires.children], { opacity: 1 })
      return
    }
    // encendido de la máquina de rayos X (flicker CSS)
    scene?.classList.remove('is-on')
    void scene?.offsetWidth
    scene?.classList.add('is-on')

    const tl = gsap.timeline({ delay: 0.9 }) // arranca al asentarse el flicker
    boxes.forEach((box) => {
      const a = ANCHORS[box.dataset.anchor] || [50, 50]
      const sr = scene.getBoundingClientRect()
      const br = box.getBoundingClientRect()
      // desplazamiento inicial: desde el punto del esqueleto hacia la posición de reposo
      const fromX = ((a[0] / 100) * sr.width + sr.left) - (br.left + br.width / 2)
      const fromY = ((a[1] / 100) * sr.height + sr.top) - (br.top + br.height / 2)
      const wire = wires.querySelector(`.bio__wire[data-for="${box.dataset.anchor}"]`)
      const dot = wires.querySelector(`.bio__node[data-for="${box.dataset.anchor}"]`)
      tl.fromTo(
        box,
        { opacity: 0, x: fromX * 0.7, y: fromY * 0.7, scale: 0.5 },
        { opacity: 1, x: 0, y: 0, scale: 1, duration: 0.5, ease: 'back.out(1.4)' },
        '<0.12',
      )
      if (dot) tl.to(dot, { opacity: 1, duration: 0.15 }, '<')
      if (wire) tl.to(wire, { opacity: 1, duration: 0.3 }, '<0.05')
    })
    // tipeo del título + párrafo (caja about) — ritmo pausado, se ve la barra de input
    tl.add(() => typeInto(titleEl, c.title, 1.2), '>-0.1')
    tl.add(() => typeInto(textEl, c.about, 3.8), '>0.2')
    // herramientas: pop de íconos escalonado, luego su nombre
    tl.to('.bio__tool', { opacity: 1, scale: 1, duration: 0.32, ease: 'back.out(2)', stagger: 0.06, startAt: { scale: 0.3 } }, '<0.1')
    // habilidades: entran en cascada
    tl.to('.bio__skills li', { opacity: 1, x: 0, duration: 0.3, stagger: 0.09, startAt: { x: -12 } }, '<0.2')
  }

  // apagado de la máquina (al salir): flicker descendente en CSS. El router hace el fundido.
  const leave = () => {
    scene?.classList.remove('is-on')
    if (!quality.reducedMotion) {
      scene?.classList.remove('is-off')
      void scene?.offsetWidth
      scene?.classList.add('is-off')
    }
  }

  // redibuja los cables al redimensionar (las cajas se mueven con la escena)
  let rt
  addEventListener('resize', () => {
    clearTimeout(rt)
    rt = setTimeout(() => { if (!el.hidden) drawWires() }, 150)
  }, { passive: true })

  return { el, prepare, reveal, leave }
}
