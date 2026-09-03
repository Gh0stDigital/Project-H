/**
 * Vocabulary challenge domain — shared by general dungeon events and battle.
 */

export type ChallengeDirection = 'kor_to_eng' | 'eng_to_kor'

export type ChallengeContext =
  | 'event'
  | 'trap'
  | 'treasure'
  | 'shrine'
  | 'discovery'
  | 'special'
  | 'attack'
  | 'defense'

export interface Challenge {
  id: string
  spellId: string
  direction: ChallengeDirection
  /** The word/phrase shown to the player. */
  prompt: string
  context: ChallengeContext
}

export interface ChallengeOutcome {
  challenge: Challenge
  submitted: string
  correct: boolean
}
