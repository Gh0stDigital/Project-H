import type { HangmanPuzzle } from '@/systems/hangman'
import { correctGuesses, mistakesRemaining, revealedSlots, wrongGuesses } from '@/systems/hangman'

interface MagicRoomViewProps {
  puzzle: HangmanPuzzle
  onGuess: (syllable: string) => void
  onFinish: () => void
}

/**
 * The Magic Room's Hangman puzzle over a Korean word's syllable blocks.
 *
 * There is no keyboard anywhere in the dungeon, so guesses are made by
 * tapping candidates from a grid. The answer is never revealed until the
 * puzzle has ended, one way or the other.
 */
export function MagicRoomView({ puzzle, onGuess, onFinish }: MagicRoomViewProps) {
  const slots = revealedSlots(puzzle)
  const remaining = mistakesRemaining(puzzle)
  const hits = correctGuesses(puzzle)
  const misses = wrongGuesses(puzzle)
  const done = puzzle.status !== 'playing'

  return (
    <div className="panel challenge-prompt magic-room">
      <div className="prompt-label">Break the seal</div>

      <div className="hangman-slots" lang="ko">
        {slots.map((s, i) => (
          <span key={i} className={`hangman-slot${s ? ' filled' : ''}`}>
            {s ?? ''}
          </span>
        ))}
      </div>

      <div className="hangman-status">
        <span className={`hangman-mistakes${remaining <= 1 ? ' danger' : ''}`}>
          {'♥'.repeat(remaining)}
          <span className="faint">{'♡'.repeat(puzzle.mistakes)}</span>
        </span>
        <span className="faint">{remaining} mistake{remaining === 1 ? '' : 's'} left</span>
      </div>

      {done ? (
        <>
          <div className={`feedback-banner ${puzzle.status === 'solved' ? 'correct' : 'incorrect'}`}>
            {puzzle.status === 'solved'
              ? 'The glyphs unwind — the room opens!'
              : `The door seals for good. The word was ${puzzle.answer}.`}
          </div>
          <div className="tile-actions">
            <button className="btn btn-primary btn-sm" onClick={onFinish}>
              Continue →
            </button>
          </div>
        </>
      ) : (
        <>
          <div className="tile-tray" lang="ko">
            {puzzle.candidates.map((c) => {
              const used = puzzle.guessed.includes(c)
              const hit = hits.includes(c)
              return (
                <button
                  key={c}
                  className={`answer-tile${used ? (hit ? ' guess-hit' : ' guess-miss') : ''}`}
                  disabled={used}
                  onClick={() => onGuess(c)}
                >
                  {c}
                </button>
              )
            })}
          </div>
          {misses.length > 0 && (
            <p className="faint">Wrong so far: {misses.join(' · ')}</p>
          )}
        </>
      )}
    </div>
  )
}
