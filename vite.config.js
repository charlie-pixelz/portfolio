import { resolve } from 'node:path'
import { defineConfig } from 'vite'

// User site (charlie-pixelz.github.io) → se sirve en la raíz: base '/'.
// MPA real: /es/ y /en/ son HTML independientes (cierra F5: deep links + SEO en GitHub Pages).
export default defineConfig({
  base: '/',
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
