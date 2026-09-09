/**
 * Batch Spell Word import/export — pure text parsing, no React/state.
 *
 * Accepts loosely-formatted text (pasted from Notes, a spreadsheet export,
 * or a plain .txt/.csv file) and turns it into a per-line report the UI can
 * preview before committing anything.
 *
 * The short form is still the quickest way in:
 *
 *   korean, english
 *   korean, english, notes
 *
 * A header row unlocks the full structured form, in any column order:
 *
 *   word, word type, definition 1, definition 2, definition 3,
 *   sample sentence, sample translation, derived verb,
 *   present, past, future, notes
 *
 * Element is never imported — it is derived from Word Type (see
 * config/wordTypes.ts), so an Element column in a re-imported export is
 * read and discarded rather than trusted.
 *
 * The delimiter is auto-detected per line (tab, pipe, " - ", or comma) so a
 * straight paste from a spreadsheet (tab-separated) works exactly the same
 * as a hand-typed comma list. Blank lines are ignored and lines starting
 * with # are treated as comments.
 */

import type { Spell } from '@/domain/spell'
import { definitionsOf } from '@/domain/spell'
import {
  allWordTypes,
  elementDefFor,
  showsConjugations,
  type WordType,
} from '@/config/wordTypes'
import { validateNewSpell, type NewSpellInput } from './spellFactory'

export type ImportRowStatus = 'ok' | 'error' | 'duplicate'

export interface ImportRow {
  line: number
  raw: string
  korean: string
  english: string
  notes: string
  /** Everything parsed for this row, ready to create a Spell from. */
  input: NewSpellInput
  status: ImportRowStatus
  message?: string
}

export interface ImportResult {
  rows: ImportRow[]
  ok: ImportRow[]
  errors: ImportRow[]
  duplicates: ImportRow[]
  /** Which columns a header row mapped, for the preview to report. */
  headerColumns: string[] | null
}

// Tried in order; the first delimiter that splits a line into 2+ fields wins.
// Tab first since that's what pasting a spreadsheet selection produces.
const DELIMITERS: (string | RegExp)[] = ['\t', '|', /\s+-\s+/, ',']

/** Canonical column keys the parser understands. */
type ColumnKey =
  | 'korean'
  | 'wordType'
  | 'english'
  | 'definition2'
  | 'definition3'
  | 'sampleSentence'
  | 'sampleTranslation'
  | 'derivedVerb'
  | 'presentForm'
  | 'pastForm'
  | 'futureForm'
  | 'notes'
  | 'ignore'

/** Header spellings accepted for each column, all lowercased. */
const COLUMN_ALIASES: Record<string, ColumnKey> = {
  korean: 'korean',
  kor: 'korean',
  word: 'korean',
  term: 'korean',
  headword: 'korean',

  'word type': 'wordType',
  wordtype: 'wordType',
  type: 'wordType',
  'part of speech': 'wordType',

  english: 'english',
  eng: 'english',
  meaning: 'english',
  definition: 'english',
  'definition 1': 'english',
  definition1: 'english',
  def1: 'english',

  'definition 2': 'definition2',
  definition2: 'definition2',
  def2: 'definition2',
  'definition 3': 'definition3',
  definition3: 'definition3',
  def3: 'definition3',

  'sample sentence': 'sampleSentence',
  sample: 'sampleSentence',
  sentence: 'sampleSentence',
  example: 'sampleSentence',
  'sample sentence translation': 'sampleTranslation',
  'sample translation': 'sampleTranslation',
  translation: 'sampleTranslation',

  'derived verb': 'derivedVerb',
  derivedverb: 'derivedVerb',
  'hada verb': 'derivedVerb',

  present: 'presentForm',
  'present form': 'presentForm',
  past: 'pastForm',
  'past form': 'pastForm',
  future: 'futureForm',
  'future form': 'futureForm',
  'future/intention': 'futureForm',
  'future/prediction': 'futureForm',

  notes: 'notes',
  note: 'notes',

  // Derived, never imported — accepted in a header so a round-tripped
  // export parses cleanly, then discarded.
  element: 'ignore',
}

/**
 * Word-type spellings accepted in the Word Type column.
 *
 * Three families, all still accepted: the stable ids (what export writes),
 * the English names (what older exports wrote, and what a file written
 * before the interface was translated contains), and the Korean names now
 * shown in the app. Dropping any of them would strand files people already
 * have, which is why export moved to ids rather than following the display
 * language around.
 */
