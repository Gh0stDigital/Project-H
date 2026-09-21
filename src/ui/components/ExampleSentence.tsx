import type { Spell } from '@/domain/spell'
import { maskExample, spellForms } from '@/systems/exampleSentence'

interface ExampleSentenceProps {
  spell: Spell | null | undefined
  /**
   * After the answer. Shows the sentence whole, with its translation —
   * which is the half that teaches, and also the half that would have given
   * the answer away a moment earlier.
   */
  reveal?: boolean
  /**
   * Whether the answer is the Korean word.
   *
   * Only then does the sentence need cutting: a prompt asking for English
   * cannot have its answer printed by a Korean sentence, and the Korean word
   * it contains is the one already on the card above. Masking that case hid
   * sentences for nothing.
   */
  mask?: boolean
}

/**
 * The word, used in a sentence.
 *
 * Under the options while the question is open it appears with the word cut
 * out, so it is a clue about usage rather than the answer; after the answer
 * it appears whole. A sentence the masking could not cut the word out of is
 * simply not shown until the reveal — see systems/exampleSentence.ts.
 */
export function ExampleSentence({ spell, reveal = false, mask = true }: ExampleSentenceProps) {
  if (!spell) return null
  const sentence = spell.sampleSentence?.trim()
  if (!sentence) return null

  const hide = mask && !reveal
  const masked = hide ? maskExample(sentence, spellForms(spell)) : null
  // Only when it had to be cut and could not be: printing the answer is the
  // one outcome worth losing the sentence over.
  if (masked && !masked.safe) return null

  const translation = spell.sampleTranslation?.trim()

  return (
    <div className={`example-sentence${reveal ? ' is-revealed' : ''}`}>
      <span className="example-sentence-label">예문</span>
      <p className="example-sentence-text">{masked ? masked.text : sentence}</p>
      {reveal && translation && <p className="example-sentence-translation">{translation}</p>}
    </div>
  )
}
