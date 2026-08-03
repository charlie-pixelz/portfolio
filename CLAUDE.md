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

### 1.1 Modo de trabajo — presupuesto de tokens (ratificado 28/7)

Charlie opera con cupo de tokens **limitado y con reset semanal**. Esto condiciona cuánto se avanza por sesión — es restricción real, no solo preferencia. Aplica a **cualquier modelo** que trabaje en este repo (no es un ajuste "porque el modelo es más capaz").

**Reparto de la verificación — no es menos rigor, es quién aporta la evidencia:**
- **Charlie es el QA visual primario.** Revisa cada cambio en su navegador real antes de dar el OK — eso satisface a `fable-fixer` ("nunca cantar victoria sin evidencia"): su revisión ES evidencia, no hace falta duplicarla con capturas automatizadas.
- **Verificación automatizada (Playwright, capturas, click-through)** se reserva para lo que Charlie NO puede detectar mirando una vez: cambios en `router.js` (rutas/transiciones), config de build, o mecánica que toca >1 archivo/página donde un fallo silencioso sería costoso.
- **Para todo lo demás** (color, espaciado, copy, timing/easing, un solo archivo): basta `npm run build` limpio (rápido, siempre se corre) + que Charlie lo vea en su sesión. No se abre Playwright para eso.
- **Feedback en lotes grandes:** Charlie entrega feedback acumulado por sesión (excepción: detalles sueltos que lleguen por goteo). Responder con **un lote de cambios completos**, no ida-y-vuelta por ítem individual.
- **Respuestas cortas:** sin narrar opciones que no se van a tomar, sin resumen largo al cierre salvo que se pida.
---

## 2. Compuertas de CRÍTICA — estado vivo

Detalle y evidencia en [`CRITICA_FABLE5.md`](files/CRITICA_FABLE5.md). Marca `☐→☑` al cerrar, anotando **cómo** se cerró (no edites hallazgos históricos; agrega sección con fecha si re-corres `fable-opinion`).

| # | Hallazgo | Estado | Acción viva |
|---|---|---|---|
| F1 | Definición de éxito + contacto medible | ☑ | Contacto especificado; **analytics sin cookies (GoatCounter) ratificado** por Charlie (20/7) |
| F2 | Licencias tipográficas | ☑ | Las 6 son **OFL** (incluye Glitch Goblin); copiadas a [`/docs/licencias/`](docs/licencias/README.md) (2/8) |
| F3 | Volumen de contenido | ☑ | Piso lanzable = **8 casos** (2/categoría × ES/EN) |
| F4 | IDs del SVG del preloader | ☑ | Reemplazado por **matriz en canvas** (elimina riesgo SVGO) |
| F5 | SPA vs GitHub Pages / SEO | ☑ | HTML estático real por ruta `/es/` `/en/` confirmado. Gap real encontrado (2/8) al verificar en producción: sub-rutas (`/es/proyectos/`, etc.) 404eaban en GitHub Pages y el router siempre forzaba Home al cargar — cerrado con `public/404.html` (rebote sessionStorage, con página de error propia para links realmente rotos) + `router.js` leyendo la ruta inicial |
| F6 | Presupuestos de bytes | ☑ | **OGL elegido** (21/7): ~98 KB gz proyectado vs ~213 con Three. Presupuestos en §3; verificar gz real en build |
| F7 | Fecha de lanzamiento | ☐ | Hito 1 (deploy técnico) **CERRADO 21/7**. Contenido de Hito 2 ya **SUPERADO** (2/8, verificado en `files/proyectos/casos.json`): 16 casos completos (4/categoría × ES/EN), no solo el piso de 8 — solo falta que Charlie **fije la fecha** de publicación |
| F8 | Dominio | ☑ | Alias "Charlie Pixelz" ratificado (20/7). **`charliepixelz.design` comprado (3/8, Spaceship)**, DNS apuntado a GitHub Pages, certificado HTTPS aprobado — base migrada a `/` (3/8) |
| F9 | A11y preloader/cursor | ☑ | Verificado (2/8): preloader con `role=progressbar` + ARIA, selector de idioma con `<a href>` reales (no depende de JS para navegar), fallback sin WebGL completa igual; foco visible global (`:focus-visible` cian) + reglas propias en cada interactivo sobre el canvas |
| F10 | Ratificar P1–P4 | ☑ | **P1→P2→P3→P4 ratificado** por Charlie (20/7) como ruta de lanzamiento/degradación |
| F11 | Sistema tipográfico | ☑ | 5 familias con roles + regla de frontera de Doto (ver ART_DIR §3) |

