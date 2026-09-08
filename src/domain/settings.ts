/**
 * How an English answer is presented.
 *
 * `choice` shows the whole answer as one tile among other complete answers —
 * recall without spelling. `spell` is the original board, which cuts a
 * one-word answer into letters. Korean answers are always assembled from
 * syllables either way: building the word is the practice there, and this
 * setting does not touch it.
 */
export type EnglishAnswerMode = 'choice' | 'spell'

export interface GameSettings {
  /** Seconds allowed to answer an enemy attack. Configurable for a11y/testing. */
  enemyTimerSeconds: number
  /** Typewriter reveal speed, characters per second. */
  typewriterCharsPerSecond: number
  /** How English answers are answered. See EnglishAnswerMode. */
  englishAnswerMode: EnglishAnswerMode
}

export const defaultSettings: GameSettings = {
  enemyTimerSeconds: 12,
  typewriterCharsPerSecond: 38,
  englishAnswerMode: 'choice',
}
