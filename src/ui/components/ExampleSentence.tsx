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
 * While the question is open the sentence appears with the word cut out, so
 * it is a clue about usage rather than the answer; after the answer it
 * appears whole, with its translation.
 *
 * The panel is on screen for every prompt now, even when there is no
 * sentence to put in it. It used to render nothing in that case, and nothing
 * is indistinguishable from a broken feature: the example field is optional,
 * so a compendium typed in quickly — or imported in the short two-column
 * form, which has nowhere to put one — has no examples at all, and the game
 * simply looked like it had stopped showing them. Saying so turns an
 * invisible blank into something the player can act on.
 */
export function ExampleSentence({ spell, reveal = false, mask = true }: ExampleSentenceProps) {
  if (!spell) return null
  const sentence = spell.sampleSentence?.trim()

  // Nothing to add afterwards: the note below already said why, while they
  // were answering.
  if (!sentence && reveal) return null

  if (!sentence) {
    return (
      <div className="example-sentence is-empty">
        <span className="example-sentence-label">예문</span>
        <p className="example-sentence-text">이 단어에는 예문이 없습니다 · 도감에서 추가할 수 있어요</p>
      </div>
    )
  }

  const hide = mask && !reveal
  const masked = hide ? maskExample(sentence, spellForms(spell)) : null

  // It had to be cut and could not be: Korean contraction can swallow every
  // spelling of a word — 크다 becomes 큽니다. Printing it would print the
  // answer, so the sentence waits, and the panel says so rather than
  // disappearing.
  if (masked && !masked.safe) {
    return (
      <div className="example-sentence is-empty">
        <span className="example-sentence-label">예문</span>
        <p className="example-sentence-text">답을 맞힌 뒤에 예문을 보여 드립니다</p>
      </div>
    )
  }

  const translation = spell.sampleTranslation?.trim()
  /**
   * The second example, if the entry has one.
   *
   * Held back while the question is open — two sentences to read under a
   * timer is a worse prompt, not a better one — and shown once the answer
   * is in, where a second use of the word in different company is the part
   * that teaches.
   */
  const second = reveal ? spell.sampleSentence2?.trim() : ''
  const secondTranslation = spell.sampleTranslation2?.trim()

  return (
    <div className={`example-sentence${reveal ? ' is-revealed' : ''}`}>
      <span className="example-sentence-label">예문</span>
      <p className="example-sentence-text">{masked ? masked.text : sentence}</p>
      {reveal && translation && <p className="example-sentence-translation">{translation}</p>}
      {second && (
        <>
          <p className="example-sentence-text is-second">{second}</p>
          {secondTranslation && <p className="example-sentence-translation">{secondTranslation}</p>}
        </>
      )}
    </div>
  )
}
