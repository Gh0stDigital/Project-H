/**
 * The example sentence shown under a combat prompt.
 *
 * Seeing a word used is most of what makes it stick, so the entry's own
 * example is put in front of the player while they answer — with the word
 * itself taken out, and put back once they have answered.
 *
 * The masking is the whole safety question. An attack prompt asks for the
 * Korean word, and the example sentence is Korean: printing it unmasked
 * would be printing the answer. So a sentence is only ever shown during a
 * prompt when the word was actually found and hidden in it, and Korean
 * being agglutinative — 불 appears as 불이, 불을, 불로 — that is not a given.
 *
 * Pure: no React, no store.
 */

export const BLANK = '____'

export interface MaskedExample {
  /** The sentence with every known form of the word blanked out. */
  text: string
  /**
   * True when at least one form was found and hidden. False means the word
   * does not appear in its own example in any spelling this can recognise,
   * and the sentence must not be shown while the question is open.
   */
  safe: boolean
}

function escape(form: string): string {
  return form.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * Hides every form of a word in a sentence.
 *
 * Longer forms are masked first so a word that contains another — 불 inside
 * 불꽃 — does not leave half of the longer one behind as a stray syllable
 * stuck to the blank.
 */
export function maskExample(sentence: string, forms: readonly string[]): MaskedExample {
  const clean = sentence.trim()
  if (!clean) return { text: '', safe: false }

  const usable = [...new Set(forms.map((f) => f.trim()).filter(Boolean))].sort(
    (a, b) => b.length - a.length,
  )
  if (usable.length === 0) return { text: clean, safe: false }

  let text = clean
  let hit = false
  for (const form of usable) {
    const pattern = new RegExp(escape(form), 'gi')
    if (pattern.test(text)) {
      hit = true
      text = text.replace(pattern, BLANK)
    }
  }
  // Two adjacent blanks read as one gap, not two.
  text = text.replace(new RegExp(`(?:${escape(BLANK)})+`, 'g'), BLANK)
  return { text, safe: hit }
}
