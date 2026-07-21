# CLAUDE.md — Portafolio Charlie Pixelz

Sitio-portafolio de **Carlos "Charlie" Pérez** (Art & Design Specialist, Chile). Objetivo doble: captar freelance + oportunidades laborales. Estático, bilingüe ES/EN, deploy en GitHub Pages. La tesis del sitio es *el sitio mismo demuestra lo que Charlie vende* (motion, interacción, IA, criterio visual): experiencia cyberpunk + videojuego retro + CRT, diegética.

> **Cómo correr:** `npm install` → `npm run dev` (o `npm run build && npm run preview`). Detalle en [`README.md`](README.md).

---

## 0. Fuentes de verdad — viven en `/files`

Todo el contexto normativo está en **`/files/*.md`** y las skills en **`/files/skills/`**. No dupliques su contenido: consúltalos y enlaza. Léelos completos antes de tocar código (regla de `fable-arranque` §3).

| Doc | Rol | Cuándo |
|---|---|---|
| [`ADENDUM_PRODUCCION.md`](files/ADENDUM_PRODUCCION.md) | Ratificaciones finales, flujo y **manifiesto de assets** | Verdad más reciente en producto/flujo/assets |
| [`ART_DIRECTION.md`](files/ART_DIRECTION.md) | Dirección visual e interactiva, paleta, tipografía, páginas, transiciones | Máxima autoridad **visual** |
| [`ANIMATION_SPEC.md`](files/ANIMATION_SPEC.md) | Arquitectura técnica, efectos P1–P4, presupuestos, DoD | Cómo se implementa cada efecto |
| [`PORTFOLIO_BRIEF.md`](files/PORTFOLIO_BRIEF.md) | Contexto, contenidos, jerarquía, fases | Qué va y por qué |
| [`CRITICA_FABLE5.md`](files/CRITICA_FABLE5.md) | **Compuertas (gates)** y pre-mortem | Antes de avanzar de fase |

### Precedencia ante conflicto (regla combinada, orden de mando)
1. **Dirección visual** → manda **`ART_DIRECTION.md`** (precedencia visual declarada; obsoleta lo que contradiga en BRIEF/SPEC).
2. **Producto, flujo y assets** → manda **`ADENDUM`** por ser posterior (excepto lo visual, que sigue en ART_DIRECTION).
3. **Arquitectura técnica** → **`ANIMATION_SPEC` 100% vigente** (canvas persistente, RAF único, PointerManager, QualityManager, Lenis, tiers, presupuestos, reduced-motion).
4. **Contexto/objetivo** → **`PORTFOLIO_BRIEF`**.
5. **Gates** → **`CRITICA_FABLE5`**: no se avanza a la fase afectada por un `[BLOQUEANTE]` sin cerrarlo o sin decisión explícita de Charlie.

> Si un documento y Charlie se contradicen: **señálalo y pregunta cuál manda** — no lo resuelvas en silencio.

---

## 1. Skills del kit `fable-*` (en `/files/skills/`)

Codifican el **proceso y los anti-patrones** de trabajo. Léelas y súmalas al razonamiento; decide relevancia por fase. Prioridad de instrucciones: **Charlie > skills fable-* > skills superpowers > default**.

| Skill | Se activa en | Uso en este proyecto |
|---|---|---|
| [`fable-arranque`](files/skills/fable-arranque/SKILL.md) | Kickoff, scaffolding | **Ahora.** Encuadre escrito + esqueleto que **ya despliega** antes de la 1.ª feature |
| [`fable-plan`](files/skills/fable-plan/SKILL.md) | Plan/roadmap/estimación | Al planificar fases y al cambiar alcance (p. ej. recorte de casos) |
| [`fable-opinion`](files/skills/fable-opinion/SKILL.md) | Feedback/crítica | Al revisar decisiones o el propio plan; sin complacencia |
| [`fable-fixer`](files/skills/fable-fixer/SKILL.md) | Bug / "no funciona" / "sigue igual" | Todo el build. **Nunca** cantar victoria sin evidencia; desktop≠móvil, dev≠prod, caché miente |
| [`fable-seguridad`](files/skills/fable-seguridad/SKILL.md) | Publicar / repo público / pagos | Antes del 1.er deploy público y antes de volver público el repo |