const WORD_TYPE_ALIASES: Record<string, WordType> = {
  noun: 'noun',
  // Korean names, as displayed in the app.
  '명사': 'noun',
  '동사': 'action_verb',
  '형용사': 'descriptive_verb',
  '부사': 'adverb',
  '표현': 'expression',
  '표현 / 관용구': 'expression',
  '표현/관용구': 'expression',
  '관용구': 'expression',
  '문법': 'grammar',
  '문법 / 조사': 'grammar',
  '문법/조사': 'grammar',
  '조사': 'grammar',
  n: 'noun',
  'action verb': 'action_verb',
  action_verb: 'action_verb',
  action: 'action_verb',
  verb: 'action_verb',
  v: 'action_verb',
  'descriptive verb': 'descriptive_verb',
  'descriptive verb/adjective': 'descriptive_verb',
  'descriptive verb / adjective': 'descriptive_verb',
  descriptive_verb: 'descriptive_verb',
  descriptive: 'descriptive_verb',
  adjective: 'descriptive_verb',
  adj: 'descriptive_verb',
  adverb: 'adverb',
  adv: 'adverb',
  expression: 'expression',
  'expression/phrase': 'expression',
  'expression / phrase': 'expression',
  phrase: 'expression',
  grammar: 'grammar',
  'grammar/particle': 'grammar',
  'grammar / particle': 'grammar',
  particle: 'grammar',
}

export function parseWordType(value: string): WordType | null {
  const key = value.trim().toLowerCase()
  if (!key) return null
  return WORD_TYPE_ALIASES[key] ?? null
}

function splitFields(line: string): string[] {
  for (const delimiter of DELIMITERS) {
    const parts = line.split(delimiter)
    if (parts.length >= 2) return parts.map((p) => p.trim())
  }
  return [line.trim()]
}

/**
 * Reads a header row into a column map. Returns null when the row isn't a
 * header, in which case the short positional form applies.
 */
function parseHeader(fields: string[]): ColumnKey[] | null {
  if (fields.length < 2) return null
  const mapped = fields.map((f) => COLUMN_ALIASES[f.trim().toLowerCase()])
  // A header must name the headword column and at least one definition;
  // anything less is data, not a header.
  if (!mapped.includes('korean')) return null
  if (!mapped.includes('english')) return null
  return mapped.map((m) => m ?? 'ignore')
}

/**
 * Parses raw import text into a row-by-row report. `existingSpells` is used
 * only to flag duplicates (by exact Korean word match, case-insensitive) —
 * nothing is created here, this is preview-only.
 */
export function parseImportText(text: string, existingSpells: Spell[]): ImportResult {
  const existingKorean = new Set(existingSpells.map((s) => s.korean.trim().toLowerCase()))
  const seenInBatch = new Set<string>()
  const rows: ImportRow[] = []

  const lines = text.split(/\r?\n/)
  let columns: ColumnKey[] | null = null
  let headerSeen = false

  lines.forEach((rawLine, idx) => {
    const line = rawLine.trim()
    const lineNumber = idx + 1
    if (!line || line.startsWith('#')) return

    const fields = splitFields(line)

    // Only the first non-comment row may be a header.
    if (!headerSeen) {
      headerSeen = true
      const parsed = parseHeader(fields)
      if (parsed) {
        columns = parsed
        return
      }
    }

    const get = (key: ColumnKey): string => {
      if (!columns) return ''
      const i = columns.indexOf(key)
      return i >= 0 ? (fields[i] ?? '') : ''
    }

    // Structured (header-mapped) or short positional form.
    const korean = columns ? get('korean') : (fields[0] ?? '')
    const english = columns ? get('english') : (fields[1] ?? '')
    const notes = columns ? get('notes') : (fields[2] ?? '')

    const rawType = columns ? get('wordType') : ''
    const wordType = parseWordType(rawType)
    const derivedVerb = columns ? get('derivedVerb') : ''

    const input: NewSpellInput = {
      korean,
      english,
      notes,
      ...(wordType ? { wordType } : {}),
      definition2: columns ? get('definition2') : '',
      definition3: columns ? get('definition3') : '',
      sampleSentence: columns ? get('sampleSentence') : '',
      sampleTranslation: columns ? get('sampleTranslation') : '',
      derivedVerb,
      presentForm: columns ? get('presentForm') : '',
      pastForm: columns ? get('pastForm') : '',
      futureForm: columns ? get('futureForm') : '',
    }

    const base = { line: lineNumber, raw: line, korean, english, notes, input }
    const validation = validateNewSpell({ korean, english })

    if (validation.length > 0) {
      const missing = validation.map((e) => (e.field === 'english' ? '뜻' : '단어')).join(', ')
      rows.push({
        ...base,
        status: 'error',
        message: fields.length < 2 ? '열을 두 개 찾지 못했습니다 — 구분자를 확인하세요.' : `${missing}이(가) 비어 있습니다.`,
      })
      return
    }

    // An unrecognised word type is worth saying out loud rather than
    // silently defaulting, since it decides the entry's Element.
    let message: string | undefined
    if (rawType.trim() && !wordType) {
      message = `알 수 없는 품사 "${rawType}" — 기본값으로 넣습니다. 가져온 뒤 고치세요.`
    }

    const key = korean.toLowerCase()
    if (existingKorean.has(key) || seenInBatch.has(key)) {
      rows.push({ ...base, status: 'duplicate', message: '이미 도감에 있습니다 — 건너뜁니다.' })
      return
    }

    seenInBatch.add(key)
    rows.push({ ...base, status: 'ok', message })
  })

  return {
    rows,
    ok: rows.filter((r) => r.status === 'ok'),
    errors: rows.filter((r) => r.status === 'error'),
    duplicates: rows.filter((r) => r.status === 'duplicate'),
    headerColumns: columns,
  }
}

