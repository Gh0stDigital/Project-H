import { describe, it, expect } from 'vitest'
import { PersistenceService, createMemoryAdapter } from './persistence'

/**
 * savedAt() is what the title screen asks before offering to continue, and
 * before warning that starting fresh will erase something. A wrong answer
 * either hides a save the player still wants or erases one without asking,
 * so every way it can be wrong is worth a test.
 */
describe('is there a save', () => {
  it('says no when nothing has been written', () => {
    const p = new PersistenceService<{ n: number }>(createMemoryAdapter())
    expect(p.savedAt()).toBeNull()
  })

  it('reports when the save was written', () => {
    const p = new PersistenceService<{ n: number }>(createMemoryAdapter())
    const before = Date.now()
    p.save({ n: 1 })
    const when = p.savedAt()
    expect(when).not.toBeNull()
    expect(when!.getTime()).toBeGreaterThanOrEqual(before - 1000)
    expect(when!.getTime()).toBeLessThanOrEqual(Date.now() + 1000)
  })

  it('says no again once the save is cleared', () => {
    const p = new PersistenceService<{ n: number }>(createMemoryAdapter())
    p.save({ n: 1 })
    p.clear()
    expect(p.savedAt()).toBeNull()
  })

  it('says no to a blob it cannot parse', () => {
    const adapter = createMemoryAdapter()
    adapter.setItem('thoth.save.v1', 'not json at all')
    expect(new PersistenceService(adapter).savedAt()).toBeNull()
  })

  it('says no to a save from a schema this build cannot read', () => {
    // It must agree with load(), which refuses the same save. Offering to
    // continue a game that would come back empty is worse than not offering.
    const adapter = createMemoryAdapter()
    new PersistenceService<{ n: number }>(adapter, 'thoth.save.v1', 2).save({ n: 1 })
    const current = new PersistenceService<{ n: number }>(adapter, 'thoth.save.v1', 1)
    expect(current.load()).toBeNull()
    expect(current.savedAt()).toBeNull()
  })

  it('says no to an envelope with an unreadable timestamp', () => {
    const adapter = createMemoryAdapter()
    adapter.setItem('thoth.save.v1', JSON.stringify({ version: 1, savedAt: 'whenever', data: { n: 1 } }))
    expect(new PersistenceService<{ n: number }>(adapter).savedAt()).toBeNull()
  })

  it('does not disturb the save it is asking about', () => {
    const p = new PersistenceService<{ n: number }>(createMemoryAdapter())
    p.save({ n: 7 })
    p.savedAt()
    expect(p.load()).toEqual({ n: 7 })
  })
})
