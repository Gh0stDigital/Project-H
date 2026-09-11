import type { PlateauRequirement } from '@/domain/battle'

/**
 * Boss Plateau — a barrier made of one requirement per word in the Dungeon
 * Spell Set. Defined exclusively by the Dungeon Spell Set: equipping
 * unrelated Totem Spells never adds requirements.
 */

export function buildPlateau(dungeonWordIds: string[]): PlateauRequirement[] {
  return dungeonWordIds.map((spellId) => ({ spellId, cleared: false }))
}

export function clearRequirement(plateau: PlateauRequirement[], spellId: string): PlateauRequirement[] {
  return plateau.map((r) => (r.spellId === spellId ? { ...r, cleared: true } : r))
}

export function remainingCount(plateau: PlateauRequirement[]): number {
  return plateau.filter((r) => !r.cleared).length
}

export function isFullyCleared(plateau: PlateauRequirement[]): boolean {
  return plateau.every((r) => r.cleared)
}

export function uncleared(plateau: PlateauRequirement[]): string[] {
  return plateau.filter((r) => !r.cleared).map((r) => r.spellId)
}

/**
 * Which word the barrier demands next.
 *
 * Drawn only from the requirements still standing, so every spin can
 * advance the barrier — offering a word already cleared would be a turn the
 * player could not win. Returns null once nothing is left to clear.
 */
export function pickBarrierWord(
  plateau: PlateauRequirement[],
  rng: () => number = Math.random,
): string | null {
  const left = uncleared(plateau)
  if (left.length === 0) return null
  return left[Math.min(left.length - 1, Math.floor(rng() * left.length))]
}