export function importRowsToInputs(rows: ImportRow[]): NewSpellInput[] {
  return rows.map((r) => r.input)
}

// ---------------------------------------------------------------------------
// Export
// ---------------------------------------------------------------------------

const EXPORT_HEADER = [
  'word',
  'word type',
  'element',
  'definition 1',
  'definition 2',
  'definition 3',
  'sample sentence',
  'sample sentence translation',
  'derived verb',
  'present',
  'past',
  'future',
  'notes',
]

/** Quotes a CSV cell only when it needs it. */
function csvCell(value: string): string {
  const v = value ?? ''
  return /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v
}

/**
 * The player's whole Compendium as CSV, in the same shape the importer
 * reads back. Element is written for the reader's benefit and ignored on
 * re-import, since it is always derived from Word Type.
 */
export function exportSpellsToCsv(spells: Spell[]): string {
  const rows = spells.map((s) => {
    const forms = showsConjugations(s.wordType, s.derivedVerb)
    return [
      s.korean,
      // Ids, not display labels — a file exported in one language has to
      // import in another, and labels move when the app is translated.
      s.wordType,
      elementDefFor(s.wordType).id,
      s.english,
      s.definition2,
      s.definition3,
      s.sampleSentence,
      s.sampleTranslation,
      s.derivedVerb,
      forms ? s.presentForm : '',
      forms ? s.pastForm : '',
      forms ? s.futureForm : '',
      s.notes,
    ].map(csvCell)
  })
  return [EXPORT_HEADER.join(','), ...rows.map((r) => r.join(','))].join('\n')
}

/** One-line summary of an entry's meanings, for compact previews. */
export function definitionSummary(spell: Spell): string {
  return definitionsOf(spell).join(', ')
}

/**
 * A downloadable example file in the exact format parseImportText()
 * expects — a header row plus filled-in sample rows covering a verb, an
 * adverb and a noun with a derived 하다 verb. CSV so it opens straight
 * into Excel/Sheets/Numbers, but it's just plain text.
 */
export const IMPORT_TEMPLATE_CSV = [
  EXPORT_HEADER.join(','),
  '전달하다,동사,,to deliver,to convey,to pass along,내용을 담당자에게 전달했어요.,I passed the information along to the person in charge.,,전달해요,전달했어요,전달할 거예요,',
  '괜히,부사,,for no reason,needlessly,unnecessarily,괜히 걱정했어요.,I worried for no reason.,,,,,',
  '검토,명사,,review,examination,consideration,,,검토하다,검토해요,검토했어요,검토할 거예요,',
  '안녕하세요,표현/관용구,,hello,,,,,,,,,common greeting',
].join('\n')

/** The short two-column form, for players who just want a quick list. */
export const IMPORT_TEMPLATE_SIMPLE_CSV = [
  'word,definition 1,notes',
  '안녕하세요,hello,common greeting',
  '감사합니다,thank you,polite form',
  '사랑,love,',
].join('\n')

export { allWordTypes }
