import { describe, it, expect } from 'vitest'
import { assetKeys, getAsset, hasAsset, resolveKey } from './assets'
import { assetManifest } from './assetManifest'

// Named against whatever art the folder actually holds. Pinning these to one
// filename made them fail the moment a totem was deleted, which is a thing
// the folder is meant to allow.
const someTotem = assetKeys('totems').find((k) => k !== 'default')!

describe('asset registry', () => {
  it('discovers art from the folder rather than a hand-written list', () => {
    // A portrait was once added to the folder but never registered, so it was
    // invisible to the game. Auto-discovery is what fixes that.
    expect(assetKeys('totems').length).toBeGreaterThan(0)
    for (const key of assetKeys('totems')) expect(hasAsset('totems', key)).toBe(true)
  })

  it('falls back to the placeholder for an unknown key', () => {
    expect(getAsset('totems', 'no_such_totem')).toBe(getAsset('totems', 'default'))
  })

  it('matches keys ignoring case and separators', () => {
    // Art arrives named by hand; a capital letter should not lose an image.
    const canonical = getAsset('totems', someTotem)
    expect(getAsset('totems', someTotem.toLowerCase())).toBe(canonical)
    expect(getAsset('totems', someTotem.toUpperCase().replace(/_/g, '-'))).toBe(canonical)
    expect(hasAsset('totems', someTotem.replace(/_/g, ' '))).toBe(true)
  })

  it('resolveKey takes the first candidate that exists', () => {
    expect(resolveKey('totems', ['no_such_totem', someTotem])).toBe(someTotem)
    expect(resolveKey('totems', ['no_such_totem', 'also_missing'])).toBeNull()
  })

  it('matches the real art regardless of how the key is written', () => {
    // Art arrives named by hand, so case and separators should not lose it.
    expect(resolveKey('totems', [someTotem.toUpperCase()])).toBe(someTotem)
    expect(resolveKey('totems', [someTotem.replace(/_/g, '-')])).toBe(someTotem)
    expect(resolveKey('totems', ['totem_flame'])).toBeNull()
  })

  it('holds no world content now that worlds own it', () => {
    // Locations, events, enemies, NPCs and bosses moved into public/worlds.
    // What is left is art that belongs to no world: a Totem is the player's
    // character and travels between them, and ui/ is the interface itself.
    // Stated as what may not be here rather than as an exact list, so adding
    // another world-independent category is not a test failure.
    const worldOwned = ['locations', 'events', 'enemies', 'npcs', 'bosses', 'traps', 'treasure', 'battlebg']
    for (const category of worldOwned) {
      expect(Object.keys(assetManifest)).not.toContain(category)
    }
  })
})

describe('a totem_ prefix is decoration, not identity', () => {
  // Portraits are named both ways — totem_stone and silverKnight sit in the
  // folder together — and a save holds whatever key it was written with. If
  // the prefix decided identity, renaming a file would quietly cost a player
  // their character's face. Derived from the folder rather than pinned to a
  // filename, so deleting a totem is still allowed.
  const isPrefixed = (key: string) => /^totem/i.test(key.replace(/[^a-z0-9]/gi, ''))
  const prefixed = assetKeys('totems').find(isPrefixed)
  const plain = assetKeys('totems').find((key) => key !== 'default' && !isPrefixed(key))

  it.skipIf(!plain)('finds unprefixed art through a prefixed key', () => {
    expect(getAsset('totems', `totem_${plain}`)).toBe(getAsset('totems', plain!))
    expect(hasAsset('totems', `totem_${plain}`)).toBe(true)
    expect(resolveKey('totems', [`totem_${plain}`])).toBe(plain)
  })

  it.skipIf(!prefixed)('finds prefixed art through a bare key', () => {
    const bare = prefixed!.replace(/^totem[_-]?/i, '')
    expect(getAsset('totems', bare)).toBe(getAsset('totems', prefixed!))
    expect(resolveKey('totems', [bare])).toBe(prefixed)
  })

  it('lets an exact spelling outrank another key stripped of its prefix', () => {
    // Both spellings can be present at once; whichever is asked for by name
    // is the one that answers.
    for (const key of assetKeys('totems')) expect(resolveKey('totems', [key])).toBe(key)
  })

  it('still falls back when the name matches with or without the prefix', () => {
    expect(getAsset('totems', 'totem_no_such_totem')).toBe(getAsset('totems', 'default'))
    expect(hasAsset('totems', 'totem_no_such_totem')).toBe(false)
  })
})

describe('a folder without a `default` still answers', () => {
  // default.webp was renamed to Dolbae.webp — the placeholder turned out to
  // be a character. Every save still names `default` as its portrait, so an
  // unknown key has to land on real art rather than on nothing.
  it('falls back to a real portrait when there is no default', () => {
    const resolved = getAsset('totems', 'no_such_totem')
    expect(resolved).toBeTruthy()
    const real = assetKeys('totems').map((key) => getAsset('totems', key))
    expect(real).toContain(resolved)
  })

  it('resolves the key every save was written with', () => {
    // Not a placeholder and not empty: whatever `default` means now, asking
    // for it gets a portrait.
    expect(getAsset('totems', 'default')).toBe(getAsset('totems', 'no_such_totem'))
    expect(getAsset('totems', 'default')).toBeTruthy()
  })
})
