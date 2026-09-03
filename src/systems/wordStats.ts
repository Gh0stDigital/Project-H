import type { DungeonRunState, WordRunStats } from '@/domain/dungeon'
import { emptyWordStats } from '@/domain/dungeon'

/**
 * Per-run vocabulary tracking.
 *
 * Separate from the lifetime counters on a Spell (which
 * spellCompendium.recordChallengeOutcome already maintains) — this module
 * answers "how did this word go *in this run*", which is what the Key Room
 * gate and the Results screen report on.
 *
 * Pure functions only.
 */

export type AttemptKind = 'attack' | 'defense' | 'event'

export function initWordStats(spellIds: string[]): Record<string, WordRunStats> {
  const out: Record<string, WordRunStats> = {}
  for (const id of spellIds) out[id] = emptyWordStats(id)
  return out
}

/**
 * Records one *completed* prompt. Completing a prompt is what marks a word
 * "introduced", right or wrong — which is the exact condition the Key Room
 * unlock is defined against.
 */
export function recordAttempt(
  stats: Record<string, WordRunStats>,
  spellId: string,
  kind: AttemptKind,
  correct: boolean,
): Record<string, WordRunStats> {
  const prev = stats[spellId] ?? emptyWordStats(spellId)
  const next: WordRunStats = {
    ...prev,
    introduced: true,
    correct: prev.correct + (correct ? 1 : 0),
    incorrect: prev.incorrect + (correct ? 0 : 1),
    attackCorrect: prev.attackCorrect + (kind === 'attack' && correct ? 1 : 0),
    attackTotal: prev.attackTotal + (kind === 'attack' ? 1 : 0),
    defenseCorrect: prev.defenseCorrect + (kind === 'defense' && correct ? 1 : 0),
    defenseTotal: prev.defenseTotal + (kind === 'defense' ? 1 : 0),
  }
  return { ...stats, [spellId]: next }
}

/**
 * Marks a word introduced without recording an attempt — used by the Magic
 * Room, whose puzzle word counts as seen however the puzzle ended.
 */
export function markIntroduced(
  stats: Record<string, WordRunStats>,
  spellId: string,
): Record<string, WordRunStats> {
  const prev = stats[spellId] ?? emptyWordStats(spellId)
  if (prev.introduced) return stats
  return { ...stats, [spellId]: { ...prev, introduced: true } }
}

export function accuracyOf(s: WordRunStats): number {
  const total = s.correct + s.incorrect
  return total === 0 ? 0 : s.correct / total
}

export function attackAccuracyOf(s: WordRunStats): number {
  return s.attackTotal === 0 ? 0 : s.attackCorrect / s.attackTotal
}

export function defenseAccuracyOf(s: WordRunStats): number {
  return s.defenseTotal === 0 ? 0 : s.defenseCorrect / s.defenseTotal
}

/** Attempted words the player got wrong at least as often as right. */
export function strugglingWords(run: DungeonRunState): WordRunStats[] {
  return run.config.dungeonWordIds
    .map((id) => run.wordStats[id])
    .filter((s): s is WordRunStats => !!s && s.correct + s.incorrect > 0 && s.incorrect >= s.correct)
    .sort((a, b) => b.incorrect - a.incorrect)
}
