// Utilidades de interpolación.
// `damp` es un lerp INDEPENDIENTE del framerate: `factor` es la fracción por frame a 60 fps
// (los valores del ANIMATION_SPEC §0.6: cursor 0.12, ojos 0.08, parallax 0.05) y se corrige
// con dt para que el "feel" sea idéntico a 60 y 120 Hz. Descubierto al ver 120 fps (ProMotion).
export function damp(current, target, factor, dt) {
  const t = 1 - Math.pow(1 - factor, dt * 60)
  return current + (target - current) * t
}

// Lerp simple (cuando el paso ya viene normalizado o no depende del tiempo).
export const lerp = (a, b, t) => a + (b - a) * t
