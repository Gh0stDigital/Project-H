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
    name: '치유 약초',
    icon: '🌿',
    description: '토템 최대 체력의 30%를 회복합니다.',
    effect: { kind: 'heal', fraction: 0.3 },
    dropWeight: 6,
  },
  greater_elixir: {
    id: 'greater_elixir',
    name: '상급 비약',
    icon: '🧪',
    description: '토템 최대 체력의 75%를 회복합니다.',
    effect: { kind: 'heal', fraction: 0.75 },
    dropWeight: 2,
  },
  charge_crystal: {
    id: 'charge_crystal',
    name: '충전 수정',
    icon: '💎',
    description: '전투 덱의 모든 주문에 충전 2를 더합니다.',
    effect: { kind: 'charge', amount: 2 },
    dropWeight: 3,
  },
  escape_rope: {
    id: 'escape_rope',
    name: '탈출 밧줄',
    icon: '🪢',
    description: '즉시 던전을 떠납니다. 탐험은 끝나지만 얻은 것은 모두 유지됩니다.',
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
