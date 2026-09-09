// Which files count as art, and how a filename becomes a slot name.
//
// Art arrives as PNG and is converted to WebP by scripts/optimize-art.mjs,
// so both formats are in play at once: a world someone has just dropped in
// is PNG until it is optimized, while the worlds shipped here are WebP. The
// slot name is the filename without its extension either way, so the format
// an image happens to be stored in never reaches the game's vocabulary —
// only these two functions know about extensions at all.

import { existsSync, readdirSync } from 'node:fs'
import { extname, join } from 'node:path'

/** Formats a browser will draw, in the order the optimizer prefers them. */
export const ART_EXTENSIONS = ['.webp', '.png', '.jpg', '.jpeg']

export function isArtFile(file) {
  return ART_EXTENSIONS.includes(extname(file).toLowerCase())
}

/**
 * Every art file in a folder as `{ slot, ext }`, sorted by slot.
 *
 * One slot cannot be two files: if both `key.png` and `key.webp` are present
 * — which happens mid-conversion — the ART_EXTENSIONS order decides, so the
 * optimized copy wins and the leftover original is ignored rather than
 * producing a duplicate slot.
 */
export function artIn(dir) {
  if (!existsSync(dir)) return []
  const bySlot = new Map()
  for (const file of readdirSync(dir)) {
    if (!isArtFile(file)) continue
    const ext = extname(file).toLowerCase()
    const slot = file.slice(0, -ext.length)
    const rank = ART_EXTENSIONS.indexOf(ext)
    const seen = bySlot.get(slot)
    if (!seen || rank < seen.rank) bySlot.set(slot, { slot, ext: ext.slice(1), rank })
  }
  return [...bySlot.values()]
    .map(({ slot, ext }) => ({ slot, ext }))
    .sort((a, b) => a.slot.localeCompare(b.slot))
}

/** Same, as a plain `{ slot: ext }` table for embedding in a manifest. */
export function extTable(entries, prefix = '') {
  return Object.fromEntries(entries.map(({ slot, ext }) => [`${prefix}${slot}`, ext]))
}

/** Path to a folder's art file for one slot, or null. */
export function artPath(dir, slot) {
  for (const ext of ART_EXTENSIONS) {
    const file = join(dir, slot + ext)
    if (existsSync(file)) return file
  }
  return null
}