**Gates abiertos:** solo queda **F7** (fecha de lanzamiento), decisión de Charlie. Lighthouse (2/8, `vite preview` + build real): Accesibilidad/Best Practices/SEO **100/100/100**. Performance móvil **44→74** tras acotar el precalentado de `category.js` (disparaba ~8 MB de media de las 4 categorías con solo cargar Inicio; ahora espera una señal real de que alguien va a Proyectos — hover/click del letrero). Sigue bajo el piso de 85: el LCP (~8.3s) no se movió con ese fix, parece atado al pipeline de texturas WebGL del hero — posiblemente inflado por el renderer por software del Chrome headless usado para medir (no es un dispositivo real). Pendiente: revisar con un dispositivo/PageSpeed real antes de perseguir más este número.

---

## 3. Tiers de performance y presupuestos (hard limits)

`QualityManager` detecta `devicePixelRatio` (cap **2 desktop / 1.5 móvil**), cores y memoria → tier **`high | mid | low`**. **Cada efecto declara su comportamiento por tier** (ej. partículas 60/24/0; galería con shader→sin shader→estática).

| Presupuesto | Límite | Fuente |
|---|---|---|
| JS total (gzip, incl. OGL+GSAP) | **≤ 350 KB** — objetivo inicial **≤ ~200 KB** (F6) | SPEC §0 / F6 |
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
- **WebGL:** **OGL** (elegido en F6 por presupuesto; ~15 KB gz, hecho para planos+shaders). **DOM/timelines:** GSAP + SplitText + ScrollTrigger. **Scroll:** Lenis, sincronizado al RAF.
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

**Ya cerrados (verificado 2/8, doc estaba desactualizado):** copy Biografía ES/EN (`bio.js`) · contenido de los 16 casos, título/desc/tags/media ES/EN (`casos.json`) · datos de contacto reales — email, WhatsApp, LinkedIn (`contacto.js`; **falta Behance**, ¿se descarta o hay link?).

**Pendientes (dueño):** `hero_mobile_1080x1920.webp` (crop 9:16) · boceto/definición de **matriz del preloader** + estados · **og:image** 1200×630 + versión hero marcos horneados · **favicon** · **script de GoatCounter** (F1 ratificado 20/7 pero nunca se agregó al HTML) · copiar OFL/License a `/docs/licencias/` (acción de F2, quedó suelta). Casi todo es **Charlie**; los derivados de imagen pueden generarse vía **MCP Higgsfield** (guardar en `assets/ai/` como `proyecto_formato_version.ext`).

---

## 7. Convenciones

- **i18n:** rutas estáticas `/es/` (default) y `/en/` con HTML real por ruta (SEO/hreflang/deep links); selector en el preloader (persistencia `localStorage` + `<html lang>`) y switch en el nav. i18n se decide el día 1, no se parcha después.
- **Deploy:** GitHub Pages vía Action a `gh-pages`; `CNAME` + Enforce HTTPS cuando exista dominio. `hreflang` recíproco + `og:image` por idioma.
- **Higiene (desde commit 1):** `.gitignore` **antes** del primer commit; `.env.example` sí, `.env` jamás; commits chicos que expliquen el **porqué**. Repo público = historial público → correr `fable-seguridad` antes de publicar.
- **Assets:** el CRT disimula todo → texturas de pantalla 512–768 px; máx **1 video activo** simultáneo (nunca 5 monitores en video).

---

## 8. Estado y próximos pasos

- **Esqueleto DESPLEGADO y vivo (21/7):** Vite MPA `/es/` `/en/` + selector de idioma persistente + tema (paleta/fuentes/CRT). Verificado en la URL pública (200 + render OK en las 3 rutas). **Hito 1 saldado.**
- **Deploy:** dominio propio **https://charliepixelz.design/** (comprado 3/8 en Spaceship; F8 cerrado) — **base `/`** + `public/CNAME`. Repo de proyecto **`portfolio`** (público), Pages con source "GitHub Actions" → **auto-deploy en cada push a `main`**. Push con la cuenta `charlie-pixelz` vía `gh` CLI (el MCP de GitHub es otra cuenta, `cperez-brand`). La URL `charlie-pixelz.github.io/portfolio/` queda histórica/sin usar (dejó de ser la base el 3/8; si el dominio hay que revertirlo, la base vuelve a `/portfolio/` + quitar `public/CNAME`).
- **Ratificado 20/7:** alias "Charlie Pixelz" · P1→P2→P3→P4 · analytics sin cookies · i18n HTML por ruta.
- **Abierto por Charlie:** fecha de lanzamiento (F7, contenido ya listo) · TLD/dominio (F8) · assets pendientes de §6 (favicon, og:image, GoatCounter, licencias).
- **Fase 1 EN CURSO (21/7):** F6 cerrado (OGL). Pendiente en la fase: subset de fuentes → woff2 (TTF actuales ~628 KB); arquitectura canvas persistente + RAF único + PointerManager + QualityManager + Lenis; preloader básico. DoD: 60 fps escena vacía · mouse y touch alimentan los mismos valores · reduced-motion.
- **Regla de oro:** no escribir features hasta tener el esqueleto desplegándose al hosting real.

*Este archivo es el índice operativo; el detalle vive en `/files`. Manténlo sincronizado cuando cambien decisiones o se cierren gates.*
