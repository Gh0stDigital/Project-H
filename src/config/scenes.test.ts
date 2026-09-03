import { describe, it, expect } from 'vitest'
import { sceneArt, sceneKeyFor, sceneKindForEvent } from './scenes'
import { assetManifest } from './assetManifest'

const scenes: readonly string[] = assetManifest.locations

describe('sceneKindForEvent', () => {
  it('maps every event type to a scene kind', () => {
    const types = [
      'treasure', 'trap', 'magic_room', 'rest',
      'battle', 'direction', 'boss_door', 'key_room',
    ] as const
    for (const type of types) {
      expect(sceneKindForEvent(type)).toBeTruthy()
    }
  })
})

describe('sceneKeyFor', () => {
  it('picks art that actually exists', () => {
    for (const kind of ['standby', 'treasure', 'trap', 'battle', 'rest', 'direction'] as const) {
      const key = sceneKeyFor(kind, 'seed')
      expect(key).not.toBeNull()
      expect(scenes).toContain(key!)
    }
  })

  it('gives the boss its own room', () => {
    expect(sceneKeyFor('boss_battle', 'x')).toBe('dkp_bossBattle')
  })

  it('sends rest events to the rest room', () => {
    expect(sceneKeyFor('rest', 'x')).toBe('dkp_restRoom')
  })

  it('sends direction forks to the two-way', () => {
    expect(sceneKeyFor('direction', 'x')).toBe('dkp_2way')
  })

  it('is stable for one seed', () => {
    expect(sceneKeyFor('standby', 'turn-4')).toBe(sceneKeyFor('standby', 'turn-4'))
  })

  it('varies across seeds where more than one backdrop fits', () => {
    // Standby alternates between corridors, so a run of turns must not be
    // one unchanging picture — that was the original complaint.
    const seen = new Set(Array.from({ length: 12 }, (_, i) => sceneKeyFor('standby', String(i))))
    expect(seen.size).toBeGreaterThan(1)
  })
})

describe('sceneArt', () => {
  it('names the room the event is about', () => {
    expect(sceneArt('rest', 'x', 'cave')).toEqual({ category: 'locations', key: 'dkp_restRoom' })
  })

  it('always names art that exists', () => {
    // Either dedicated scene art, or the run's own location as fallback —
    // never a key that would render as a broken image.
    for (const kind of ['standby', 'treasure', 'trap', 'battle', 'boss_battle', 'rest'] as const) {
      const art = sceneArt(kind, 'x', 'ruins')
      expect(scenes).toContain(art.key)
    }
  })

  it('finds the corridor art', () => {
    expect(sceneKeyFor('standby', 'x')).toMatch(/^dkp_corridor[12]$/)
  })
})

describe('scene weighting', () => {
  it('usually shows the room the event is about', () => {
    // Picking uniformly made a treasure event show a corridor most of the
    // time, which read as "the backdrop is wrong" rather than "varied".
    const picks = Array.from({ length: 300 }, (_, i) => sceneKeyFor('treasure', `evt-${i}`))
    const onTheme = picks.filter((k) => k === 'dkp_treasureRoom').length
    expect(onTheme / picks.length).toBeGreaterThan(0.5)
  })

  it('still varies', () => {
    const picks = new Set(Array.from({ length: 300 }, (_, i) => sceneKeyFor('treasure', `evt-${i}`)))
    expect(picks.size).toBeGreaterThan(1)
  })

  it('keeps standby corridors evenly mixed', () => {
    const picks = Array.from({ length: 300 }, (_, i) => sceneKeyFor('standby', `turn-${i}`))
    const first = picks.filter((k) => k === picks[0]).length
    expect(first / picks.length).toBeLessThan(0.75)
  })
})
