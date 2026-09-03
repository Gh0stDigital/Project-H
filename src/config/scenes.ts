/**
 * Dungeon backdrops (public/assets/locations).
 *
 * The scene window used to show one fixed image for a whole run, so the
 * dungeon looked identical whether you were in a corridor, a treasure room
 * or a boss door. Each situation now names its own art, and because the
 * backdrop is derived from the current event it changes every time the
 * player moves.
 *
 * Each situation lists several candidates rather than one filename:
 *   - The first that exists wins, so art can land one file at a time and
 *     anything still missing quietly falls back instead of breaking.
 *   - Spelling variants sit side by side (corridor / coridoor), and lookup
 *     ignores case and separators, so hand-named art resolves either way.
 *   - Where more than one candidate fits, the choice is seeded from the
 *     event, so a corridor varies between moves but never flickers within
 *     one event.
 */

import { resolveKey } from './assets'
import type { DungeonEventType } from './dungeonEvents'

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

/** Plain corridors — the fallback for anything without dedicated art. */
const CORRIDORS = ['dkp_corridor1', 'dkp_corridor2'] as const

/**
 * Situations whose candidates are peers rather than a first choice with
 * alternates. Standby is every plain corridor, so it alternates evenly;
 * everywhere else the leading candidate is the room the event is actually
 * about and should usually be what you see.
 */
const EVEN_ODDS: ReadonlySet<SceneKind> = new Set<SceneKind>(['standby'])

/**
 * Candidates per situation, best fit first. Corridors trail most lists
 * because the artist called them usable for "various" moments: they are the
 * generic dungeon, not a wrong answer.
 */
const sceneCandidates: Record<SceneKind, readonly string[]> = {
  standby: CORRIDORS,
  treasure: ['dkp_treasureRoom', 'dkp_keyRoom', ...CORRIDORS],
  trap: ['dkp_trapRoom1', 'dkp_shrineRoom', ...CORRIDORS],
  // The encounter, met in a corridor or at a shrine — varied.
  battle: ['dkp_battle', 'dkp_shrineRoom', ...CORRIDORS],
  // The fight itself. Always the battle backdrop: it is the arena, not a
  // place you happened to walk through.
  battle_screen: ['dkp_battle'],
  boss_battle: ['dkp_bossBattle'],
  boss_door: ['dkp_bossBattle'],
  rest: ['dkp_restRoom'],
  magic_room: ['dkp_shrineRoom'],
  key_room: ['dkp_keyRoom', 'dkp_treasureRoom'],
  direction: ['dkp_2way'],
}

/** Which backdrop an event type belongs to. */
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
 * The art key for a situation, or null when none of its candidates exist
 * (callers then fall back to the run's own location art).
 *
 * `seed` decides between equally valid candidates — pass something that
 * changes per move, such as the event id or turn number.
 */
export function sceneKeyFor(kind: SceneKind, seed = ''): string | null {
  const candidates = sceneCandidates[kind]
  // Keep only art that actually exists, so the seed picks between real
  // options rather than landing on a gap.
  const available: string[] = []
  for (const candidate of candidates) {
    const key = resolveKey('locations', [candidate])
    if (key && !available.includes(key)) available.push(key)
  }
  if (available.length === 0) return null
  if (available.length === 1) return available[0]

  const h = hash(seed)
  if (EVEN_ODDS.has(kind)) return available[h % available.length]

  // Show the room the event is about most of the time, and one of its
  // alternates now and then, so a treasure event reads as treasure while
  // the dungeon still varies. Picking uniformly made the dedicated art the
  // exception rather than the rule.
  const VARIATION_IN = 3
  if (h % VARIATION_IN !== 0) return available[0]
  const alternates = available.slice(1)
  return alternates[Math.floor(h / VARIATION_IN) % alternates.length]
}

export interface SceneArt {
  category: 'locations'
  key: string
}

/**
 * The backdrop to draw, falling back to the run's own location art when a
 * situation has no scene art yet. Keeping the fallback here means callers
 * render one image and never branch on whether the art exists.
 */
export function sceneArt(kind: SceneKind, seed: string, locationKey: string): SceneArt {
  const key = sceneKeyFor(kind, seed)
  return { category: 'locations', key: key ?? locationKey }
}
