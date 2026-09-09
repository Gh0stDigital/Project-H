import { describe, it, expect } from 'vitest'
import { buildRestNpcs, rollNpcGift, markSpoken, findNpc } from './restNpcs'
import { npcBalance } from '@/config/dungeonEvents'

/** Portraits a world pack would supply. */
const PORTRAITS = ['wanderer', 'merchant', 'scholar']
import { createSpell } from './spellFactory'

/** Deterministic rng cycling through fixed values. */
function seq(values: number[]): () => number {
  let i = 0
  return () => values[i++ % values.length]
}

function spellWith(korean: string, sentence: string, translation = '') {
  return createSpell({
    korean,
    english: korean,
    wordType: 'noun',
    sampleSentence: sentence,
    sampleTranslation: translation,
  })
}

describe('buildRestNpcs', () => {
  const spells = [
    spellWith('사과', '사과를 먹었어요.', 'I ate an apple.'),
    spellWith('물', '물을 마셔요.', 'I drink water.'),
  ]

  it('builds between the configured minimum and maximum', () => {
    for (const r of [0, 0.25, 0.5, 0.75, 0.99]) {
      const npcs = buildRestNpcs(spells, PORTRAITS, () => r)
      expect(npcs.length).toBeGreaterThanOrEqual(npcBalance.minCount)
      expect(npcs.length).toBeLessThanOrEqual(npcBalance.maxCount)
    }
  })

  it('speaks the player’s own sample sentences', () => {
    const npcs = buildRestNpcs(spells, PORTRAITS, seq([0.9, 0.1, 0.4, 0.2, 0.7, 0.3]))
    const sentences = spells.map((s) => s.sampleSentence)
    for (const npc of npcs) {
      expect(sentences).toContain(npc.line)
      expect(npc.spellId).not.toBeNull()
    }
  })

  it('carries the translation across with the sentence', () => {
    const npcs = buildRestNpcs([spells[0]], PORTRAITS, () => 0)
    expect(npcs[0].translation).toBe('I ate an apple.')
  })

  it('only draws on words that actually have an example', () => {
    const mixed = [spellWith('산', ''), spells[0]]
    const npcs = buildRestNpcs(mixed, PORTRAITS, seq([0.8, 0.2, 0.6, 0.4]))
    for (const npc of npcs) expect(npc.line).toBe(spells[0].sampleSentence)
  })

  it('still produces people when no word has an example', () => {
    // A fresh Compendium must not make the Rest Area look broken.
    const npcs = buildRestNpcs([spellWith('산', '')], PORTRAITS, () => 0.5)
    expect(npcs.length).toBeGreaterThanOrEqual(1)
    for (const npc of npcs) {
      expect(npc.spellId).toBeNull()
      expect(npc.line.length).toBeGreaterThan(0)
    }
  })

  it('handles an entirely empty Compendium', () => {
    const npcs = buildRestNpcs([], PORTRAITS, () => 0.5)
    expect(npcs.length).toBeGreaterThanOrEqual(1)
    expect(npcs.every((n) => n.line.length > 0)).toBe(true)
  })

  it('gives everyone a distinct id and starts them unspoken', () => {
    const npcs = buildRestNpcs(spells, PORTRAITS, seq([0.99, 0.1, 0.3, 0.5, 0.7, 0.2, 0.4, 0.8]))
    expect(new Set(npcs.map((n) => n.id)).size).toBe(npcs.length)
    expect(npcs.every((n) => !n.spoken)).toBe(true)
  })
})

describe('rollNpcGift', () => {
  it('always pays the conversation XP', () => {
    expect(rollNpcGift(() => 0.99).totemXp).toBe(npcBalance.totemXp)
    expect(rollNpcGift(() => 0).totemXp).toBe(npcBalance.totemXp)
  })

  it('gives nothing beyond XP when the roll is ungenerous', () => {
    const gift = rollNpcGift(() => 0.99)
    expect(gift.money).toBe(0)
    expect(gift.item).toBe(false)
  })

  it('keeps money inside the configured range when generous', () => {
    const gift = rollNpcGift(seq([0, 0.5, 0.99]))
    expect(gift.money).toBeGreaterThanOrEqual(npcBalance.minMoney)
    expect(gift.money).toBeLessThanOrEqual(npcBalance.maxMoney)
  })
})

describe('markSpoken', () => {
  const npcs = buildRestNpcs([spellWith('물', '물을 마셔요.')], PORTRAITS, () => 0.3)

  it('marks only the named person', () => {
    const after = markSpoken(npcs, npcs[0].id)
    expect(findNpc(after, npcs[0].id)?.spoken).toBe(true)
    for (const n of after.slice(1)) expect(n.spoken).toBe(false)
  })

  it('leaves the list alone for an unknown id', () => {
    expect(markSpoken(npcs, 'nope').every((n) => !n.spoken)).toBe(true)
  })
})
