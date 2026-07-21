# Charlie Pixelz — Portafolio

Portafolio interactivo de **Carlos "Charlie" Pérez** (Art & Design Specialist). Experiencia cyberpunk + retro CRT, bilingüe ES/EN, estática, desplegada en GitHub Pages.

> **Terminado (v1) =** un reclutador puede ver los proyectos y contactar a Charlie desde el móvil en menos de 60 segundos.

## Stack (con razones)
- **Vite** (vanilla JS + ES modules) → salida estática compatible con GitHub Pages.
- **i18n por ruta:** HTML real en `/es/` (default) y `/en/` — no rompe deep links ni SEO (F5).
- **Efectos (Fase 1+):** Three.js · GSAP · Lenis sobre un canvas persistente. _Aún no instalados_: se deciden con el presupuesto de bytes delante (F6).

## Cómo correr
```bash
npm install
npm run dev      # servidor de desarrollo
npm run build    # genera /dist
npm run preview  # sirve /dist para verificar el build de producción
```

## Estructura
- `index.html` — selector / redirección de idioma (persistente).
- `es/`, `en/` — home por idioma (HTML real, no SPA pura).
- `src/` — estilos (tokens de paleta), JS de entrada, diccionarios i18n.
- `assets/` — imágenes y video optimizados que consume el sitio.
- `.github/workflows/deploy.yml` — build + deploy automático a GitHub Pages.

## Guía de trabajo
Reglas operativas, precedencias, compuertas y presupuestos en [`CLAUDE.md`](CLAUDE.md). El detalle de dirección vive en `/files` (local, no publicado). Orden de implementación: **P1 → P2 → P3 → P4**.

---
Deploy objetivo: user site → **https://charlie-pixelz.github.io**
