// Re-encodes game art as WebP, in place, under public/.
//
// Why this exists: the art arrives as full-size lossless PNG — roughly 3 MB
// for a single backdrop. The game draws all of it into a 430 px-wide phone
// viewport, and the offline build inlines every image as a data URI, so that
// 3 MB is 4 MB of base64 in a single HTML file the phone has to parse before
// it can show anything. Uncompressed, the whole tree came to 72 MB and the
// offline file to 98 MB, which is past the point where opening it is a
// reliable thing to do.
//
// What it changes: nothing about how a world is authored. Art still arrives
// as PNG and a world dropped in as PNG plays exactly as it is — the manifests
// record whatever extension each file has (scripts/artFiles.mjs). Running
// this is what makes that art small, and it is worth running on anything new.
//
//   npm run optimize:art             convert everything not already WebP
//   npm run optimize:art -- --dry-run   report what it would save
//
// Safe to run twice: WebP files are left alone, so a second run is a no-op.

import { readdirSync, statSync, writeFileSync, unlinkSync, existsSync } from 'node:fs'
import { dirname, extname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const ROOTS = [join(ROOT, 'public', 'assets'), join(ROOT, 'public', 'worlds')]

/**
 * The widest an image can ever be drawn: the viewport is 430 CSS px and a
 * phone screen is at most 3 device pixels to one CSS pixel. Anything past
 * this is detail the screen has no room for.
 */
export const MAX_WIDTH = 1290

/**
 * Chosen by measuring, not by taste. Past 88 the encoder spends noticeably
 * more bytes for a fraction of a dB — the busiest event image gains 0.8 dB
 * between q88 and q95 for 30% more size — and below it the flat washes in
 * the backdrops start to band. Alpha is kept lossless: sprite edges sit
 * against a dark backdrop where a soft edge would read as a halo.
 */
const QUALITY = 88

const SOURCES = ['.png', '.jpg', '.jpeg']

function walk(dir) {
  if (!existsSync(dir)) return []
  return readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry)
    return statSync(path).isDirectory() ? walk(path) : [path]
  })
}

/** Every convertible image under public/, with the size it currently costs. */
export function convertible() {
  return ROOTS.flatMap(walk)
    .filter((f) => SOURCES.includes(extname(f).toLowerCase()))
    .map((f) => ({ path: f, bytes: statSync(f).size }))
}

async function encode(path) {
  const image = sharp(path)
  const { width } = await image.metadata()
  return image
    .resize({ width: Math.min(width ?? MAX_WIDTH, MAX_WIDTH), withoutEnlargement: true })
    .webp({ quality: QUALITY, alphaQuality: 100, effort: 6 })
    .toBuffer()
}

export async function optimizeArt({ dryRun = false, log = () => {} } = {}) {
  const files = convertible()
  let before = 0
  let after = 0
  let converted = 0
  let kept = 0

  for (const { path, bytes } of files) {
    const encoded = await encode(path)
    const target = path.slice(0, -extname(path).length) + '.webp'
    before += bytes

    // A 256 px placeholder is already a few kilobytes of flat colour, and
    // WebP can lose to PNG on those. Keeping the smaller file means running
    // this can only ever help.
    if (encoded.length >= bytes) {
      after += bytes
      kept++
      continue
    }
    after += encoded.length
    converted++
    if (dryRun) continue
    writeFileSync(target, encoded)
    if (target !== path) unlinkSync(path)
  }

  const mb = (n) => (n / 1048576).toFixed(1)
  log(
    `optimize-art: ${converted} converted, ${kept} left as-is — ` +
      `${mb(before)} MB → ${mb(after)} MB` +
      (before > 0 ? ` (${Math.round((100 * after) / before)}%)` : '') +
      (dryRun ? ' [dry run, nothing written]' : ''),
  )
  return { converted, kept, before, after }
}

if (process.argv[1] && process.argv[1].endsWith('optimize-art.mjs')) {
  const dryRun = process.argv.includes('--dry-run')
  const files = convertible()
  if (files.length === 0) {
    console.log('optimize-art: everything is already WebP.')
  } else {
    for (const { path } of files) console.log(`  ${relative(ROOT, path)}`)
    await optimizeArt({ dryRun, log: (m) => console.log(m) })
  }
}
