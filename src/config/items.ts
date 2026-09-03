/**
 * Item catalog + drop balance.
 *
 * Like balance.ts, this is the single place to tune what items exist, what
 * they do, and how often they drop. Systems and UI read from here; neither
 * hardcodes an item name, effect value, or drop chance.
 */

import type { ItemDef, ItemId } from '@/domain/item'

export const itemDefs: Record<ItemId, ItemDef> = {
  healing_herb: {
    id: 'healing_herb',
    name: 'Healing Herb',
    icon: '🌿',
    description: 'Restores 30% of your Totem’s max HP.',
    effect: { kind: 'heal', fraction: 0.3 },
    dropWeight: 6,
  },
  greater_elixir: {
    id: 'greater_elixir',
    name: 'Greater Elixir',
    icon: '🧪',
    description: 'Restores 75% of your Totem’s max HP.',
    effect: { kind: 'heal', fraction: 0.75 },
    dropWeight: 2,
  },
  charge_crystal: {
    id: 'charge_crystal',
    name: 'Charge Crystal',
    icon: '💎',
    description: 'Adds 2 charge to every Spell in your battle deck.',
    effect: { kind: 'charge', amount: 2 },
    dropWeight: 3,
  },
  escape_rope: {
    id: 'escape_rope',
    name: 'Escape Rope',
    icon: '🪢',
    description: 'Leave the dungeon at once. Your run ends and you keep everything you found.',
    effect: { kind: 'escape' },
    // Never a random drop — the player always starts a run able to walk out.
    dropWeight: 0,
  },
}

export const itemBalance = {
  /** What the player starts a fresh save with. */
  startingInventory: [
    { itemId: 'healing_herb' as ItemId, quantity: 2 },
    { itemId: 'escape_rope' as ItemId, quantity: 1 },
  ],
  /** Chance that a successfully-opened treasure also yields an item. */
  treasureDropChance: 0.45,
  /** Items are always granted on a boss victory. */
  bossDropCount: 1,
}

export function getItemDef(id: ItemId): ItemDef {
  return itemDefs[id]
}

export const allItemDefs: ItemDef[] = Object.values(itemDefs)