**Cadena natural:** `arranque → plan → opinion (sobre el plan) → construir → fixer (al fallar) → seguridad (antes de entregar)`.

---

## 2. Compuertas de CRÍTICA — estado vivo

Detalle y evidencia en [`CRITICA_FABLE5.md`](files/CRITICA_FABLE5.md). Marca `☐→☑` al cerrar, anotando **cómo** se cerró (no edites hallazgos históricos; agrega sección con fecha si re-corres `fable-opinion`).

| # | Hallazgo | Estado | Acción viva |
|---|---|---|---|
| F1 | Definición de éxito + contacto medible | ☑ | Contacto especificado; **analytics sin cookies (GoatCounter) ratificado** por Charlie (20/7) |
| F2 | Licencias tipográficas | ☑ | Las 5 son **OFL**; guardar OFL/License en `/docs/licencias/` |
| F3 | Volumen de contenido | ☑ | Piso lanzable = **8 casos** (2/categoría × ES/EN) |
| F4 | IDs del SVG del preloader | ☑ | Reemplazado por **matriz en canvas** (elimina riesgo SVGO) |
| F5 | SPA vs GitHub Pages / SEO | ☐ | Enfoque **ratificado** (20/7): HTML estático real por ruta `/es/` `/en/` + transiciones encima. Cierra al verificar en build |
| F6 | Presupuestos de bytes | ☐ | Fijar en Fase 1 (ver §3). Decidir **Three.js vs OGL con el número delante** |
| F7 | Fecha de lanzamiento | ☐ | **Eslabón más débil.** Hito 1 (deploy técnico, 17/7) **vencido y sin repo**; Hito 2 (8 casos) **sin fecha** (recom. ≤31/7) |
| F8 | Dominio | ☐ | Alias **"Charlie Pixelz" ratificado** por Charlie (20/7); TLD + registro pendientes |
| F9 | A11y preloader/cursor | ☐ | 2 líneas al DoD Fase 2/3: preloader no bloquea lectores; foco visible sobre canvas |
| F10 | Ratificar P1–P4 | ☑ | **P1→P2→P3→P4 ratificado** por Charlie (20/7) como ruta de lanzamiento/degradación |
| F11 | Sistema tipográfico | ☑ | 5 familias con roles + regla de frontera de Doto (ver ART_DIR §3) |

**Gates abiertos que condicionan el build:** F5 y F6 se cierran **en Fase 1/2 al implementar**; quedan **F7** (fecha Hito 2) y el **TLD/registro de F8** por decisión de Charlie.

---

## 3. Tiers de performance y presupuestos (hard limits)

`QualityManager` detecta `devicePixelRatio` (cap **2 desktop / 1.5 móvil**), cores y memoria → tier **`high | mid | low`**. **Cada efecto declara su comportamiento por tier** (ej. partículas 60/24/0; galería con shader→sin shader→estática).

| Presupuesto | Límite | Fuente |
|---|---|---|
| JS total (gzip, incl. Three+GSAP) | **≤ 350 KB** — objetivo inicial **≤ ~200 KB** (F6) | SPEC §0 / F6 |
| Texturas hero | ≤ 2 archivos, **≤ 400 KB** c/u (WebP/AVIF + fallback) | SPEC §0 |
| woff2 total (5 familias) | **≤ ~150 KB** con subset agresivo (latin + `á é í ó ú ü ñ ¿ ¡`) | ART_DIR Act.2 |
| Video Contacto | **≤ 1.2 MB** desktop · **≤ 700 KB** móvil | ART_DIR §10 |
| Runtime | **60 fps** desktop mid; sin long tasks **> 120 ms** tras preloader | SPEC §0 |
| Lighthouse (DoD final) | **Performance ≥ 85 móvil · Accesibilidad ≥ 95** | SPEC DoD |

