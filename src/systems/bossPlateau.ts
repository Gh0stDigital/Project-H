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
