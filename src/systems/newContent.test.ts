import { describe, it, expect } from 'vitest'
import { findNewContent, hasNewContent, markSeen, emptySeen } from './newContent'
import type { WorldPack } from '@/config/worldManifest'

const pack = (id: string, complete = true): WorldPack => ({
  id, name: id, description: '', complete, missing: complete ? [] : ['events/rest.png'],
  locations: [], optionalLocations: [], events: [], npcs: [], enemies: [], bosses: [], ext: {},
})

describe('findNewContent', () => {
  it('reports a world the player has not seen', () => {
    const found = findNewContent([pack('a'), pack('b')], [], { worldIds: ['a'], totemKeys: [] })
    expect(found.worlds.map((w) => w.id)).toEqual(['b'])
    expect(hasNewContent(found)).toBe(true)
  })

  it('never announces an unfinished world', () => {
    // Announcing it once would mean staying silent when it is finished.
    const found = findNewContent([pack('wip', false)], [], emptySeen())
    expect(found.worlds).toHaveLength(0)
  })

  it('reports new totems but never the built-in placeholder', () => {
    const found = findNewContent([], ['default', 'ember', 'zoah'], { worldIds: [], totemKeys: ['ember'] })
    expect(found.totems).toEqual(['zoah'])
  })

  it('says nothing when everything is already known', () => {
    const found = findNewContent([pack('a')], ['ember'], { worldIds: ['a'], totemKeys: ['ember'] })
    expect(hasNewContent(found)).toBe(false)
  })
})

describe('markSeen', () => {
  it('records complete worlds and real totems', () => {
    expect(markSeen([pack('a'), pack('b', false)], ['default', 'ember'])).toEqual({
      worldIds: ['a'],
      totemKeys: ['ember'],
    })
  })

  it('leaves an unfinished world unseen so finishing it still announces', () => {
    const seen = markSeen([pack('wip', false)], [])
    const found = findNewContent([pack('wip', true)], [], seen)
    expect(found.worlds.map((w) => w.id)).toEqual(['wip'])
  })
})
