#!/usr/bin/env node
// media.mjs — optimiza la media de la galería (npm run media).
//
// Flujo para sumar un caso:
//   1. Deja el original en assets/proyectos/<categoria>/_src/ con su número adelante:
//        (05)Nombre del proyecto.png   ·   (06)Reel campaña.mp4
//   2. npm run media
//   3. Agrega la entrada en files/proyectos/casos.json con "media": "<categoria>-5" (el script
//      te imprime el bloque listo para pegar, incluido "sound": true si el video trae audio).
//
// Qué genera (junto a los demás, en assets/proyectos/<categoria>/):
//   imagen → <cat>-<n>.avif (si no tiene transparencia) + <cat>-<n>.webp   (máx. 1600 px por lado)
//   video  → <cat>-<n>.mp4 (H.264, faststart, máx. 1920 px, ≤30 fps) + <cat>-<n>-poster.webp
//
// Reglas:
//   · Un "máster" ya existente (<cat>-<n>.jpg/.png/.mp4, los aprobados que ya están en el sitio)
//     SIEMPRE gana sobre _src/: nunca se reprocesa desde el original por accidente.
//     Para reemplazar un caso: `npm run media -- --force ia-3` (usa el _src/ más nuevo de ese número).
//   · Si hay varios _src con el mismo número, gana la letra más alta: (02b) > (02a) > (02).
//   · No rehace lo que ya existe; --force (sin argumento) regenera todo desde los másters.
//
// Requiere ffmpeg/ffprobe en el PATH (o FFMPEG / FFPROBE apuntando a los binarios).

