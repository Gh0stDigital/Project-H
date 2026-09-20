/**
 * The opening: a closed book on a desk, and what happens when it is opened.
 *
 * Five beats, in order. Two of them wait on something outside the machine —
 * the player's tap, and the art finishing its decode — and the rest run on
 * their own clock. Keeping that distinction here rather than in the
 * component is the whole point of this file: the screen only has to ask
 * "how long is this beat, and what comes after it".
 */
export type TitlePhase = 'cover' | 'igniting' | 'flash' | 'awaken' | 'loading' | 'done'

/** The beats in order. `done` is terminal: the sequence is over and gone. */
const ORDER: readonly TitlePhase[] = ['cover', 'igniting', 'flash', 'awaken', 'loading', 'done']

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
  awaken: 1900,
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
    default:
      return null
  }
}

/** Whether the sequence is still covering the game underneath it. */
export function titleIsShowing(phase: TitlePhase): boolean {
  return phase !== 'done'
}
