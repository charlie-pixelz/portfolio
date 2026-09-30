import { resolve } from 'node:path'
import { readFileSync } from 'node:fs'
import { defineConfig } from 'vite'
import { CAT_TITLE } from './src/core/cats.js'

// Lote 1 (30/9): contenido legible SIN JavaScript (buscadores, vistas previas, curl). El sitio arma
// todo por JS, así que el HTML servido solo traía el logo. Este plugin escribe en cada página, al
// compilar (y en dev), un resumen real —rol, bio, casos por categoría y contacto— leído de los
// MISMOS datos que usa el sitio (casos.json, perfil.json, cats.js): nunca se desfasa. Va oculto a la
// vista (.sr-only) pero en el DOM, así que también lo leen los lectores de pantalla; los links
// llevan tabindex=-1 para no meter focos invisibles en el recorrido con teclado.
const read = (f) => JSON.parse(readFileSync(resolve(import.meta.dirname, f), 'utf8'))
const esc = (t) => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
const SEO_UI = {
  es: { label: 'Resumen del portafolio', about: 'Sobre Charlie', projects: 'Proyectos', contact: 'Contacto' },
  en: { label: 'Portfolio summary', about: 'About Charlie', projects: 'Projects', contact: 'Contact' },
}
function seoSummary() {
  return {
    name: 'seo-summary',
    transformIndexHtml(html, ctx) {
      if (!html.includes('<!--seo-summary-->')) return html
      const lang = /\/en\//.test(ctx.path) ? 'en' : 'es'
      const casos = read('files/proyectos/casos.json')
      const perfil = read('files/proyectos/perfil.json')
      const ui = SEO_UI[lang]
      const cats = Object.entries(casos)
        .map(([cat, list]) => `<h3>${esc(CAT_TITLE[cat]?.[lang] || cat)}</h3><ul>${list.map((it) => `<li>${esc(it.title[lang])}</li>`).join('')}</ul>`)
        .join('')
      const block =
        `<section class="sr-only" aria-label="${ui.label}">` +
        `<p>Charlie Pixelz — ${esc(perfil.role)}</p>` +
        `<h2>${ui.about}</h2><p>${esc(perfil.about[lang])}</p>` +
        `<h2>${ui.projects}</h2>${cats}` +
        `<h2>${ui.contact}</h2><ul>` +
        `<li><a href="mailto:${esc(perfil.email)}" tabindex="-1">Email: ${esc(perfil.email)}</a></li>` +
        `<li><a href="${esc(perfil.linkedin)}" tabindex="-1">LinkedIn</a></li></ul>` +
        `</section>`
      return html.replace('<!--seo-summary-->', block)
    },
  }
}

// Dominio propio (charliepixelz.design, comprado 3/8) → base '/' + public/CNAME. Antes se servía
// en /portfolio/ (charlie-pixelz.github.io/portfolio/); ver CLAUDE.md §7 si hay que revertir.
// MPA real: /es/ y /en/ son HTML independientes (cierra F5: deep links + SEO en GitHub Pages).
export default defineConfig({
  base: '/',
  appType: 'mpa',
  plugins: [seoSummary()],
  build: {
    outDir: 'dist',
    // no inlinear íconos/imágenes chicas como base64: cargan aparte (y solo cuando se necesitan),
    // sin inflar el JS principal (los íconos de Biografía pesaban ~19 KB gz dentro del bundle)
    assetsInlineLimit: 1024,
    rollupOptions: {
      input: {
        root: resolve(import.meta.dirname, 'index.html'),
        es: resolve(import.meta.dirname, 'es/index.html'),
        en: resolve(import.meta.dirname, 'en/index.html'),
      },
    },
  },
})
