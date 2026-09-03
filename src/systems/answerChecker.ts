/**
 * Vocabulary answer checking.
 *
 * The prototype never judges semantic correctness — it only compares the
 * player's input against their own saved answer(s), with light
 * normalization. A loose paraphrase is never silently accepted: only the
 * stored definitions and explicit alternatives count. Nothing here rewrites
 * saved vocabulary.
 */

export type AnswerKind = 'korean' | 'english'

/**
 * Punctuation ignored on both sides of a comparison. Deliberately limited
 * to sentence punctuation and quotes — nothing that could alter a Hangul
 * syllable or an English word's letters.
 */
const PUNCTUATION = /[.,!?;:"“”'’`()[\]{}…]/g

/**
 * A leading "to" on an English verb. Korean dictionary forms translate
 * either way ("to deliver" / "deliver"), so the particle is optional in
 * both the stored answer and the submission. Only a standalone leading
 * word is stripped, so "tomato" and "together" are untouched.
 */
const LEADING_TO = /^to\s+/

/** Ignore surrounding whitespace, repeated spaces, punctuation, and (for English) case. */
export function normalize(text: string, kind: AnswerKind): string {
  let t = text.replace(PUNCTUATION, ' ')
  if (kind === 'english') t = t.toLowerCase()
  return t.trim().replace(/\s+/g, ' ')
}

/**
 * Normalized form with a leading "to" removed. English only — a Korean
 * answer is never altered this way.
 */
function withoutLeadingTo(text: string, kind: AnswerKind): string {
  const normalized = normalize(text, kind)
  return kind === 'english' ? normalized.replace(LEADING_TO, '') : normalized
}

/**
 * Whitespace-insensitive form, used when the answer was assembled from
 * tiles: syllable/letter tiles carry no spaces, so "안녕히 가세요" is built
 * as "안녕히가세요" and must still count as correct.
 */
function collapse(text: string, kind: AnswerKind): string {
  return withoutLeadingTo(text, kind).replace(/\s+/g, '')
}

/**
 * True when `submitted` matches any acceptable answer under the
 * normalization above. Comparison widens in steps — exact normalized form,
 * then ignoring an optional leading "to", then ignoring spacing entirely —
 * so nothing looser than the stored answers is ever accepted.
 */
export function checkAnswer(submitted: string, acceptable: string[], kind: AnswerKind): boolean {
  const answers = acceptable.filter((a) => a.trim().length > 0)
  if (answers.length === 0) return false

  const normalizedSubmitted = normalize(submitted, kind)
  if (!normalizedSubmitted) return false
  if (answers.some((a) => normalize(a, kind) === normalizedSubmitted)) return true

  const toless = withoutLeadingTo(submitted, kind)
  if (toless && answers.some((a) => withoutLeadingTo(a, kind) === toless)) return true

  const collapsedSubmitted = collapse(submitted, kind)
  if (!collapsedSubmitted) return false
  return answers.some((a) => collapse(a, kind) === collapsedSubmitted)
}
