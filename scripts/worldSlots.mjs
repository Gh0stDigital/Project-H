// What a world must contain to be playable.
//
// The single source of truth for the pack format: the generator validates
// against it, the placeholder script fills gaps from it, and it is copied
// into the generated manifest so the app can report the same names back.
// Adding a slot here is all it takes to require a new asset of every world.

/** Every dungeon situation needs somewhere to happen. */
export const REQUIRED_LOCATIONS = [
  'entrance',
  'corridor1',
  'corridor2',
  'keyRoom',
  'restRoom',
  'pathwayFork',
  'shrineRoom',
  'treasureRoom',
  'trapRoom',
  'bossRoom',
]

/**
 * Extra backdrops a world may add; the game uses them when present.
 *
 * Arenas are named either way in the wild — dragon-king ships `battle`,
 * the newer worlds ship `battle1` — and config/scenes.ts treats all three
 * as the same kind of room. The extra corridors join the rotation the plain
 * ones are drawn from, so a world with four passages does not keep showing
 * the first two.
 */
export const OPTIONAL_LOCATIONS = ['battle', 'battle1', 'battle2', 'corridor3', 'corridor4']

/** The props and moments an event shows. */
export const REQUIRED_EVENTS = [
  'bossDoor',
  'roadSign',
  'key',
  'trap1',
  'trap2',
  'treasureLocked',
  'treasureOpened',
  'treasureMimic',
  'rest',
  'shrineDoor',
]

/**
 * Folders counted rather than named: the art is free-form, only the number
 * matters. NPC and enemy filenames become their in-game names.
 */
export const MIN_NPCS = 3
/**
 * Three is enough for a bestiary to feel like one, and it is the number a
 * hand-drawn pack actually arrives with. At four, the Profane Prison's three
 * painted inmates were topped up with a grey stand-in that then turned up in
 * fights alongside them — a placeholder is there to keep an unfinished world
 * playable, not to pad a finished one.
 */
export const MIN_ENEMIES = 3

/**
 * Boss art is optional. A world without it borrows one of its own enemies,
 * so a pack is complete without one — but a boss that looks like a boss is
 * worth adding.
 */
export const OPTIONAL_FOLDERS = ['bosses']

export const WORLD_FOLDERS = ['locations', 'events', 'npcs', 'enemies', 'bosses']