**Regla lo-fi:** el grano/CRT/scanlines los pone **un** shader en la GPU, nunca se hornean en los assets. La estética de baja resolución se **simula sobre imágenes livianas** — jamás justifica un archivo pesado. Videos: limpios y de shading plano; nunca autoplay fuera de viewport (`poster` + lazy).

**Orden de implementación (no saltar):** P1 → P2 → P3 → P4. No se avanza de prioridad sin 60 fps en desktop y sin jank en móvil.

---

## 4. Stack y arquitectura (de `ANIMATION_SPEC` §0)

- **Build:** Vite (vanilla JS + módulos ES), output estático para GitHub Pages (Action → `gh-pages`). **Sin framework UI** (no React).
- **WebGL:** Three.js (reevaluar OGL solo para el hero si excede presupuesto). **DOM/timelines:** GSAP + SplitText + ScrollTrigger. **Scroll:** Lenis, sincronizado al RAF.
- **El "secreto unseen":** 1 canvas WebGL persistente (`#gl`, `fixed inset:0`, nunca se destruye) · **1 solo RAF** central · SPA por idioma con rutas estáticas `/es/` `/en/` + History API dentro de cada una · **DOM = fuente de verdad** (textos/estructura en HTML por a11y+SEO; imágenes con efecto = planos WebGL sincronizados al DOM) · **PointerManager** global (mouse+touch → `{x,y}` -1..1 + velocidad) · **lerp everywhere** (cursor 0.12, ojos 0.08, parallax 0.05) · **QualityManager** por tier · preloader que precarga con **progreso real**.

---

## 5. No-negociables

- **Accesibilidad (piso):** `prefers-reduced-motion` → sin parallax/partículas/cursor custom/shader; fades ≤ 300 ms; contenido 100% navegable. Teclado completo con foco visible propio. Cursor custom = capa visual (`pointer-events:none`), nunca reemplaza al del sistema. Audio solo **opt-in**, jamás autoplay.
- **Fotosensibilidad (WCAG 2.3.1, obligatorio):** nunca **> 3 destellos/s**, sin strobe de pantalla completa a alto contraste. Flicker de neón "antiguo" = lento e irregular (2–4 s entre eventos).
- **Contraste:** texto de lectura (Space Grotesk) cumple **AA (4.5:1)**; nunca párrafos en magenta puro; Doto nunca lleva cuerpo de lectura (regla de frontera, F11).
- **Identidad:** los referentes (Blade Runner, Cyberpunk, Fallout/Pip-Boy) **se evocan, nunca se citan** — cero marcas, nombres o assets de esas IPs en el sitio ni en el dominio. La ingeniería se hereda de unseen.co; la estética es 100% de Charlie.
- **Capa OS vs Mundo:** verde `--phosphor` = interfaz (menú, rayos X, readouts); magenta/cian = mundo (escenas, letreros). No mezclar.
- **"Loader que miente = prohibido":** el % es progreso real del asset manager.

**Paleta** (tokens, ART_DIR §2): `--void #010135` · `--deep #00026C` · `--magenta #F202CD` · `--purple #9303AA` · `--cyan #4BDFF4` · `--phosphor #33FF66` · `--phosphor-dim #1FA648` · `--phosphor-glow rgba(51,255,102,.35)` · `--red-eye ~#FF2A2A`.

**Tipografía** (roles cerrados, ART_DIR §3): **Glitch Goblin** (solo título hero) · **Space Grotesk** (todo texto de lectura) · **Handjet** (títulos 1 línea + menú Pip-Boy; efecto píxel vía ejes variables `wght`/`ELSH`/`ELGR`) · **Doto** (bloques retro 2–3 líneas máx, `wght`/`ROND`, ≥18–20 px) · **Protest Revolution** (solo swap por hover). Los TTF + OFL están en `/fonts` → convertir a woff2 subseteado.

---

