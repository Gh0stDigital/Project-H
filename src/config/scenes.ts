/**
 * Which backdrop each dungeon situation uses.
 *
 * Every world supplies the same set of rooms by slot name, so this maps a
 * situation to a slot and the world supplies the picture. That replaces the
 * old per-filename candidate lists: adding a world needs no change here, and
 * a situation can never point at art a world does not have, because the pack
 * format requires every slot listed below.
 */

import type { DungeonEventType } from './dungeonEvents'
import type { WorldPack } from './worldManifest'
import { resolveSlot, pickSlot } from '@/systems/worldRegistry'

export type SceneKind =
  | 'standby'
  | 'treasure'
  | 'trap'
  | 'battle'
  | 'battle_screen'
  | 'boss_battle'
  | 'boss_door'
  | 'rest'
  | 'magic_room'
  | 'key_room'
  | 'direction'
  | 'entrance'

/** The plain corridors, used for anything without a room of its own. */
const CORRIDORS = ['corridor1', 'corridor2', 'corridor3', 'corridor4'] as const

/**
 * Arenas. Worlds name their first one either way — dragon-king ships
 * `battle`, parasite-garden ships `battle1` — and only `battle` was ever
 * listed, so parasite-garden's first arena could not be chosen at all.
 */
const BATTLEGROUNDS = ['battle', 'battle1', 'battle2'] as const

/**
 * Situations that must not settle for a fallback when the world ships art
 * made for them.
 *
 * A fight belongs in an arena. Leaving the corridors in the same list as
 * peers meant they were picked on their share of the odds rather than as a
 * last resort: parasite-garden has one listed arena against three corridors,
 * so three fights in four happened in a passage. The corridors stay in the
 * lists below for a world like `starter`, which ships no arena at all.
 */
const MUST_PREFER: Partial<Record<SceneKind, readonly string[]>> = {
  battle: BATTLEGROUNDS,
  battle_screen: BATTLEGROUNDS,
}

/**
 * Situations whose candidates are peers rather than a first choice with
 * alternates: a corridor is a corridor, and a world with two battle
 * backdrops means them equally.
 */
const EVEN_ODDS: ReadonlySet<SceneKind> = new Set<SceneKind>(['standby', 'battle_screen'])

/**
 * Slots per situation, best fit first. Corridors trail most lists because
 * they are the generic dungeon rather than a wrong answer — a trap met in a
 * passage is still a trap.
 */
const sceneSlots: Record<SceneKind, readonly string[]> = {
  entrance: ['entrance'],
  standby: CORRIDORS,
  treasure: ['treasureRoom', 'keyRoom', ...CORRIDORS],
  trap: ['trapRoom', 'shrineRoom', ...CORRIDORS],
  // The encounter, and the fight it leads to. Both want an arena; the
  // shrine and the corridors are what a world without one gets.
  battle: [...BATTLEGROUNDS, 'shrineRoom', ...CORRIDORS],
  battle_screen: [...BATTLEGROUNDS, ...CORRIDORS],
  boss_battle: ['bossRoom'],
  boss_door: ['bossRoom'],
  rest: ['restRoom'],
  magic_room: ['shrineRoom'],
  key_room: ['keyRoom', 'treasureRoom'],
  direction: ['pathwayFork'],
}

const eventScene: Record<DungeonEventType, SceneKind> = {
  treasure: 'treasure',
  trap: 'trap',
  battle: 'battle',
  rest: 'rest',
  direction: 'direction',
  magic_room: 'magic_room',
  boss_door: 'boss_door',
  key_room: 'key_room',
}

export function sceneKindForEvent(type: DungeonEventType): SceneKind {
  return eventScene[type]
}

function hash(seed: string): number {
  let h = 0
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0
  return h
}

/**
 * The location slot for a situation in a given world, or null if the world
 * somehow has none of its candidates.
 *
 * `seed` decides between equally good options — pass something that changes
 * per move, such as the event id or the turn number.
 */
export function sceneSlotFor(world: WorldPack, kind: SceneKind, seed = ''): string | null {
  const available = sceneSlots[kind].filter((slot) => world.locations.includes(slot))
  if (available.length === 0) return resolveSlot(world, 'locations', CORRIDORS)

  // Where a situation has art of its own, it uses it — evenly across
  // however many the world ships, and never a fallback alongside them.
  const preferred = MUST_PREFER[kind]?.filter((slot) => world.locations.includes(slot)) ?? []
  if (preferred.length > 0) return preferred[hash(seed) % preferred.length]

  if (available.length === 1) return available[0]

  const h = hash(seed)
  if (EVEN_ODDS.has(kind)) return available[h % available.length]

  // Show the room the situation is about most of the time, and one of its
  // alternates now and then. Picking uniformly made the dedicated art the
  // exception rather than the rule.
  const VARIATION_IN = 3
  if (h % VARIATION_IN !== 0) return available[0]
  const alternates = available.slice(1)
  return alternates[Math.floor(h / VARIATION_IN) % alternates.length]
}

/** Any location in the world, for callers that just need something sensible. */
export function anyLocationSlot(world: WorldPack, seed: string): string | null {
  return pickSlot(world.locations, seed)
}
