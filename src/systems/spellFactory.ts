import type { Spell } from '@/domain/spell'
import { spellBalance } from '@/config/balance'
import { showsConjugations, type WordType } from '@/config/wordTypes'
import { makeId } from './idGen'

/**
 * Content fields shared by creation and editing. Every optional field
 * defaults to empty rather than undefined, so a Spell is always fully
 * shaped and no consumer has to guard for missing properties.
 */
export interface SpellContentInput {
  korean: string
  /** Definition 1 — required. */
  english: string
  definition2?: string
  definition3?: string
  notes?: string
  wordType?: WordType
  sampleSentence?: string
  sampleTranslation?: string
  derivedVerb?: string
  presentForm?: string
  pastForm?: string
  futureForm?: string
  altKorean?: string[]
  altEnglish?: string[]
}

export type NewSpellInput = SpellContentInput

export type SpellField = 'korean' | 'english'

export interface SpellValidationError {
  field: SpellField
  message: string
}

/**
 * Basic empty-field validation. No semantic or dictionary validation — the
 * prototype never judges whether a definition is *right*, only that the
 * required ones are present.
 */
export function validateNewSpell(input: SpellContentInput): SpellValidationError[] {
  const errors: SpellValidationError[] = []
  if (!input.korean.trim()) errors.push({ field: 'korean', message: 'Korean word is required.' })
  if (!input.english.trim()) errors.push({ field: 'english', message: 'Definition 1 is required.' })
  return errors
}

const clean = (v: string | undefined): string => (v ?? '').trim()

/** Default type for an entry created without one specified. */
export const DEFAULT_WORD_TYPE: WordType = 'noun'

/**
 * Normalises the content half of a Spell.
 *
 * Conjugations are dropped when the word type (plus derived-verb state)
 * says they don't apply, so switching a verb to a noun can't leave orphan
 * forms behind to resurface later.
 */
export function normalizeContent(input: SpellContentInput): {
  korean: string
  english: string
  definition2: string
  definition3: string
  notes: string
  wordType: WordType
  sampleSentence: string
  sampleTranslation: string
  derivedVerb: string
  presentForm: string
  pastForm: string
  futureForm: string
  altKorean: string[]
  altEnglish: string[]
} {
  const wordType = input.wordType ?? DEFAULT_WORD_TYPE
  const derivedVerb = clean(input.derivedVerb)
  const keepForms = showsConjugations(wordType, derivedVerb)
  return {
    korean: clean(input.korean),
    english: clean(input.english),
    definition2: clean(input.definition2),
    definition3: clean(input.definition3),
    notes: clean(input.notes),
    wordType,
    sampleSentence: clean(input.sampleSentence),
    sampleTranslation: clean(input.sampleTranslation),
    derivedVerb,
    presentForm: keepForms ? clean(input.presentForm) : '',
    pastForm: keepForms ? clean(input.pastForm) : '',
    futureForm: keepForms ? clean(input.futureForm) : '',
    altKorean: (input.altKorean ?? []).map((s) => s.trim()).filter(Boolean),
    altEnglish: (input.altEnglish ?? []).map((s) => s.trim()).filter(Boolean),
  }
}

export function createSpell(input: NewSpellInput): Spell {
  const now = new Date().toISOString()
  const level = 1
  return {
    id: makeId('spell'),
    ...normalizeContent(input),
    level,
    experience: 0,
    charge: 0,
    maxCharge: spellBalance.maxCharge(level),
    timesEncountered: 0,
    correctAnswers: 0,
    incorrectAnswers: 0,
    correctAttacks: 0,
    failedAttacks: 0,
    successfulDefenses: 0,
    failedDefenses: 0,
    timesEquipped: 0,
    createdAt: now,
    lastPracticedAt: null,
  }
}
