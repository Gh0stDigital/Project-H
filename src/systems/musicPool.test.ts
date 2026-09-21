import { describe, expect, it } from 'vitest'
import { pickTrack } from './musicPool'

const POOL = ['dungeon/a', 'dungeon/b', 'dungeon/c']

describe('picking a track from a pool', () => {
  it('has nothing to pick from an empty pool', () => {
    // What every slot without a folder looks like. The single file plays.
    expect(pickTrack([], () => 0.5)).toBeNull()
  })

  it('picks the only track when there is only one', () => {
    expect(pickTrack(['dungeon/a'], () => 0.99)).toBe('dungeon/a')
  })

  it('still picks the only track when it is the one to avoid', () => {
    // Two runs in a row on a one-track pool is not a reason for silence.
    expect(pickTrack(['dungeon/a'], () => 0.5, 'dungeon/a')).toBe('dungeon/a')
  })

  it('never picks the track that just played', () => {
    for (const r of [0, 0.25, 0.5, 0.75, 0.999]) {
      expect(pickTrack(POOL, () => r, 'dungeon/b')).not.toBe('dungeon/b')
    }
  })

  it('can reach every track in the pool', () => {
    const seen = new Set<string>()
    for (const r of [0, 0.4, 0.9]) seen.add(pickTrack(POOL, () => r)!)
    expect(seen).toEqual(new Set(POOL))
  })

  it('stays inside the pool when random returns exactly 1', () => {
    // Math.random() is documented as < 1, but a seeded generator handed in
    // by a test or a replay need not be, and an out-of-range index would
    // read as a missing track and play nothing.
    expect(POOL).toContain(pickTrack(POOL, () => 1))
  })

  it('falls back to the whole pool when every track is excluded', () => {
    expect(pickTrack(['x', 'x'], () => 0.5, 'x')).toBe('x')
  })
})
