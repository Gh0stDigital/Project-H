import { describe, expect, it } from 'vitest'
import { RANDOM_SET_ID, pickRandomSet, usableSets } from './spellSetManager'
import type { SpellSet } from '@/domain/spellSet'

const set = (id: string, words: number): SpellSet => ({
  id,
  name: id,
  spellIds: Array.from({ length: words }, (_, i) => `${id}-w${i}`),
  createdAt: '2026-01-01T00:00:00.000Z',
  modifiedAt: '2026-01-01T00:00:00.000Z',
})

describe('letting the dungeon choose its own words', () => {
  it('is a set id, so everything that stores a set stores it too', () => {
    // A saved selection, the setup screen's state, the run's config: none of
    // them need to know what it means, only to carry it.
    expect(typeof RANDOM_SET_ID).toBe('string')
    expect(RANDOM_SET_ID.length).toBeGreaterThan(0)
  })

  it('passes over the sets with nothing in them', () => {
    const sets = [set('a', 0), set('b', 3), set('c', 0)]
    expect(usableSets(sets).map((s) => s.id)).toEqual(['b'])
    for (const r of [0, 0.5, 0.99]) {
      expect(pickRandomSet(sets, () => r)?.id).toBe('b')
    }
  })

  it('has nothing to pick when every set is empty', () => {
    expect(pickRandomSet([set('a', 0)], () => 0.5)).toBeNull()
    expect(pickRandomSet([], () => 0.5)).toBeNull()
  })

  it('can reach every usable set', () => {
    const sets = [set('a', 1), set('b', 1), set('c', 1)]
    const seen = new Set([0, 0.4, 0.9].map((r) => pickRandomSet(sets, () => r)!.id))
    expect(seen).toEqual(new Set(['a', 'b', 'c']))
  })

  it('does not hand back the set the last run used', () => {
    // Asking for random and getting the same words again reads as the
    // setting having done nothing.
    const sets = [set('a', 1), set('b', 1), set('c', 1)]
    for (const r of [0, 0.25, 0.5, 0.75, 0.999]) {
      expect(pickRandomSet(sets, () => r, 'b')?.id).not.toBe('b')
    }
  })

  it('still returns the only set when it is the one to avoid', () => {
    // One set and a repeat is better than refusing to start the run.
    expect(pickRandomSet([set('a', 2)], () => 0.5, 'a')?.id).toBe('a')
  })

  it('stays in range when random returns exactly 1', () => {
    const sets = [set('a', 1), set('b', 1)]
    expect(['a', 'b']).toContain(pickRandomSet(sets, () => 1)!.id)
  })
})
