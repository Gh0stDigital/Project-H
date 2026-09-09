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

/** Extra backdrops a world may add; the game uses them when present. */
export const OPTIONAL_LOCATIONS = ['battle', 'battle2']

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
export const MIN_ENEMIES = 4

/**
 * Boss art is optional. A world without it borrows one of its own enemies,
 * so a pack is complete without one — but a boss that looks like a boss is
 * worth adding.
 */
export const OPTIONAL_FOLDERS = ['bosses']

export const WORLD_FOLDERS = ['locations', 'events', 'npcs', 'enemies', 'bosses']
