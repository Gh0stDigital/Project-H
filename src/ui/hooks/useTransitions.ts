import { useLayoutEffect, useRef } from 'react'
import { battleWipe, curtainTiming } from '@/config/transitions'
import { curtain } from '@/state/transitionStore'
import { useDungeonStore } from '@/state/dungeonStore'

/**
 * Covers the screen for the changes the player does not ask for directly.
 *
 * Entering a dungeon and leaving the results screen are buttons, so those
 * start their own transition at the tap and swap the screen while it is
 * covered. A battle starting and a run ending are not: they fall out of a
 * dice roll or a killing blow, and by the time this hook can react the new
 * screen is already committed.
 *
 * Hence useLayoutEffect. It runs after the commit but before the browser
 * paints, so the curtain is already opaque on the frame the battle screen
 * first exists — the player sees the field, then the flash, then the battle,
 * never a frame of battle before the flash.
 */
export function useTransitions(): void {
  const battle = useDungeonStore((s) => s.battle)
  const screenPhase = useDungeonStore((s) => s.screenPhase)

  const previous = useRef({ battle: false, screenPhase: 'config' as string })

  useLayoutEffect(() => {
    const inBattle = battle !== null
    if (inBattle && !previous.current.battle) {
      void curtain({ kind: 'battle', ...battleWipe })
    }
    previous.current.battle = inBattle
  }, [battle])

  useLayoutEffect(() => {
    if (screenPhase === 'results' && previous.current.screenPhase === 'run') {
      void curtain({ coverMs: 0, holdMs: curtainTiming.hold.runEnd })
    }
    previous.current.screenPhase = screenPhase
  }, [screenPhase])
}
