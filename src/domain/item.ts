/**
 * Consumable items the player can carry into a dungeon and use from a
 * room. Item *definitions* (names, effects, drop rates) live in
 * config/items.ts; this file only describes the shapes.
 */

export type ItemId = 'healing_herb' | 'greater_elixir' | 'charge_crystal' | 'escape_rope'

/**
 * What using an item does. Kept as a discriminated union so systems can
 * exhaustively handle every effect, and new effects can be added without
 * touching the ones that already work.
 */
export type ItemEffect =
  | { kind: 'heal'; /** Fraction of max HP restored, 0..1. */ fraction: number }
  | { kind: 'charge'; /** Charge added to every Spell in the battle deck. */ amount: number }
  /** Ends the run and walks out. Costs no Life Point — this is a retreat. */
  | { kind: 'escape' }

export interface ItemDef {
  id: ItemId
  name: string
  icon: string
  description: string
  effect: ItemEffect
  /** Relative weight in the random drop table. 0 = never drops. */
  dropWeight: number
}

/** One stack in the player's inventory. */
export interface InventoryEntry {
  itemId: ItemId
  quantity: number
}
