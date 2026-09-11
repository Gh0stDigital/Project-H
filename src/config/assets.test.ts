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
