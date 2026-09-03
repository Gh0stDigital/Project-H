import type { Spell } from '@/domain/spell'
import { spellAccuracy } from '@/domain/spell'
import type { SpellSet } from '@/domain/spellSet'

export type RecordsSortKey =
  | 'level'
  | 'charge'
  | 'accuracy'
  | 'mostPracticed'
  | 'mostMissed'
  | 'recentlyPracticed'
  | 'alphabetical'

export function sortSpells(spells: Spell[], key: RecordsSortKey): Spell[] {
  const arr = [...spells]
  switch (key) {
    case 'level':
      return arr.sort((a, b) => b.level - a.level || b.experience - a.experience)
    case 'charge':
      return arr.sort((a, b) => b.charge / Math.max(1, b.maxCharge) - a.charge / Math.max(1, a.maxCharge))
    case 'accuracy':
      return arr.sort((a, b) => spellAccuracy(b) - spellAccuracy(a))
    case 'mostPracticed':
      return arr.sort((a, b) => b.timesEncountered - a.timesEncountered)
    case 'mostMissed':
      return arr.sort((a, b) => b.incorrectAnswers - a.incorrectAnswers)
    case 'recentlyPracticed':
      return arr.sort((a, b) => (b.lastPracticedAt ?? '').localeCompare(a.lastPracticedAt ?? ''))
    case 'alphabetical':
    default:
      return arr.sort((a, b) => a.korean.localeCompare(b.korean))
  }
}

export function filterSpellsBySet(spells: Spell[], set: SpellSet | null): Spell[] {
  if (!set) return spells
  const idSet = new Set(set.spellIds)
  return spells.filter((s) => idSet.has(s.id))
}
