import type { Spell } from '@/domain/spell'
import type { Challenge, ChallengeContext, ChallengeDirection } from '@/domain/challenge'
import { makeId } from './idGen'
import { checkAnswer } from './answerChecker'
import { acceptableAnswers, recordChallengeOutcome, type ChallengeOutcomeResult } from './spellCompendium'

/**
 * Vocabulary challenge engine — turns a Spell into a prompt/answer pair and
 * grades submissions. Contains no UI or presentation logic.
 */

export function pickDirection(rng: () => number = Math.random): ChallengeDirection {
  return rng() < 0.5 ? 'eng_to_kor' : 'kor_to_eng'
}

export function generateChallenge(
  spell: Spell,
  context: ChallengeContext,
  direction: ChallengeDirection = pickDirection(),
): Challenge {
  return {
    id: makeId('chal'),
    spellId: spell.id,
    direction,
    prompt: direction === 'eng_to_kor' ? spell.english : spell.korean,
    context,
  }
}

export interface ChallengeResolution extends ChallengeOutcomeResult {
  correct: boolean
}

/**
 * Grades a submission against the Spell's saved answer(s) and applies the
 * standard progression/stat update. Which "context" (challenge/attack/
 * defense) is passed determines which counters and XP amount apply.
 */
export function resolveChallenge(
  spell: Spell,
  challenge: Challenge,
  submitted: string,
  compendiumContext: 'challenge' | 'attack' | 'defense',
): ChallengeResolution {
  const answerKind = challenge.direction === 'eng_to_kor' ? 'korean' : 'english'
  const acceptable = acceptableAnswers(spell, answerKind)
  const correct = checkAnswer(submitted, acceptable, answerKind)
  const outcome = recordChallengeOutcome(spell, correct, compendiumContext)
  return { ...outcome, correct }
}
