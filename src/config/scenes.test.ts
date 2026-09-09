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
