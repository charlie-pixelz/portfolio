import { resolve } from 'node:path'
import { defineConfig } from 'vite'

// Dominio propio (charliepixelz.design, comprado 3/8) → base '/' + public/CNAME. Antes se servía
// en /portfolio/ (charlie-pixelz.github.io/portfolio/); ver CLAUDE.md §7 si hay que revertir.
// MPA real: /es/ y /en/ son HTML independientes (cierra F5: deep links + SEO en GitHub Pages).
export default defineConfig({
  base: '/',
  appType: 'mpa',
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
