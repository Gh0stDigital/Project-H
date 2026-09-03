import type { SpellSet } from '@/domain/spellSet'
import { makeId } from './idGen'

/** Spell Set management — pure reducer-style operations. Sets reference Spell IDs only. */

export function createSpellSet(sets: SpellSet[], name: string, spellIds: string[] = []): SpellSet[] {
  const now = new Date().toISOString()
  const set: SpellSet = {
    id: makeId('set'),
    name: name.trim() || 'Untitled Set',
    spellIds: [...new Set(spellIds)],
    createdAt: now,
    modifiedAt: now,
  }
  return [...sets, set]
}

export function renameSpellSet(sets: SpellSet[], id: string, name: string): SpellSet[] {
  return sets.map((s) => (s.id === id ? { ...s, name: name.trim() || s.name, modifiedAt: new Date().toISOString() } : s))
}

export function addSpellToSet(sets: SpellSet[], setId: string, spellId: string): SpellSet[] {
  return sets.map((s) => {
    if (s.id !== setId || s.spellIds.includes(spellId)) return s
    return { ...s, spellIds: [...s.spellIds, spellId], modifiedAt: new Date().toISOString() }
  })
}

export function removeSpellFromSet(sets: SpellSet[], setId: string, spellId: string): SpellSet[] {
  return sets.map((s) => {
    if (s.id !== setId) return s
    return { ...s, spellIds: s.spellIds.filter((id) => id !== spellId), modifiedAt: new Date().toISOString() }
  })
}

export function deleteSpellSet(sets: SpellSet[], id: string): SpellSet[] {
  return sets.filter((s) => s.id !== id)
}

/** Removes a Spell ID from every set — call when a Spell is deleted from the Compendium. */
export function pruneSpellFromAllSets(sets: SpellSet[], spellId: string): SpellSet[] {
  return sets.map((s) => ({
    ...s,
    spellIds: s.spellIds.filter((id) => id !== spellId),
    modifiedAt: s.spellIds.includes(spellId) ? new Date().toISOString() : s.modifiedAt,
  }))
}

export function getSpellSet(sets: SpellSet[], id: string): SpellSet | undefined {
  return sets.find((s) => s.id === id)
}
