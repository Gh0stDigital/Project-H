// What the game can make a noise about.
//
// The single source of truth for the sound pack: the generator validates
// against it, the placeholder synth fills gaps from it, and it is copied into
// the generated manifest so the app addresses cues by these names and nothing
// else. Adding a name here is what makes a new sound playable.

/** Looping beds. One plays at a time; changing it crossfades. */
export const MUSIC_SLOTS = [
  'menu',
  'dungeon',
  'battle',
  'boss',
  'rest',
  'results',
]

/**
 * Looping atmosphere under the music. Several can play at once, each at its
 * own level, so a corridor can be wind plus dripping water without needing a
 * dedicated file for that combination.
 */
export const AMBIENT_SLOTS = ['wind', 'drip', 'night']

/** One-shots. */
export const SFX_SLOTS = [
  // Combat
  'damage',
  'playerAttack',
  'enemyAttack',
  'battleStart',
  'enemyAppear',
  'victory',
  'defeat',
  // Answering — the loop the whole game is built on
  'correct',
  'wrong',
  // Events
  'trapTrigger',
  'chestOpen',
  'discovery',
  'shrine',
  'bossDoor',
  'reward',
  'npcTalk',
  // Moving about
  'move',
  'diceRoll',
  // Interface
  'confirm',
  'cancel',
  'itemUse',
  'levelUp',
]

/** Folder per kind, and the slots each folder is expected to fill. */
export const AUDIO_FOLDERS = ['music', 'ambient', 'sfx']

export const SLOTS_BY_FOLDER = {
  music: MUSIC_SLOTS,
  ambient: AMBIENT_SLOTS,
  sfx: SFX_SLOTS,
}

/**
 * Music a world may ship for itself, overriding the global track of the same
 * name. A world without any of these simply uses the global music.
 */
export const WORLD_MUSIC_SLOTS = ['dungeon', 'battle', 'boss']
