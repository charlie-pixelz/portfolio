#!/usr/bin/env node
// previews.mjs — clips de 3 s para los monitores de la sala (T4, revisión 25/9).
// Al pasar el cursor por un monitor, reproduce su clip (uno solo a la vez). Van a baja resolución
// a propósito: el CRT y la homografía los ensucian igual, y así pesan ~100 KB cada uno.
//
// Uso: node scripts/previews.mjs   → escribe assets/proyectos/previews/<categoria>.mp4
// Para cambiar qué se ve en un monitor, edita SOURCES (video: archivo + segundo de inicio;
// imágenes: lista, se muestran en partes iguales con un paneo lento).

import { spawnSync } from 'node:child_process'
import { mkdirSync, statSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', 'assets', 'proyectos')
const OUT = join(ROOT, 'previews')
const FFMPEG = process.env.FFMPEG || 'ffmpeg'
const W = 480
const H = 328 // ≈ proporción de los monitores de la sala (1.46)
const DUR = 3
const FPS = 24

const SOURCES = {
  ilustracion: { images: ['ilustracion/ilustracion-1.jpg', 'ilustracion/ilustracion-3.jpg', 'ilustracion/ilustracion-4.jpg'] },
  motion: { video: 'motion/motion-2.mp4', start: 4 },
  web: { video: 'web/web-1.mp4', start: 2 },
  ia: { images: ['ia/ia-1.jpg', 'ia/ia-2.jpg'] },
}

const fit = `scale=${W}:${H}:force_original_aspect_ratio=increase,crop=${W}:${H}`
const enc = ['-an', '-c:v', 'libx264', '-profile:v', 'main', '-pix_fmt', 'yuv420p', '-crf', '30', '-preset', 'slow', '-r', String(FPS), '-movflags', '+faststart']

mkdirSync(OUT, { recursive: true })
for (const [cat, src] of Object.entries(SOURCES)) {
  const out = join(OUT, `${cat}.mp4`)
  let args
  if (src.video) {
    args = ['-y', '-ss', String(src.start), '-t', String(DUR), '-i', join(ROOT, src.video), '-vf', `${fit},fps=${FPS}`, ...enc, out]
  } else {
    const n = src.images.length
    const each = DUR / n
    const inputs = src.images.flatMap((f) => ['-loop', '1', '-t', String(each), '-i', join(ROOT, f)])
    // cada imagen: un 12 % más grande que el cuadro y un paneo lento de izquierda a derecha
    const pan = src.images
      .map(
        (_, i) =>
          `[${i}]scale=${Math.round(W * 1.12)}:${Math.round(H * 1.12)}:force_original_aspect_ratio=increase,` +
          `crop=${W}:${H}:x='(in_w-${W})*t/${each}':y='(in_h-${H})/2',fps=${FPS},setsar=1[v${i}]`,
      )
      .join(';')
    const cat_ = src.images.map((_, i) => `[v${i}]`).join('') + `concat=n=${n}:v=1:a=0[out]`
    args = ['-y', ...inputs, '-filter_complex', `${pan};${cat_}`, '-map', '[out]', ...enc, out]
  }
  const r = spawnSync(FFMPEG, args, { stdio: ['ignore', 'ignore', 'pipe'] })
  if (r.status !== 0) {
    console.error(`✗ ${cat}\n${r.stderr.toString().split('\n').slice(-6).join('\n')}`)
    process.exitCode = 1
    continue
  }
  console.log(`✓ ${cat}.mp4  ${Math.round(statSync(out).size / 1024)} KB`)
}
