// Which files count as art, and how a filename becomes a slot name.
//
// Art arrives as PNG and is converted to WebP by scripts/optimize-art.mjs,
// so both formats are in play at once: a world someone has just dropped in
// is PNG until it is optimized, while the worlds shipped here are WebP. The
// slot name is the filename without its extension either way, so the format
// an image happens to be stored in never reaches the game's vocabulary —
// only this module knows about extensions at all.
//
// Case is not part of the vocabulary either. `Key.png` fills the `key` slot,
// because art is named by hand and a capital letter is not worth a missing
// image — the same rule config/assets.ts already applies to global art. The
// slot is reported under its canonical spelling and the real filename is
// carried alongside it, since a case-sensitive host serves `Key.png` and
// `key.png` as different files.

import { existsSync, readdirSync } from 'node:fs'
import { extname, join } from 'node:path'

/** Formats a browser will draw, in the order the optimizer prefers them. */
export const ART_EXTENSIONS = ['.webp', '.png', '.jpg', '.jpeg']

/**
 * Formats a browser will decode, best first. Placeholder tones are written as
 * WAV because it needs no encoder; real audio arrives compressed.
 */
export const AUDIO_EXTENSIONS = ['.m4a', '.mp3', '.ogg', '.webm', '.wav']

export function isArtFile(file) {
  return ART_EXTENSIONS.includes(extname(file).toLowerCase())
}

const fold = (name) => name.toLowerCase()

/**
 * Every art file in a folder as `{ slot, file, ext }`, sorted by slot.
 *
 * `canonical` names the slots this folder is supposed to fill; a file whose
 * name matches one of them apart from case is reported under the canonical
 * spelling. Folders whose filenames are the content — npcs, enemies — pass
 * nothing and keep their names exactly as they are.
 *
 * One slot cannot be two files. If a folder holds both `key.png` and
 * `Key.webp`, ART_EXTENSIONS order decides and the loser is returned in
 * `collisions` so the generator can say so rather than silently dropping it.
 */
export function artIn(dir, canonical = [], exts = ART_EXTENSIONS) {
  if (!existsSync(dir)) return []
  const canonicalBy = new Map(canonical.map((slot) => [fold(slot), slot]))
  const bySlot = new Map()
  const collisions = []

  for (const file of readdirSync(dir).sort()) {
    const ext = extname(file).toLowerCase()
    if (!exts.includes(ext)) continue
    const name = file.slice(0, -ext.length)
    const slot = canonicalBy.get(fold(name)) ?? name
    const entry = { slot, file, ext: ext.slice(1), rank: exts.indexOf(ext) }
    const seen = bySlot.get(slot)
    if (!seen) {
      bySlot.set(slot, entry)
    } else if (entry.rank < seen.rank) {
      bySlot.set(slot, entry)
      collisions.push({ slot, ignored: seen.file, used: entry.file })
    } else {
      collisions.push({ slot, ignored: entry.file, used: seen.file })
    }
  }

  const out = [...bySlot.values()]
    .map(({ slot, file, ext }) => ({ slot, file, ext }))
    .sort((a, b) => a.slot.localeCompare(b.slot))
  out.collisions = collisions
  return out
}

/** A folder's art as a `{ "<prefix><slot>": filename }` table for a manifest. */
export function fileTable(entries, prefix = '') {
  return Object.fromEntries(entries.map(({ slot, file }) => [`${prefix}${slot}`, file]))
}

/** Path to a folder's art for one slot, ignoring case, or null. */
export function artPath(dir, slot, exts = ART_EXTENSIONS) {
  if (!existsSync(dir)) return null
  const want = fold(slot)
  for (const ext of exts) {
    for (const file of readdirSync(dir)) {
      if (extname(file).toLowerCase() !== ext) continue
      if (fold(file.slice(0, -ext.length)) === want) return join(dir, file)
    }
  }
  return null
}
