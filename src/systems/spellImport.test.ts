import { describe, expect, it } from 'vitest'
import type { Spell } from '@/domain/spell'
import {
  IMPORT_TEMPLATE_CSV,
  IMPORT_TEMPLATE_SIMPLE_CSV,
  exportSpellsToCsv,
  importRowsToInputs,
  parseImportText,
  parseWordType,
} from './spellImport'
import { createSpell } from './spellFactory'

const NONE: Spell[] = []

describe('short two-column import (unchanged behaviour)', () => {
  it('still reads a bare korean,english list', () => {
    const result = parseImportText('안녕하세요, hello\n감사합니다, thank you', NONE)
    expect(result.ok).toHaveLength(2)
    expect(result.ok[0].korean).toBe('안녕하세요')
    expect(result.ok[0].english).toBe('hello')
    expect(result.headerColumns).toBeNull()
  })

  it('reads tab-separated paste and a notes column', () => {
    const result = parseImportText('사랑\tlove\ta noun', NONE)
    expect(result.ok).toHaveLength(1)
    expect(result.ok[0].input.notes).toBe('a noun')
  })

  it('skips blanks and comments, and reports missing fields', () => {
    const result = parseImportText('# a comment\n\n안녕하세요', NONE)
    expect(result.ok).toHaveLength(0)
    expect(result.errors).toHaveLength(1)
  })

  it('flags duplicates against the compendium and within the batch', () => {
    const existing = [createSpell({ korean: '학교', english: 'school' })]
    const result = parseImportText('학교, school\n물, water\n물, water', existing)
    expect(result.duplicates).toHaveLength(2)
    expect(result.ok).toHaveLength(1)
  })

  it('parses the simple template it offers', () => {
    const result = parseImportText(IMPORT_TEMPLATE_SIMPLE_CSV, NONE)
    expect(result.errors).toHaveLength(0)
    expect(result.ok.length).toBeGreaterThan(0)
  })
})

describe('structured import', () => {
  const csv = [
    'word,word type,definition 1,definition 2,definition 3,sample sentence,sample sentence translation,derived verb,present,past,future,notes',
    '전달하다,Action Verb,to deliver,to convey,to pass along,내용을 전달했어요.,I passed it along.,,전달해요,전달했어요,전달할 거예요,',
    '괜히,Adverb,for no reason,needlessly,unnecessarily,괜히 걱정했어요.,I worried for no reason.,,,,,',
    '검토,Noun,review,examination,consideration,,,검토하다,검토해요,검토했어요,검토할 거예요,',
  ].join('\n')

  it('maps a header row and fills every field', () => {
    const result = parseImportText(csv, NONE)
    expect(result.errors).toHaveLength(0)
    expect(result.ok).toHaveLength(3)

    const verb = result.ok[0].input
    expect(verb.wordType).toBe('action_verb')
    expect(verb.definition2).toBe('to convey')
    expect(verb.definition3).toBe('to pass along')
    expect(verb.sampleSentence).toBe('내용을 전달했어요.')
    expect(verb.sampleTranslation).toBe('I passed it along.')
    expect(verb.presentForm).toBe('전달해요')
    expect(verb.futureForm).toBe('전달할 거예요')
  })

  it('reads a noun with a derived verb and its conjugations', () => {
    const noun = parseImportText(csv, NONE).ok[2].input
    expect(noun.wordType).toBe('noun')
    expect(noun.derivedVerb).toBe('검토하다')
    expect(noun.presentForm).toBe('검토해요')
  })

  it('accepts columns in any order', () => {
    const reordered = ['definition 1,word,word type', 'hello,안녕하세요,Expression/Phrase'].join('\n')
    const row = parseImportText(reordered, NONE).ok[0]
    expect(row.korean).toBe('안녕하세요')
    expect(row.english).toBe('hello')
    expect(row.input.wordType).toBe('expression')
  })

  it('reads Element in a header but never imports it', () => {
    const withElement = ['word,element,definition 1,word type', '학교,Fire,school,Noun'].join('\n')
    const row = parseImportText(withElement, NONE).ok[0]
    // Element is derived from the type — a bogus column cannot override it.
    expect(row.input.wordType).toBe('noun')
    expect(Object.keys(row.input)).not.toContain('element')
  })

  it('warns rather than silently defaulting an unknown word type', () => {
    const bad = ['word,word type,definition 1', '학교,Wizard,school'].join('\n')
    const row = parseImportText(bad, NONE).ok[0]
    expect(row.status).toBe('ok')
    expect(row.message).toMatch(/unknown word type/i)
    expect(row.input.wordType).toBeUndefined()
  })

  it('parses every word-type spelling it advertises', () => {
    expect(parseWordType('Action Verb')).toBe('action_verb')
    expect(parseWordType('descriptive verb / adjective')).toBe('descriptive_verb')
    expect(parseWordType('Adjective')).toBe('descriptive_verb')
    expect(parseWordType('Expression/Phrase')).toBe('expression')
    expect(parseWordType('Grammar / Particle')).toBe('grammar')
    expect(parseWordType('  Adverb ')).toBe('adverb')
    expect(parseWordType('wizard')).toBeNull()
    expect(parseWordType('')).toBeNull()
  })

  it('parses the full template it offers for download', () => {
    const result = parseImportText(IMPORT_TEMPLATE_CSV, NONE)
    expect(result.errors).toHaveLength(0)
    expect(result.ok).toHaveLength(4)
    expect(result.ok.map((r) => r.input.wordType)).toEqual(['action_verb', 'adverb', 'noun', 'expression'])
  })

  it('turns rows straight into creatable inputs', () => {
    const inputs = importRowsToInputs(parseImportText(csv, NONE).ok)
    const spells = inputs.map(createSpell)
    expect(spells[0].presentForm).toBe('전달해요')
    // The adverb's conjugation columns were empty and stay empty.
    expect(spells[1].presentForm).toBe('')
  })
})

describe('export', () => {
  const spells = [
    createSpell({
      korean: '전달하다',
      english: 'to deliver',
      definition2: 'to convey',
      wordType: 'action_verb',
      presentForm: '전달해요',
      pastForm: '전달했어요',
      futureForm: '전달할 거예요',
    }),
    createSpell({ korean: '검토', english: 'review', wordType: 'noun', derivedVerb: '검토하다', presentForm: '검토해요' }),
  ]

  it('writes a header and one row per entry, including the derived element', () => {
    const csv = exportSpellsToCsv(spells)
    const lines = csv.split('\n')
    expect(lines).toHaveLength(3)
    expect(lines[0]).toContain('element')
    expect(lines[1]).toContain('Fire')
    expect(lines[2]).toContain('Earth')
  })

  it('round-trips back through the importer', () => {
    const csv = exportSpellsToCsv(spells)
    const result = parseImportText(csv, NONE)
    expect(result.errors).toHaveLength(0)
    expect(result.ok).toHaveLength(2)
    expect(result.ok[0].input.wordType).toBe('action_verb')
    expect(result.ok[0].input.definition2).toBe('to convey')
    expect(result.ok[1].input.derivedVerb).toBe('검토하다')
    expect(result.ok[1].input.presentForm).toBe('검토해요')
  })

  it('quotes cells containing the delimiter', () => {
    const tricky = [createSpell({ korean: '음', english: 'well, um', wordType: 'expression' })]
    const csv = exportSpellsToCsv(tricky)
    expect(csv).toContain('"well, um"')
  })
})
