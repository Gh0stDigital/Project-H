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
 * `igniting` is the book catching light under the finger that just touched
 * it; `flash` is the white at the top of that, brief enough to read as an
 * impact rather than a blank screen; `awaken` is the long look at what the
 * book let out, which is the shot worth holding.
 */
export const titleTimings = {
  igniting: 900,
  flash: 260,
  awaken: 2000,
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
