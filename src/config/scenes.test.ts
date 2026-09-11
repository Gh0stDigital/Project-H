import { describe, it, expect } from 'vitest'
import { sceneSlotFor, sceneKindForEvent } from './scenes'
import { worldPacks } from './worldManifest'
import { playableWorlds } from '@/systems/worldRegistry'

const worlds = playableWorlds()

describe('sceneKindForEvent', () => {
  it('maps every event type to a scene kind', () => {
    const types = ['treasure','trap','magic_room','rest','battle','direction','boss_door','key_room'] as const
    for (const type of types) expect(sceneKindForEvent(type)).toBeTruthy()
  })
})

describe('sceneSlotFor', () => {
  it('has at least one playable world to draw on', () => {
    expect(worlds.length).toBeGreaterThan(0)
  })

  // Every world answers the same questions, so the checks run against all
  // of them — a new pack is covered the moment it is added.
  for (const world of worlds) {
    describe(world.id, () => {
      it('resolves every scene kind to a location the world actually has', () => {
        const kinds = ['standby','treasure','trap','battle','battle_screen','boss_battle','boss_door','rest','magic_room','key_room','direction','entrance'] as const
        for (const kind of kinds) {
          const slot = sceneSlotFor(world, kind, 'seed')
          expect(slot, `${world.id}/${kind}`).not.toBeNull()
          expect(world.locations, `${world.id}/${kind}`).toContain(slot!)
        }
      })

      it('sends each situation to its own room', () => {
        expect(sceneSlotFor(world, 'rest', 'x')).toBe('restRoom')
        expect(sceneSlotFor(world, 'direction', 'x')).toBe('pathwayFork')
        expect(sceneSlotFor(world, 'boss_battle', 'x')).toBe('bossRoom')
        expect(sceneSlotFor(world, 'magic_room', 'x')).toBe('shrineRoom')
      })

      it('is stable for one seed and varies across them', () => {
        expect(sceneSlotFor(world, 'standby', 'turn-4')).toBe(sceneSlotFor(world, 'standby', 'turn-4'))
        const seen = new Set(Array.from({ length: 12 }, (_, i) => sceneSlotFor(world, 'standby', String(i))))
        expect(seen.size).toBeGreaterThan(1)
      })

      it('usually shows the room the event is about', () => {
        const picks = Array.from({ length: 300 }, (_, i) => sceneSlotFor(world, 'treasure', `evt-${i}`))
        const onTheme = picks.filter((k) => k === 'treasureRoom').length
        expect(onTheme / picks.length).toBeGreaterThan(0.5)
      })
    })
  }
})

describe('world packs', () => {
  it('reports incomplete packs rather than offering them', () => {
    for (const w of worldPacks) {
      if (w.complete) expect(w.missing).toHaveLength(0)
      else expect(w.missing.length).toBeGreaterThan(0)
    }
  })
})

describe('fights happen in arenas', () => {
  const ARENAS = ['battle', 'battle1', 'battle2']
  const seeds = Array.from({ length: 300 }, (_, i) => `evt-${i}`)

  for (const world of worlds) {
    const arenas = world.locations.filter((slot) => ARENAS.includes(slot))
    // `starter` ships no arena; corridors are a real fallback there, not a
    // shortfall, so it is excluded rather than asserted against.
    const hasArena = arenas.length > 0

    describe.skipIf(!hasArena)(world.id, () => {
      it('never sends a fight to a corridor', () => {
        // parasite-garden had one listed arena against three corridors and
        // picked evenly between them, so three fights in four were a passage.
        for (const kind of ['battle', 'battle_screen'] as const) {
          const picked = seeds.map((seed) => sceneSlotFor(world, kind, seed))
          for (const slot of picked) expect(arenas, `${world.id}/${kind}`).toContain(slot!)
        }
      })

      it('uses every arena the world ships', () => {
        // battle1 was in no candidate list at all, so parasite-garden's first
        // arena could never be chosen however many times the game rolled.
        const picked = new Set(seeds.map((seed) => sceneSlotFor(world, 'battle_screen', seed)))
        for (const arena of arenas) expect(picked, `${world.id}`).toContain(arena)
      })
    })
  }

  it('still finds a backdrop for a world with no arena at all', () => {
    const bare = worlds.find((w) => !w.locations.some((s) => ARENAS.includes(s)))
    if (!bare) return
    const slot = sceneSlotFor(bare, 'battle_screen', 'seed')
    expect(slot).not.toBeNull()
    expect(bare.locations).toContain(slot!)
  })
})