## 6. Mapa de assets

Optimizados listos en **`assets/upscale/`**; máster/fuente en `assets/efecto-*/`; diseño de referencia en `brand/maquetas/` y `brand/referencias/`; PSD/AI en `brand/`. Manifiesto completo en ADENDUM §7.

**Listos (verificados en repo):** hero clean 2400/4602w · **depth-map hero** (`efecto-fake3d/…_depth-map.png`) · bio 2400/4602w · sala proyectos desktop 2400/4096w + móvil 1080/2446w · categoría desktop/móvil (apagadas) + **capas de LUCES** (`efecto-galeria/Categoria_*_Luces.png`, sin optimizar aún) · callejón 1536w · menú móvil · Contacto (webm+mp4+poster) · 11 íconos de herramientas + 3 flechas · JSON de pantallas (`files/pantallas/`) · 5 familias tipográficas (TTF+OFL) · `hero_css_demo_v6.html` (prototipo nav diegética).

**Pendientes (dueño):** `hero_mobile_1080x1920.webp` (crop 9:16) · boceto/definición de **matriz del preloader** + estados · **og:image** 1200×630 + versión hero marcos horneados · **favicon** · **copy Biografía ES/EN** · **datos de contacto reales** (email, WhatsApp, LinkedIn, Behance) · **contenido de los 8 casos** (título/desc/tags/media ES/EN). Casi todo es **Charlie**; los derivados de imagen pueden generarse vía **MCP Higgsfield** (guardar en `assets/ai/` como `proyecto_formato_version.ext`).

---

## 7. Convenciones

- **i18n:** rutas estáticas `/es/` (default) y `/en/` con HTML real por ruta (SEO/hreflang/deep links); selector en el preloader (persistencia `localStorage` + `<html lang>`) y switch en el nav. i18n se decide el día 1, no se parcha después.
- **Deploy:** GitHub Pages vía Action a `gh-pages`; `CNAME` + Enforce HTTPS cuando exista dominio. `hreflang` recíproco + `og:image` por idioma.
- **Higiene (desde commit 1):** `.gitignore` **antes** del primer commit; `.env.example` sí, `.env` jamás; commits chicos que expliquen el **porqué**. Repo público = historial público → correr `fable-seguridad` antes de publicar.
- **Assets:** el CRT disimula todo → texturas de pantalla 512–768 px; máx **1 video activo** simultáneo (nunca 5 monitores en video).

---

## 8. Estado y próximos pasos

- **Esqueleto listo (20/7):** Vite MPA `/es/` `/en/` + selector de idioma persistente + tema (paleta/fuentes/CRT). `npm run build` verde; render verificado. `git init` + staged; **commit y push pendientes** de la cuenta de Charlie.
- **Deploy:** repo de proyecto **`portfolio`** → `charlie-pixelz.github.io/portfolio/` (**base `/portfolio/`**). El MCP de GitHub está en otra cuenta (`cperez-brand`) → el push lo hace **Charlie con sus credenciales**. Falta activar Pages → source "GitHub Actions". Con dominio propio (`.design`) → base `/` + `CNAME` + actualizar `hreflang`.
- **Ratificado 20/7:** alias "Charlie Pixelz" · P1→P2→P3→P4 · analytics sin cookies · i18n HTML por ruta.
- **Abierto por Charlie:** push del repo · fecha Hito 2 (F7) · TLD/dominio (F8) · datos de contacto · copy Bio ES/EN · contenido de los 8 casos.
- **Próximo (Fase 1, tras deploy):** fijar presupuestos numéricos + decisión Three.js vs OGL (F6); subset de fuentes → woff2 (los TTF actuales suman ~628 KB); arquitectura canvas persistente + RAF único + PointerManager + QualityManager + Lenis.
- **Regla de oro:** no escribir features hasta tener el esqueleto desplegándose al hosting real.

*Este archivo es el índice operativo; el detalle vive en `/files`. Manténlo sincronizado cuando cambien decisiones o se cierren gates.*
