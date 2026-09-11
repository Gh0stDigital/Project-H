import { describe, it, expect } from 'vitest'
import { buildPlateau, clearRequirement, isFullyCleared, pickBarrierWord, uncleared } from './bossPlateau'

const ids = ['a', 'b', 'c', 'd']

describe('the barrier picks the word', () => {
  it('only ever offers a requirement still standing', () => {
    // A cleared word would be a turn the player cannot win anything with,
    // and with a fifty-word set most of them are cleared by the end.
    let plateau = buildPlateau(ids)
    plateau = clearRequirement(clearRequirement(plateau, 'a'), 'c')
    const seen = new Set<string>()
    for (let i = 0; i < 200; i++) {
      const rng = () => i / 200
      seen.add(pickBarrierWord(plateau, rng)!)
    }
    expect([...seen].sort()).toEqual(['b', 'd'])
  })

  it('can reach every word that is left', () => {
    const plateau = buildPlateau(ids)
    const seen = new Set<string>()
    for (let i = 0; i < 400; i++) seen.add(pickBarrierWord(plateau, () => i / 400)!)
    expect([...seen].sort()).toEqual(ids)
  })

  it('returns nothing once the barrier is down', () => {
    const plateau = ids.reduce(clearRequirement, buildPlateau(ids))
    expect(isFullyCleared(plateau)).toBe(true)
    expect(pickBarrierWord(plateau, () => 0.5)).toBeNull()
  })

  it('stays in range for an rng that returns exactly 1', () => {
    // Math.random() never returns 1, but a stubbed or seeded one can, and
    // indexing past the end would hand the reel an undefined word.
    const plateau = buildPlateau(ids)
    expect(pickBarrierWord(plateau, () => 1)).toBe('d')
  })

  it('lists what is left in set order', () => {
    const plateau = clearRequirement(buildPlateau(ids), 'b')
    expect(uncleared(plateau)).toEqual(['a', 'c', 'd'])
  })
})
