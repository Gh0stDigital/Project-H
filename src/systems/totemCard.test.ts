import { describe, it, expect } from 'vitest'
import { MAX_STARS, totemCard } from './totemCard'
import { createTotem } from './totemManager'
import { createSpell } from './spellFactory'
import { elementFor } from '@/config/wordTypes'
import type { SpellSet } from '@/domain/spellSet'

function deck(id: string, spellIds: string[]): SpellSet {
  const now = new Date().toISOString()
  return { id, name: 'deck', spellIds, createdAt: now, modifiedAt: now }
}

const noun = (korean: string, english: string) => createSpell({ korean, english, wordType: 'noun' })
const actionVerb = (korean: string, english: string) => createSpell({ korean, english, wordType: 'action_verb' })

describe('a Totem as a card', () => {
  it('reads its numbers off the equipped deck', () => {
    const spells = [noun('물', 'water'), noun('불', 'fire')]
    const sets = [deck('s1', spells.map((s) => s.id))]
    const totem = { ...createTotem('돌배', 'Dolbae'), equippedSpellSetId: 's1' }
    const card = totemCard(totem, spells, sets)
    expect(card.deckSize).toBe(2)
    expect(card.attack).toBeGreaterThan(0)
    expect(card.defense).toBe(totem.maxHp)
  })

  it('has no attribute and no attack with nothing equipped', () => {
    const card = totemCard(createTotem('돌배', 'Dolbae'), [], [])
    expect(card.element).toBeNull()
    expect(card.attack).toBe(0)
    expect(card.deckSize).toBe(0)
  })

  it('takes its attribute from the element its words lean towards', () => {
    const spells = [noun('물', 'water'), noun('불', 'fire'), actionVerb('가다', 'to go')]
    const sets = [deck('s1', spells.map((s) => s.id))]
    const totem = { ...createTotem('돌배', 'Dolbae'), equippedSpellSetId: 's1' }
    // Two nouns against one verb.
    expect(totemCard(totem, spells, sets).element).toBe(elementFor('noun'))
  })

  it('carries the portrait lore, and what the player wrote over it', () => {
    const totem = createTotem('돌배', 'Dolbae')
    const fromLore = totemCard(totem, [], [])
    expect(fromLore.description.length).toBeGreaterThan(0)
    expect(fromLore.kind).not.toContain('미기록')

    const written = totemCard({ ...totem, description: '내가 쓴 이야기' }, [], [])
    expect(written.description).toBe('내가 쓴 이야기')
  })

  it('describes the portrait actually shown, not the key asked for', () => {
    // Saves name `default`, which is no longer a file — the words on the
    // card have to belong to the face on it.
    expect(totemCard(createTotem('토템', 'default'), [], []).kind).not.toContain('미기록')
  })

  it('stops adding stars once the row is full', () => {
    const card = totemCard({ ...createTotem('돌배', 'Dolbae'), level: 40 }, [], [])
    expect(card.stars).toBe(MAX_STARS)
    expect(card.level).toBe(40)
  })
})
