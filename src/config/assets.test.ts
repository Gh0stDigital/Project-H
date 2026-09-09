import { describe, it, expect } from 'vitest'
import { assetKeys, getAsset, hasAsset, resolveKey } from './assets'
import { assetManifest } from './assetManifest'

describe('asset registry', () => {
  it('discovers art from the folder rather than a hand-written list', () => {
    // totem_silverKnight.png was added to the folder but never registered,
    // so it was invisible to the game. Auto-discovery is what fixes that.
    expect(assetKeys('totems')).toContain('totem_silverKnight')
    expect(hasAsset('totems', 'totem_silverKnight')).toBe(true)
  })

  it('falls back to the placeholder for an unknown key', () => {
    expect(getAsset('totems', 'no_such_totem')).toBe(getAsset('totems', 'default'))
  })

  it('matches keys ignoring case and separators', () => {
    // Art arrives named by hand; a capital letter should not lose an image.
    const canonical = getAsset('totems', 'totem_silverKnight')
    expect(getAsset('totems', 'totem_silverknight')).toBe(canonical)
    expect(getAsset('totems', 'TOTEM-SILVERKNIGHT')).toBe(canonical)
    expect(hasAsset('totems', 'totem silver knight')).toBe(true)
  })

  it('resolveKey takes the first candidate that exists', () => {
    expect(resolveKey('totems', ['no_such_totem', 'totem_ember'])).toBe('totem_ember')
    expect(resolveKey('totems', ['no_such_totem', 'also_missing'])).toBeNull()
  })

  it('matches the real art regardless of how the key is written', () => {
    // Art arrives named by hand, so case and separators should not lose it.
    expect(resolveKey('totems', ['TOTEM_EMBER'])).toBe('totem_ember')
    expect(resolveKey('totems', ['totem-ember'])).toBe('totem_ember')
    expect(resolveKey('totems', ['totem_flame'])).toBeNull()
  })

  it('holds only world-independent art now that worlds own the rest', () => {
    // Locations, events, enemies and NPCs moved into public/worlds; a Totem
    // is the player's character and can enter any world.
    expect(Object.keys(assetManifest).sort()).toEqual(['spells', 'totems'])
  })
})
