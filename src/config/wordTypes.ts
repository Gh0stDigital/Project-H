/**
 * Word types and their elements.
 *
 * A vocabulary entry's Element is *derived* from its Word Type rather than
 * stored alongside it. Two copies of the same fact drift apart the moment
 * one is written without the other, and the Element is never edited by
 * hand — so `elementFor()` is the single source of truth everywhere it is
 * displayed, exported or styled.
 */

export type WordType =
  | 'noun'
  | 'action_verb'
  | 'descriptive_verb'
  | 'adverb'
  | 'expression'
  | 'grammar'

export type Element = 'earth' | 'fire' | 'water' | 'wind' | 'lightning' | 'metal'

export interface WordTypeDef {
  id: WordType
  label: string
  /** Short form for chips and dense lists. */
  shortLabel: string
  element: Element
  /** True when this type conjugates on its own (verbs and adjectives). */
  conjugates: boolean
  /**
   * True when this type may carry a related 하다 verb (검토 → 검토하다),
   * which unlocks conjugation fields for the derived verb.
   */
  allowsDerivedVerb: boolean
  /** Label for the future field — intention for actions, prediction for states. */
  futureLabel: string
  hint: string
}

export interface ElementDef {
  id: Element
  label: string
  icon: string
  /** CSS custom-property name holding this element's accent colour. */
  colorVar: string
}

export const elementDefs: Record<Element, ElementDef> = {
  earth: { id: 'earth', label: 'Earth', icon: '🪨', colorVar: '--element-earth' },
  fire: { id: 'fire', label: 'Fire', icon: '🔥', colorVar: '--element-fire' },
  water: { id: 'water', label: 'Water', icon: '💧', colorVar: '--element-water' },
  wind: { id: 'wind', label: 'Wind', icon: '🌬️', colorVar: '--element-wind' },
  lightning: { id: 'lightning', label: 'Lightning', icon: '⚡', colorVar: '--element-lightning' },
  metal: { id: 'metal', label: 'Metal', icon: '⚙️', colorVar: '--element-metal' },
}

export const wordTypeDefs: Record<WordType, WordTypeDef> = {
  noun: {
    id: 'noun',
    label: 'Noun',
    shortLabel: 'Noun',
    element: 'earth',
    conjugates: false,
    allowsDerivedVerb: true,
    futureLabel: 'Future/Intention',
    hint: 'A thing, person, place or concept — 검토, 학교, 사랑.',
  },
  action_verb: {
    id: 'action_verb',
    label: 'Action Verb',
    shortLabel: 'Action',
    element: 'fire',
    conjugates: true,
    allowsDerivedVerb: false,
    futureLabel: 'Future/Intention',
    hint: 'Something done — 전달하다, 먹다, 가다.',
  },
  descriptive_verb: {
    id: 'descriptive_verb',
    label: 'Descriptive Verb / Adjective',
    shortLabel: 'Descriptive',
    element: 'water',
    conjugates: true,
    allowsDerivedVerb: false,
    futureLabel: 'Future/Prediction',
    hint: 'A state or quality — 좋다, 예쁘다, 바쁘다.',
  },
  adverb: {
    id: 'adverb',
    label: 'Adverb',
    shortLabel: 'Adverb',
    element: 'wind',
    conjugates: false,
    allowsDerivedVerb: false,
    futureLabel: 'Future',
    hint: 'How, when or how much — 괜히, 빨리, 자주.',
  },
  expression: {
    id: 'expression',
    label: 'Expression / Phrase',
    shortLabel: 'Phrase',
    element: 'lightning',
    conjugates: false,
    allowsDerivedVerb: true,
    futureLabel: 'Future',
    hint: 'A set phrase — 안녕하세요, 잘 부탁드립니다.',
  },
  grammar: {
    id: 'grammar',
    label: 'Grammar / Particle',
    shortLabel: 'Grammar',
    element: 'metal',
    conjugates: false,
    allowsDerivedVerb: false,
    futureLabel: 'Future',
    hint: 'A particle or pattern — 은/는, -고 싶다.',
  },
}

/** Ordered list for pickers — matches the order the types were specified in. */
export const allWordTypes: WordTypeDef[] = [
  wordTypeDefs.noun,
  wordTypeDefs.action_verb,
  wordTypeDefs.descriptive_verb,
  wordTypeDefs.adverb,
  wordTypeDefs.expression,
  wordTypeDefs.grammar,
]

/** The one place a Word Type becomes an Element. */
export function elementFor(wordType: WordType): Element {
  return wordTypeDefs[wordType].element
}

export function elementDefFor(wordType: WordType): ElementDef {
  return elementDefs[elementFor(wordType)]
}

export function isWordType(value: unknown): value is WordType {
  return typeof value === 'string' && value in wordTypeDefs
}

/**
 * Whether the Present/Past/Future fields apply.
 *
 * Verbs and adjectives always conjugate. A noun or phrase only does so once
 * a 하다 verb has been named for it — the conjugations then describe that
 * derived verb, not the headword.
 */
export function showsConjugations(wordType: WordType, derivedVerb: string): boolean {
  const def = wordTypeDefs[wordType]
  if (def.conjugates) return true
  return def.allowsDerivedVerb && derivedVerb.trim().length > 0
}

/**
 * The future field's label. A derived 하다 verb is an action verb, so it
 * takes the intention wording regardless of the headword's type.
 */
export function futureLabelFor(wordType: WordType, derivedVerb: string): string {
  const def = wordTypeDefs[wordType]
  if (!def.conjugates && derivedVerb.trim().length > 0) return 'Future/Intention'
  return def.futureLabel
}
