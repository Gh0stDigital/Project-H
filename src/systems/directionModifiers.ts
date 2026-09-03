import type { ActiveModifier, DirectionChoice } from '@/domain/dungeon'
import type { DungeonEventType } from '@/config/dungeonEvents'
import { directionBalance } from '@/config/dungeonEvents'

/**
 * Temporary Direction biases on event generation.
 *
 * Stacking rule (the game had none before, so this is the documented one):
 * modifiers affecting *different* event types coexist; adding a modifier
 * that touches an event type an active modifier already touches replaces
 * that older modifier. A resulting weight is never allowed below 0.
 *
 * Pure functions only.
 */

export function addModifier(active: ActiveModifier[], choice: DirectionChoice): ActiveModifier[] {
  const incoming: ActiveModifier = {
    id: choice.id,
    label: choice.label,
    weightDeltas: choice.weightDeltas,
    movesRemaining: choice.durationMoves,
  }
  if (!directionBalance.replaceOnOverlappingType) return [...active, incoming]

  const touched = new Set(Object.keys(choice.weightDeltas) as DungeonEventType[])
  const kept = active.filter((m) => {
    const overlaps = (Object.keys(m.weightDeltas) as DungeonEventType[]).some((t) => touched.has(t))
    return !overlaps
  })
  return [...kept, incoming]
}

/**
 * Ticks every modifier down by one Move and drops the expired ones. Called
 * once per Move, *after* the event has been generated, so a modifier chosen
 * on turn N first applies to the roll on turn N+1 and lasts its full
 * advertised duration.
 */
export function tickModifiers(active: ActiveModifier[]): ActiveModifier[] {
  return active
    .map((m) => ({ ...m, movesRemaining: m.movesRemaining - 1 }))
    .filter((m) => m.movesRemaining > 0)
}

/** Applies every active modifier to a base weight table, flooring at 0. */
export function applyModifiers(
  weights: Record<DungeonEventType, number>,
  active: ActiveModifier[],
): Record<DungeonEventType, number> {
  const out = { ...weights }
  for (const mod of active) {
    for (const [type, delta] of Object.entries(mod.weightDeltas) as [DungeonEventType, number][]) {
      out[type] = Math.max(0, (out[type] ?? 0) + delta)
    }
  }
  return out
}

/** Short "Treasure ×2 · 3 moves left"-style summary for the HUD. */
export function describeModifier(mod: ActiveModifier): string {
  const parts = (Object.entries(mod.weightDeltas) as [DungeonEventType, number][]).map(([type, delta]) => {
    const name = type.replace('_', ' ')
    return `${delta > 0 ? '↑' : '↓'} ${name}`
  })
  return parts.join(' · ')
}
