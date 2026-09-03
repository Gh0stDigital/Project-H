import { describe, expect, it } from 'vitest'
import {
  allWordTypes,
  elementDefFor,
  elementFor,
  futureLabelFor,
  isWordType,
  showsConjugations,
  wordTypeDefs,
  type WordType,
} from './wordTypes'

describe('automatic element assignment', () => {
  // The mapping the feature is specified against, verbatim.
  const expected: [WordType, string][] = [
    ['noun', 'earth'],
    ['action_verb', 'fire'],
    ['descriptive_verb', 'water'],
    ['adverb', 'wind'],
    ['expression', 'lightning'],
    ['grammar', 'metal'],
  ]

  it.each(expected)('maps %s to %s', (type, element) => {
    expect(elementFor(type)).toBe(element)
  })

  it('covers every word type exactly once', () => {
    expect(allWordTypes).toHaveLength(expected.length)
    expect(new Set(allWordTypes.map((t) => t.id)).size).toBe(expected.length)
  })

  it('gives every element a distinct icon and label', () => {
    const labels = allWordTypes.map((t) => elementDefFor(t.id).label)
    expect(new Set(labels).size).toBe(allWordTypes.length)
  })

  it('recognises only real word types', () => {
    expect(isWordType('noun')).toBe(true)
    expect(isWordType('verb')).toBe(false)
    expect(isWordType('')).toBe(false)
    expect(isWordType(undefined)).toBe(false)
  })
})

describe('conditional conjugation fields', () => {
  it('shows forms for verbs and adjectives with no derived verb', () => {
    expect(showsConjugations('action_verb', '')).toBe(true)
    expect(showsConjugations('descriptive_verb', '')).toBe(true)
  })

  it('hides forms for nouns, adverbs, expressions and grammar by default', () => {
    expect(showsConjugations('noun', '')).toBe(false)
    expect(showsConjugations('adverb', '')).toBe(false)
    expect(showsConjugations('expression', '')).toBe(false)
    expect(showsConjugations('grammar', '')).toBe(false)
  })

  it('shows forms for a noun once a derived 하다 verb is given', () => {
    expect(showsConjugations('noun', '검토하다')).toBe(true)
  })

  it('ignores a whitespace-only derived verb', () => {
    expect(showsConjugations('noun', '   ')).toBe(false)
  })

  it('does not offer a derived verb for types that cannot take one', () => {
    expect(wordTypeDefs.adverb.allowsDerivedVerb).toBe(false)
    expect(wordTypeDefs.grammar.allowsDerivedVerb).toBe(false)
    expect(showsConjugations('adverb', '괜히하다')).toBe(false)
  })
})

describe('future field labelling', () => {
  it('uses intention for action verbs and prediction for descriptive verbs', () => {
    expect(futureLabelFor('action_verb', '')).toBe('Future/Intention')
    expect(futureLabelFor('descriptive_verb', '')).toBe('Future/Prediction')
  })

  it("treats a noun's derived 하다 verb as an action verb", () => {
    expect(futureLabelFor('noun', '검토하다')).toBe('Future/Intention')
  })
})
