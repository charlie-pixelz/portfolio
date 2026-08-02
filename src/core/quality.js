// QualityManager — detecta capacidad del dispositivo → tier high | mid | low
// (ANIMATION_SPEC §0.7). Cada efecto declara su comportamiento por tier.
// También expone el cap de DPR (2 desktop / 1.5 móvil) y el flag reduced-motion.

const isTouch = matchMedia('(hover: none)').matches
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches

const dpr = Math.min(window.devicePixelRatio || 1, isTouch ? 1.5 : 2)
const cores = navigator.hardwareConcurrency || 4
// deviceMemory es solo-Chromium: en Safari/Firefox viene undefined. Antes eso caía a un fallback
// de 4 GB que el propio umbral de abajo lee como "poco" → todo desktop en Safari/Firefox quedaba
// en tier low (parallax del hero a mitad de fuerza) sin importar el hardware real. mem = null
// cuando el dato no existe, y el tier se decide solo por cores en ese caso.
const mem = typeof navigator.deviceMemory === 'number' ? navigator.deviceMemory : null

let tier = 'mid'
if (!isTouch && cores >= 8 && (mem === null || mem >= 8)) tier = 'high'
else if (cores <= 4 || (mem !== null && mem <= 4)) tier = 'low'

export const quality = { tier, dpr, cores, mem, isTouch, reducedMotion }
