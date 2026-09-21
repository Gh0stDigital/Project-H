// Regenerates the home-screen icons in public/ from icons/master.webp.
//
// Runnable by hand: `node scripts/gen-icons.mjs [source]`. Not part of the
// build — the icon changes about once a year, and a build step that reran
// sharp over a 1254px master on every dev-server start would cost more than
// it saves.
//
// The master lives outside public/ on purpose: it is the source the icons
// are cut from, not something a player should ever download.

import sharp from 'sharp'
import { writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const SRC = process.argv[2] ?? join(ROOT, 'icons', 'master.webp')
const OUT = join(ROOT, 'public')

/** The colour the corners fall back to if a blur ever fails to cover them. */
const BACKDROP = '#101a2c'

/**
 * A fully opaque square.
 *
 * Home-screen icons are masked by the operating system: iOS lays its own
 * squircle over whatever it is handed, and composites any transparency onto
 * black first. Art that already has rounded corners — this master's radius
 * is 23% of its width — therefore arrives with black wedges at each corner,
 * because the system's mask is wider than the art's own curve. So the
 * corners have to be filled before iOS ever sees the file.
 *
 * Filled with a blown-up, blurred and darkened copy of the art rather than a
 * flat colour, so whatever shows through under the mask still matches the
 * picture at that corner. The same trick the title screen uses for its
 * plates.
 */
async function square(size) {
  const backdrop = await sharp(SRC)
    .resize(size, size, { fit: 'cover' })
    .blur(Math.max(2, size / 22))
    .modulate({ brightness: 0.82 })
    .flatten({ background: BACKDROP })
    .toBuffer()
  const art = await sharp(SRC).resize(size, size, { fit: 'contain', background: '#00000000' }).toBuffer()
  return sharp(backdrop).composite([{ input: art }]).png({ compressionLevel: 9 }).toBuffer()
}

/**
 * The Android maskable shape.
 *
 * A maskable icon may be cropped to a circle covering the middle 80%, so the
 * art is scaled into that safe zone and the rest is backdrop. Offering the
 * plain square as maskable would have cut the corners off the book.
 */
async function maskable(size) {
  const inner = Math.round(size * 0.78)
  const backdrop = await sharp(SRC)
    .resize(size, size, { fit: 'cover' })
    .blur(size / 16)
    .modulate({ brightness: 0.7 })
    .flatten({ background: BACKDROP })
    .toBuffer()
  const art = await sharp(SRC).resize(inner, inner, { fit: 'contain', background: '#00000000' }).toBuffer()
  const offset = Math.round((size - inner) / 2)
  return sharp(backdrop).composite([{ input: art, top: offset, left: offset }]).png({ compressionLevel: 9 }).toBuffer()
}

// 32 for the browser tab, 180 for iOS's apple-touch-icon, 192 and 512 for
// the web manifest.
for (const size of [32, 180, 192, 512]) {
  writeFileSync(join(OUT, `icon-${size}.png`), await square(size))
}
writeFileSync(join(OUT, 'icon-maskable-512.png'), await maskable(512))
console.log(`gen-icons: 5 icons written to public/ from ${SRC.replace(ROOT + '/', '')}`)
