/**
 * How long the screen takes to hide itself and come back.
 *
 * Numbers rather than CSS so one place owns them: the curtain's opacity
 * transition is driven from these values, and the music waits on the same
 * clock. If they lived in the stylesheet the sound and the picture would
 * drift apart the first time either was tuned.
 */
export const curtainTiming = {
  /** Fading to black. */
  cover: 420,
  /** Coming back. Slower than the cover — arriving somewhere should feel
      slower than leaving it. */
  reveal: 620,
  /** How long the screen stays black, per occasion. */
  hold: {
    /** Entering a dungeon: long enough for the shrine sting to land. */
    dungeonEnter: 900,
    /** A run ending. Long enough to read as an ending, not a stutter. */
    runEnd: 650,
    /** Back out to the menu. */
    toMenu: 420,
  },
} as const

/**
 * A battle does not fade — it cuts. The wipe is already over the field
 * before the first frame of the battle screen is painted, so the flash is
 * the transition rather than a decoration on top of one.
 */
export const battleWipe = {
  coverMs: 0,
  holdMs: 260,
  revealMs: 420,
} as const
