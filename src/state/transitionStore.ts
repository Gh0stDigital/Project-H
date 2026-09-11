import { create } from 'zustand'
import { curtainTiming } from '@/config/transitions'

/**
 * The screen curtain.
 *
 * One overlay, driven from here, so every hard cut in the game can become a
 * cover / hold / reveal instead: entering a dungeon, a battle starting, a run
 * ending. The point is not decoration — it is that the swap underneath
 * happens while nobody is looking, so a screen never has to be seen
 * half-built.
 *
 * The soundtrack reads `phase` too. Music that would start mid-transition
 * waits for the reveal to finish, which is why entering a dungeon is silence,
 * then the room, then the track — rather than the track starting over a black
 * screen.
 */

export type CurtainPhase = 'idle' | 'covering' | 'covered' | 'revealing'
export type CurtainKind = 'fade' | 'battle'

export interface CurtainOptions {
  kind?: CurtainKind
  /** Shown while the screen is covered. */
  label?: string | null
  coverMs?: number
  holdMs?: number
  revealMs?: number
  /** Runs once the screen is fully covered — swap what is underneath here. */
  onCovered?: () => void
}

interface TransitionStore {
  phase: CurtainPhase
  kind: CurtainKind
  label: string | null
  /** Duration of the phase currently running, for the CSS transition. */
  durationMs: number
  curtain(options?: CurtainOptions): Promise<void>
}

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))

/**
 * Which run owns the curtain. A second transition starting while one is in
 * flight takes it over, and the older one returns without touching the phase
 * again — otherwise its next step would undo the newer one's work.
 */
let sequence = 0

export const useTransitionStore = create<TransitionStore>()((set) => ({
  phase: 'idle',
  kind: 'fade',
  label: null,
  durationMs: curtainTiming.cover,

  async curtain(options = {}) {
    const mine = ++sequence
    const coverMs = options.coverMs ?? curtainTiming.cover
    const holdMs = options.holdMs ?? curtainTiming.hold.toMenu
    const revealMs = options.revealMs ?? curtainTiming.reveal

    set({ phase: 'covering', kind: options.kind ?? 'fade', label: options.label ?? null, durationMs: coverMs })
    await wait(coverMs)
    if (sequence !== mine) return

    set({ phase: 'covered' })
    try {
      options.onCovered?.()
    } catch {
      // Whatever went wrong underneath, the curtain still has to come up —
      // a thrown callback must not leave the player staring at a black
      // rectangle with no way out.
    }
    await wait(holdMs)
    if (sequence !== mine) return

    set({ phase: 'revealing', durationMs: revealMs })
    await wait(revealMs)
    if (sequence !== mine) return

    set({ phase: 'idle', label: null })
  },
}))

/** Fire a transition without reaching for the hook. */
export function curtain(options?: CurtainOptions): Promise<void> {
  return useTransitionStore.getState().curtain(options)
}

/** True while the screen is hidden, on its way there, or on its way back. */
export function curtainBusy(phase: CurtainPhase): boolean {
  return phase !== 'idle'
}
