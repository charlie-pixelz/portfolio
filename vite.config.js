import { resolve } from 'node:path'
import { defineConfig } from 'vite'

// Repo de proyecto "portfolio" → se sirve en /portfolio/ (charlie-pixelz.github.io/portfolio/).
// Cuando llegue el dominio propio (.design), cambiar base a '/' + añadir CNAME (ver CLAUDE.md §7).
// MPA real: /es/ y /en/ son HTML independientes (cierra F5: deep links + SEO en GitHub Pages).
export default defineConfig({
  base: '/portfolio/',
  appType: 'mpa',
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        root: resolve(import.meta.dirname, 'index.html'),
        es: resolve(import.meta.dirname, 'es/index.html'),
        en: resolve(import.meta.dirname, 'en/index.html'),
      },
    },
  },
})
