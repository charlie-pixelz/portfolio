// QualityManager — detecta capacidad del dispositivo → tier high | mid | low
// (ANIMATION_SPEC §0.7). Cada efecto declara su comportamiento por tier.
// También expone el cap de DPR (2 desktop / 1.5 móvil) y el flag reduced-motion.

const isTouch = matchMedia('(hover: none)').matches
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches

const dpr = Math.min(window.devicePixelRatio || 1, isTouch ? 1.5 : 2)
const cores = navigator.hardwareConcurrency || 4
const mem = navigator.deviceMemory || 4 // GB; solo Chromium, fallback 4

let tier = 'mid'
if (!isTouch && cores >= 8 && mem >= 8) tier = 'high'
else if (cores <= 4 || mem <= 4) tier = 'low'

export const quality = { tier, dpr, cores, mem, isTouch, reducedMotion }