import { spawnSync } from 'node:child_process'
import { existsSync, readdirSync, statSync, unlinkSync } from 'node:fs'
import { join, extname, basename, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', 'assets', 'proyectos')
const FFMPEG = process.env.FFMPEG || 'ffmpeg'
const FFPROBE = process.env.FFPROBE || 'ffprobe'
const IMG = ['.jpg', '.jpeg', '.png', '.webp', '.avif', '.tif', '.tiff']
const VID = ['.mp4', '.mov', '.m4v', '.webm', '.mkv']
const MAX_IMG = 1600
const MAX_VID = 1920

const args = process.argv.slice(2)
const force = args.includes('--force')
const forceOnly = args.filter((a) => !a.startsWith('--')) // p.ej. ["ia-3"]
const forced = (id) => force && (forceOnly.length === 0 || forceOnly.includes(id))

const run = (bin, a) => {
  const r = spawnSync(bin, a, { encoding: 'utf8' })
  if (r.error?.code === 'ENOENT') {
    console.error(`\n✖ No encuentro "${bin}". Instala ffmpeg (brew install ffmpeg) o define ${bin === FFMPEG ? 'FFMPEG' : 'FFPROBE'}.`)
    process.exit(1)
  }
  if (r.status !== 0) throw new Error(`${bin} ${a.join(' ')}\n${r.stderr}`)
  return r.stdout
}
const probe = (file) => JSON.parse(run(FFPROBE, ['-v', 'error', '-show_streams', '-show_format', '-of', 'json', file]))
const kb = (f) => (existsSync(f) ? `${Math.round(statSync(f).size / 1024)} KB` : '—')
const fresh = (out, input) => existsSync(out) && statSync(out).mtimeMs >= statSync(input).mtimeMs

// escala sin agrandar, dimensiones pares (yuv420 las exige)
const fit = (max) =>
  `scale=w='min(${max},iw)':h='min(${max},ih)':force_original_aspect_ratio=decrease,scale=trunc(iw/2)*2:trunc(ih/2)*2`

const hasAlpha = (file) => {
  const v = probe(file).streams.find((s) => s.codec_type === 'video')
  return /(rgba|bgra|argb|abgr|gbrap|yuva|ya8|ya16|pal8)/.test(v?.pix_fmt || '')
}

function image(id, input, dir) {
  const out = []
  const webp = join(dir, `${id}.webp`)
  const avif = join(dir, `${id}.avif`)
  const alpha = hasAlpha(input)
  if (forced(id) || !fresh(webp, input)) {
    run(FFMPEG, ['-v', 'error', '-y', '-i', input, '-vf', fit(MAX_IMG), '-c:v', 'libwebp', '-quality', '82', '-compression_level', '6', webp])
  }
  out.push(`webp ${kb(webp)}`)
  if (alpha) {
    if (existsSync(avif)) unlinkSync(avif) // AVIF con alpha no es confiable vía ffmpeg: solo WebP
    out.push('avif — (tiene transparencia)')
  } else {
    if (forced(id) || !fresh(avif, input)) {
      // crf 26 ≈ misma calidad que WebP q82 (SSIM 0.98 medido) con ~45% menos peso
      run(FFMPEG, ['-v', 'error', '-y', '-i', input, '-vf', fit(MAX_IMG), '-c:v', 'libaom-av1', '-still-picture', '1', '-crf', '26', '-b:v', '0', '-cpu-used', '4', '-pix_fmt', 'yuv420p', avif])
    }
    out.push(`avif ${kb(avif)}`)
  }
  return { type: 'image', out }
}

function video(id, input, dir, isMaster) {
  const out = []
  const mp4 = join(dir, `${id}.mp4`)
  const poster = join(dir, `${id}-poster.webp`)
  const info = probe(input)
  const sound = info.streams.some((s) => s.codec_type === 'audio')
  if (!isMaster && (forced(id) || !fresh(mp4, input))) {
    const v = info.streams.find((s) => s.codec_type === 'video')
    const [n, d] = (v.r_frame_rate || '30/1').split('/').map(Number)
    const fps = n / (d || 1) > 30.5 ? ['-r', '30'] : []
    run(FFMPEG, [
      '-v', 'error', '-y', '-i', input, '-vf', fit(MAX_VID), ...fps,
      '-c:v', 'libx264', '-preset', 'slow', '-crf', '24', '-pix_fmt', 'yuv420p', '-profile:v', 'high',
      '-movflags', '+faststart',
      ...(sound ? ['-c:a', 'aac', '-b:a', '128k'] : ['-an']),
      mp4,
    ])
  }
  out.push(`mp4 ${kb(mp4)}`)
  // poster = primer frame (lo primero que muestra el video: sin salto al empezar a reproducir)
  if (forced(id) || !fresh(poster, existsSync(mp4) ? mp4 : input)) {
    run(FFMPEG, ['-v', 'error', '-y', '-i', existsSync(mp4) ? mp4 : input, '-frames:v', '1', '-vf', fit(MAX_IMG), '-c:v', 'libwebp', '-quality', '75', poster])
  }
  out.push(`poster ${kb(poster)}`)
  return { type: 'video', sound, out }
}

const report = []
for (const cat of readdirSync(ROOT).filter((d) => statSync(join(ROOT, d)).isDirectory())) {
  const dir = join(ROOT, cat)
  const src = join(dir, '_src')
  const numbered = new Map() // n → { file, rank }
  if (existsSync(src)) {
    for (const f of readdirSync(src)) {
      const m = /^\((\d+)([a-z]?)\)/i.exec(f)
      const ext = extname(f).toLowerCase()
      if (!m || ![...IMG, ...VID].includes(ext)) continue
      const n = Number(m[1])
      const rank = m[2] ? m[2].toLowerCase().charCodeAt(0) : 0
      if (!numbered.has(n) || rank > numbered.get(n).rank) numbered.set(n, { file: join(src, f), rank })
    }
  }
  const masters = new Map() // n → archivo aprobado ya existente
  for (const f of readdirSync(dir)) {
    const m = new RegExp(`^${cat}-(\\d+)\\.(jpe?g|png|mp4)$`, 'i').exec(f)
    if (m) masters.set(Number(m[1]), join(dir, f))
  }
  const ids = [...new Set([...numbered.keys(), ...masters.keys()])].sort((a, b) => a - b)
  for (const n of ids) {
    const id = `${cat}-${n}`
    const useSrc = !masters.has(n) || (forced(id) && forceOnly.includes(id) && numbered.has(n))
    const input = useSrc ? numbered.get(n)?.file : masters.get(n)
    if (!input) continue
    const ext = extname(input).toLowerCase()
    try {
      const r = VID.includes(ext) ? video(id, input, dir, !useSrc) : image(id, input, dir)
      report.push({ id, from: useSrc ? `_src/${basename(input)}` : basename(input), ...r })
    } catch (e) {
      report.push({ id, from: basename(input), error: e.message.split('\n')[0] })
    }
  }
}

console.log('\nMedia de la galería\n')
for (const r of report) {
  if (r.error) console.log(`  ✖ ${r.id.padEnd(15)} ${r.error}`)
  else console.log(`  ✓ ${r.id.padEnd(15)} ${r.out.join(' · ')}   ← ${r.from}${r.sound ? '   (trae audio)' : ''}`)
}
const nuevos = report.filter((r) => r.from.startsWith('_src/') && !r.error)
if (nuevos.length) {
  console.log('\nBloques para casos.json (completa título/descripción/tags):\n')
  for (const r of nuevos) {
    const e = { media: r.id, type: r.type, ...(r.sound ? { sound: true } : {}), title: { es: '', en: '' }, desc: { es: '', en: '' }, tags: [] }
    console.log(JSON.stringify(e, null, 2) + ',')
  }
}
console.log()
