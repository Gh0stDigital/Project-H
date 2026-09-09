import type { WorldPack } from '@/config/worldManifest'

/**
 * What has appeared since the player last looked.
 *
 * The build compiles whatever art is present, so the game already knows its
 * full catalogue on launch. This is the other half: remembering what the
 * player has been told about, so a world or a Totem added between sessions
 * announces itself once instead of arriving silently.
 *
 * Pure. The caller supplies what is known now and what was seen before.
 */

export interface SeenContent {
  worldIds: string[]
  totemKeys: string[]
}

export interface NewContent {
  worlds: WorldPack[]
  totems: string[]
}

export function emptySeen(): SeenContent {
  return { worldIds: [], totemKeys: [] }
}

/**
 * Finds what is new. Only complete worlds count: a half-finished pack is not
 * something to announce to a player, and announcing it once would mean never
 * announcing it again when it is actually finished.
 */
export function findNewContent(
  worlds: readonly WorldPack[],
  totemKeys: readonly string[],
  seen: SeenContent,
): NewContent {
  return {
    worlds: worlds.filter((w) => w.complete && !seen.worldIds.includes(w.id)),
    totems: totemKeys.filter((k) => k !== 'default' && !seen.totemKeys.includes(k)),
  }
}

export function hasNewContent(found: NewContent): boolean {
  return found.worlds.length > 0 || found.totems.length > 0
}

/**
 * The record to store once the player has been shown the notice.
 *
 * Incomplete worlds are recorded as unseen so that finishing one still
 * announces it; everything else present is marked seen, including art that
 * arrived before this ever ran — a first launch should not list the whole
 * catalogue as new.
 */
export function markSeen(worlds: readonly WorldPack[], totemKeys: readonly string[]): SeenContent {
  return {
    worldIds: worlds.filter((w) => w.complete).map((w) => w.id),
    totemKeys: totemKeys.filter((k) => k !== 'default'),
  }
}
