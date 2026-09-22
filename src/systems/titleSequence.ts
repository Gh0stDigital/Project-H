/**
 * The opening: a closed book on a desk, and what happens when it is opened.
 *
 * Seven beats, in order. Two of them wait on something outside the machine —
 * the player's tap, and the art finishing its decode — and the rest run on
 * their own clock. Keeping that distinction here rather than in the
 * component is the whole point of this file: the screen only has to ask
 * "how long is this beat, and what comes after it".
 */
export type TitlePhase =
  | 'cover'
  | 'choosing'
  | 'igniting'
  | 'flash'
  | 'awaken'
  | 'fading'
  | 'loading'
  | 'revealing'
  | 'done'

/** The beats in order. `done` is terminal: the sequence is over and gone. */
const ORDER: readonly TitlePhase[] = [
  'cover',
  'choosing',
  'igniting',
  'flash',
  'awaken',
  'fading',
  'loading',
  'revealing',
  'done',
]

/**
 * How long each self-timed beat lasts.
 *
 * `choosing` is missing on purpose, like `cover`: it waits for the player to
 * pick New Game or Load Game, and a duration would carry them past the
 * choice without one.
 *
 * `igniting` is the book catching light under the finger that just touched
 * it; `flash` is the white at the top of that, brief enough to read as an
 * impact rather than a blank screen; `awaken` is the long look at what the
 * book let out, which is the shot worth holding.
 */
export const titleTimings = {
  igniting: 900,
  flash: 260,
  /**
   * The long look at what the book let out.
   *
   * The shot worth holding, and the only beat here whose length is a matter
   * of taste rather than of mechanics: it is a picture with a lot in it — a
   * scholar, a spell, an inset of somewhere else — and two seconds was not
   * enough to find the inset before it went.
   */
  awaken: 4000,
  /** The picture going out, so the loading screen arrives on black. */
  fading: 700,
  /**
   * The menu coming up underneath.
   *
   * Slower than the fade out. Going dark is punctuation and can be brisk;
   * arriving somewhere is not, and a menu that snaps in undoes the two
   * seconds of quiet that were just bought.
   */
  revealing: 1000,
  /**
   * Not how long loading takes — that depends on the device — but how long
   * it is allowed to be invisible for. Under this, a fast machine shows a
   * frame of loading screen and rips it away again, which reads as a glitch.
   */
  minLoading: 700,
} as const

/**
 * How far past its natural size each still is pushed.
 *
 * Shown whole, a plate reaches less than half a phone's height, because both
 * files are squarish and a phone is not. Filling the screen outright costs
 * more than half the picture's width. These are the compromise, one per
 * plate because the two have different proportions and different things in
 * their corners — and what is left over at the top and bottom is not waste
 * but the binding the book sits in, so there is no reason to push either to
 * the edge.
 *
 * Here rather than in the stylesheet because the screen needs them too: the
 * boards are sized from the same numbers, and two copies would drift apart
 * the first time one was touched.
 */
export const titleFill = {
  /** Square. Past 1.7 the stitched cords down the right edge start to go. */
  cover: 1.55,
  /** 4:5, so it already stands taller on the same number. */
  awaken: 1.4,
} as const

export function nextTitlePhase(phase: TitlePhase): TitlePhase {
  const i = ORDER.indexOf(phase)
  return i < 0 || i === ORDER.length - 1 ? 'done' : ORDER[i + 1]
}

/**
 * How long to stay on a beat, or null when something else decides.
 *
 * `cover` waits for the tap and `loading` waits for the art; neither has a
 * duration the machine can know.
 */
export function titlePhaseMs(phase: TitlePhase): number | null {
  switch (phase) {
    case 'igniting':
      return titleTimings.igniting
    case 'flash':
      return titleTimings.flash
    case 'awaken':
      return titleTimings.awaken
    case 'fading':
      return titleTimings.fading
    case 'revealing':
      return titleTimings.revealing
    default:
      return null
  }
}

/**
 * The beats the player is being asked something in.
 *
 * Both of them wait: the first for a tap, the second for which game to play.
 * Nothing in the opening may run itself forward while one is on screen.
 */
export function titleIsWaiting(phase: TitlePhase): boolean {
  return phase === 'cover' || phase === 'choosing'
}

/** Whether the sequence is still covering the game underneath it. */
export function titleIsShowing(phase: TitlePhase): boolean {
  return phase !== 'done'
}

/**
 * Whether the menu underneath is already on show.
 *
 * True through the last beat, where the sequence is fading out over a menu
 * the player can see: it is 'arriving at the menu' rather than 'still in the
 * opening', which is what decides when the music is allowed to start.
 */
export function titleHasArrived(phase: TitlePhase): boolean {
  return phase === 'revealing' || phase === 'done'
}
