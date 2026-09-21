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
 * Every spelling of an entry this can hope to find in a sentence.
 *
 * The entry itself is only the dictionary form, and Korean sentences almost
 * never contain it: 먹다 appears as 먹어요, 갔어요, 먹습니다. Passing only
 * `korean` meant the masking failed on nearly every verb and adjective, and
 * a failed mask hides the sentence — which is why examples were not showing
 * for most words.
 *
 * So: the conjugations the entry already stores, and, for anything in
 * dictionary form, its stem. The stem is the blunt one — 먹다 gives 먹,
 * which also matches 먹 inside an unrelated word — but a blank in a slightly
 * wrong place is a far smaller loss than the sentence never appearing.
 *
 * Contraction still defeats it: 크다 becomes 큽니다, and no prefix of 크다
 * survives in that. Those sentences stay hidden while the question is open,
 * which is the right answer when the word cannot be found to hide it.
 */
export function spellForms(spell: {
  korean: string
  altKorean?: string[]
  derivedVerb?: string
  presentForm?: string
  pastForm?: string
  futureForm?: string
}): string[] {
  const stored = [
    spell.korean,
    ...(spell.altKorean ?? []),
    spell.derivedVerb,
    spell.presentForm,
    spell.pastForm,
    spell.futureForm,
  ]
  const forms: string[] = []
  for (const raw of stored) {
    const form = (raw ?? '').trim()
    if (!form) continue
    forms.push(form)
    // 먹다 -> 먹, which catches 먹어요 and 먹습니다 that the stored forms may
    // not cover. Two characters minimum: a one-character stem would match
    // most of the sentence.
    if (form.endsWith('다') && form.length >= 2) forms.push(form.slice(0, -1))
  }
  return forms
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
