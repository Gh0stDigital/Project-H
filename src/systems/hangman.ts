import { magicRoomBalance } from '@/config/dungeonEvents'

/**
 * Magic Room puzzle — Hangman over the syllable blocks of a Korean word.
 *
 * The dungeon has no keyboard (answers are assembled from tiles), so the
 * player guesses by tapping candidate syllable blocks from a grid rather
 * than typing characters. The grid always contains every syllable the
 * answer needs, padded with decoys drawn from the run's other words.
 *
 * Pure functions only: no React, no state, randomness via an injected rng.
 */

export interface HangmanPuzzle {
  /** The word being guessed, kept out of the UI until the puzzle ends. */
  answer: string
  /** One entry per position in the answer. */
  slots: string[]
  /** The tappable guess grid, shuffled. */
  candidates: string[]
  guessed: string[]
  mistakes: number
  maxMistakes: number
  status: 'playing' | 'solved' | 'failed'
}

function shuffle<T>(items: T[], rng: () => number): T[] {
  const out = [...items]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

/** Syllable blocks of a Korean word — spaces dropped, one entry per char. */
export function syllablesOf(word: string): string[] {
  return [...word.trim()].filter((c) => c.trim().length > 0)
}

export function createPuzzle(
  answer: string,
  decoySources: string[],
  rng: () => number = Math.random,
): HangmanPuzzle {
  const slots = syllablesOf(answer)
  const needed = [...new Set(slots)]

  const decoyPool: string[] = []
  for (const source of decoySources) {
    if (!source || source.trim() === answer.trim()) continue
    for (const syl of syllablesOf(source)) {
      if (needed.includes(syl) || decoyPool.includes(syl)) continue
      decoyPool.push(syl)
    }
  }

  const room = Math.max(0, magicRoomBalance.guessGridSize - needed.length)
  const candidates = shuffle([...needed, ...shuffle(decoyPool, rng).slice(0, room)], rng)

  return {
    answer: answer.trim(),
    slots,
    candidates,
    guessed: [],
    mistakes: 0,
    maxMistakes: magicRoomBalance.maxMistakes,
    status: 'playing',
  }
}

/** True once every distinct syllable of the answer has been guessed. */
function isSolved(puzzle: HangmanPuzzle, guessed: string[]): boolean {
  return puzzle.slots.every((s) => guessed.includes(s))
}

/**
 * Applies one guess. A repeated guess is a no-op — it never costs an
 * attempt and never changes the puzzle.
 */
export function guess(puzzle: HangmanPuzzle, syllable: string): HangmanPuzzle {
  if (puzzle.status !== 'playing') return puzzle
  if (puzzle.guessed.includes(syllable)) return puzzle

  const guessed = [...puzzle.guessed, syllable]
  const hit = puzzle.slots.includes(syllable)
  const mistakes = puzzle.mistakes + (hit ? 0 : 1)

  const solved = isSolved(puzzle, guessed)
  const failed = !solved && mistakes >= puzzle.maxMistakes

  return {
    ...puzzle,
    guessed,
    mistakes,
    status: solved ? 'solved' : failed ? 'failed' : 'playing',
  }
}

/** What each slot should render: the syllable once revealed, else null. */
export function revealedSlots(puzzle: HangmanPuzzle): (string | null)[] {
  const showAll = puzzle.status !== 'playing'
  return puzzle.slots.map((s) => (showAll || puzzle.guessed.includes(s) ? s : null))
}

export function mistakesRemaining(puzzle: HangmanPuzzle): number {
  return Math.max(0, puzzle.maxMistakes - puzzle.mistakes)
}

/** Correct guesses so far, for showing which taps landed. */
export function correctGuesses(puzzle: HangmanPuzzle): string[] {
  return puzzle.guessed.filter((g) => puzzle.slots.includes(g))
}

export function wrongGuesses(puzzle: HangmanPuzzle): string[] {
  return puzzle.guessed.filter((g) => !puzzle.slots.includes(g))
}
