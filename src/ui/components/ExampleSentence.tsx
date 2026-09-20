import type { Spell } from '@/domain/spell'
import { maskExample } from '@/systems/exampleSentence'

interface ExampleSentenceProps {
  spell: Spell | null | undefined
  /**
   * After the answer. Shows the sentence whole, with its translation —
   * which is the half that teaches, and also the half that would have given
   * the answer away a moment earlier.
   */
  reveal?: boolean
}

/**
 * The word, used in a sentence.
 *
 * Under the options while the question is open it appears with the word cut
 * out, so it is a clue about usage rather than the answer; after the answer
 * it appears whole. A sentence the masking could not cut the word out of is
 * simply not shown until the reveal — see systems/exampleSentence.ts.
 */
export function ExampleSentence({ spell, reveal = false }: ExampleSentenceProps) {
  if (!spell) return null
  const sentence = spell.sampleSentence?.trim()
  if (!sentence) return null

  const forms = [spell.korean, ...(spell.altKorean ?? [])]
  const masked = maskExample(sentence, forms)
  if (!reveal && !masked.safe) return null

  const translation = spell.sampleTranslation?.trim()

  return (
    <div className={`example-sentence${reveal ? ' is-revealed' : ''}`}>
      <span className="example-sentence-label">예문</span>
      <p className="example-sentence-text">{reveal ? sentence : masked.text}</p>
      {reveal && translation && <p className="example-sentence-translation">{translation}</p>}
    </div>
  )
}
