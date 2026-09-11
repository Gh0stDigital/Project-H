import { describe, it, expect } from 'vitest'
import { rollEvent, type EventRollContext } from './eventGenerator'

const base: EventRollContext = {
  history: [],
  modifiers: [],
  bossDoorFound: false,
  keyRoomSeen: true, // the Key Room is already out of the way
  keyRoomUnlocked: false,
  keyRoomPressure: 0,
  bossDoorPressure: 0,
}

/** Counts what 2000 rolls of one fixed situation actually produce. */
function distribution(ctx: EventRollContext): Record<string, number> {
  const counts: Record<string, number> = {}
  let seed = 12345
  const rng = () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296
    return seed / 4294967296
  }
  for (let i = 0; i < 2000; i++) {
    const type = rollEvent(ctx, rng).type
    counts[type] = (counts[type] ?? 0) + 1
  }
  return counts
}

describe('finding the Boss Door', () => {
  it('is rare while the dungeon still has words to teach', () => {
    const rare = distribution(base).boss_door ?? 0
    expect(rare / 2000).toBeLessThan(0.1)
  })

  it('becomes the likeliest event once every word has been seen', () => {
    // The complaint this fixes: a run could reach the end of its vocabulary
    // and still not turn up the one door it needs to finish.
    const counts = distribution({ ...base, keyRoomUnlocked: true })
    const boss = counts.boss_door ?? 0
    const others = Object.entries(counts).filter(([t]) => t !== 'boss_door')
    expect(boss).toBeGreaterThan(Math.max(...others.map(([, n]) => n)))
  })

  it('climbs each Move it fails to appear, and stops once it has', () => {
    const unlocked = { ...base, keyRoomUnlocked: true }
    // A low roll lands on the first entry in the weight table, which is not
    // the Boss Door however heavy the door has become.
    const miss = rollEvent({ ...unlocked, bossDoorPressure: 0 }, () => 0.0001)
    expect(miss.type).not.toBe('boss_door')
    expect(miss.nextBossDoorPressure).toBeGreaterThan(0)

    // Found: nothing left to apply pressure towards.
    const found = rollEvent({ ...unlocked, bossDoorFound: true, bossDoorPressure: 24 }, () => 0.5)
    expect(found.nextBossDoorPressure).toBe(24)
  })

  it('never offers a second door once one is found', () => {
    const counts = distribution({ ...base, keyRoomUnlocked: true, bossDoorFound: true })
    expect(counts.boss_door).toBeUndefined()
  })

  it('stays capped so the rest of the dungeon does not vanish', () => {
    const counts = distribution({ ...base, keyRoomUnlocked: true, bossDoorPressure: 10_000 })
    const others = Object.entries(counts).filter(([t]) => t !== 'boss_door')
    expect(others.length).toBeGreaterThan(0)
  })
})
