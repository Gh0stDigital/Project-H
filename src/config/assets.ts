/**
 * Local asset configuration.
 *
 * All game art is bundled as local PNG files under /public/assets — nothing
 * is ever fetched from the network. Every lookup here falls back to a
 * neutral placeholder so the game stays fully playable before final art
 * exists.
 *
 * The catalogue is generated from the folder itself (assetManifest.ts, via
 * scripts/gen-asset-manifest.mjs) rather than hand-listed. Dropping a PNG
 * into public/assets/<category>/ is all it takes to make it usable — there
 * is no second place to remember to update.
 */

import { assetManifest } from './assetManifest'

export type AssetCategory = keyof typeof assetManifest

const BASE = 'assets'

/**
 * Data URIs for every image, present only in the single-file offline
 * build (see scripts/bundle-offline.mjs), which inlines the art so one
 * HTML file is the whole game. Absent in every other build, where images
 * are ordinary sibling files.
 */
function inlinedAssets(): Record<string, string> | undefined {
  return (globalThis as { __THOTH_INLINE_ASSETS?: Record<string, string> }).__THOTH_INLINE_ASSETS
}

function assetUrl(category: string, file: string): string {
  // Vite serves /public at the app root; base: './' in vite.config.ts keeps
  // this working when the built app is opened directly from disk.
  const path = `${BASE}/${category}/${file}.png`
  return inlinedAssets()?.[path] ?? path
}

const registry = Object.fromEntries(
  Object.entries(assetManifest).map(([category, keys]) => [
    category,
    Object.fromEntries((keys as readonly string[]).map((key) => [key, assetUrl(category, key)])),
  ]),
) as Record<AssetCategory, Record<string, string>>

/**
 * Keys matched loosely: lowercased with separators removed, so `dkp_keyRoom`,
 * `dkp-keyroom` and `DKPKeyRoom` all name the same art. Art tends to arrive
 * named by hand, and a capital letter is not worth a missing image.
 */
function normalize(key: string): string {
  return key.toLowerCase().replace(/[^a-z0-9]/g, '')
}

const loose: Record<AssetCategory, Record<string, string>> = Object.fromEntries(
  Object.entries(registry).map(([category, table]) => [
    category,
    Object.fromEntries(Object.keys(table).map((key) => [normalize(key), key])),
  ]),
) as Record<AssetCategory, Record<string, string>>

/** The key a category falls back to: its `default`, else whatever it has. */
function fallbackKey(category: AssetCategory): string {
  const table = registry[category]
  return 'default' in table ? 'default' : Object.keys(table)[0]
}

/**
 * Resolve an asset path for a category + key, falling back to that
 * category's "default" placeholder when the key is missing or blank.
 */
export function getAsset(category: AssetCategory, key?: string | null): string {
  const table = registry[category]
  if (!table) return ''
  if (key) {
    if (table[key]) return table[key]
    const match = loose[category][normalize(key)]
    if (match) return table[match]
  }
  return table[fallbackKey(category)]
}

/** Deterministically pick a "random" flavor asset for a category from an id string. */
export function pickFlavor(category: AssetCategory, seed: string): string {
  const table = registry[category]
  const fallback = fallbackKey(category)
  const keys = Object.keys(table).filter((k) => k !== fallback)
  if (keys.length === 0) return table[fallback]
  let hash = 0
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0
  return table[keys[hash % keys.length]]
}

export const assetRegistry = registry

/**
 * Every key a category offers, in registry order. This is the list the UI
 * picks from, so anything dropped into public/assets/<category>/ becomes
 * selectable with no other change.
 */
export function assetKeys(category: AssetCategory): string[] {
  return Object.keys(registry[category] ?? {})
}

/** True when a key names real art rather than falling back to the placeholder. */
export function hasAsset(category: AssetCategory, key: string): boolean {
  if (!registry[category]) return false
  return key in registry[category] || normalize(key) in loose[category]
}

/**
 * First candidate that names real art, or null. Lets callers list several
 * spellings and preferences for one slot and take whichever exists.
 */
export function resolveKey(category: AssetCategory, candidates: readonly string[]): string | null {
  if (!registry[category]) return null
  for (const candidate of candidates) {
    if (registry[category][candidate]) return candidate
    const match = loose[category][normalize(candidate)]
    if (match) return match
  }
  return null
}
