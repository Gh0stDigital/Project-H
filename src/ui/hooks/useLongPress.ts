import { useCallback, useEffect, useRef, useState } from 'react'
import type { MouseEvent as ReactMouseEvent, PointerEvent as ReactPointerEvent } from 'react'

/** How long the button has to be held before the second action fires. */
export const LONG_PRESS_MS = 450

interface LongPressOptions {
  /** Fires once the press has been held for {@link LONG_PRESS_MS}. */
  onLongPress: () => void
  /** Fires on release, but only when the long press did not. */
  onTap: () => void
  /** When false the control is an ordinary button: every press is a tap. */
  enabled?: boolean
}

/**
 * One control, two actions: tap for the usual thing, hold for the other one.
 *
 * The long press fires on the timer rather than on release, so the player
 * feels the menu arrive under their thumb instead of having to guess how
 * long is long enough. That has two consequences the caller gets for free:
 *
 * - The release that follows must not also count as a tap, which is what
 *   `fired` guards. `onClick` is still where the tap is handled, so a
 *   keyboard Enter/Space keeps working on a control that never sees a
 *   pointer at all.
 * - Whatever the long press opened is now under the finger, and the release
 *   lands on it. Anything that dismisses on *pointer down* is safe; anything
 *   that dismisses on click has to ignore that first one.
 *
 * `holding` is exposed so the control can show the press filling up — with
 * no feedback, a hold that has not yet fired is indistinguishable from a
 * button that is ignoring you.
 */
export function useLongPress({ onLongPress, onTap, enabled = true }: LongPressOptions) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const fired = useRef(false)
  const [holding, setHolding] = useState(false)

  const cancel = useCallback(() => {
    if (timer.current !== null) {
      clearTimeout(timer.current)
      timer.current = null
    }
    setHolding(false)
  }, [])

  // A press interrupted by an unmount (the screen changing under it) would
  // otherwise fire its timer into a component that is gone.
  useEffect(() => cancel, [cancel])

  const onPointerDown = useCallback(
    (e: ReactPointerEvent<HTMLElement>) => {
      // Secondary buttons open the same menu outright — a mouse should not
      // have to be held down to reach what a thumb reaches by holding.
      if (!enabled || e.button !== 0) return
      fired.current = false
      setHolding(true)
      timer.current = setTimeout(() => {
        timer.current = null
        fired.current = true
        setHolding(false)
        onLongPress()
      }, LONG_PRESS_MS)
    },
    [enabled, onLongPress],
  )

  const onClick = useCallback(() => {
    if (fired.current) {
      fired.current = false
      return
    }
    onTap()
  }, [onTap])

  const onContextMenu = useCallback(
    (e: ReactMouseEvent<HTMLElement>) => {
      if (!enabled) return
      // The desktop equivalent of the hold, and on touch it suppresses the
      // browser's own long-press menu, which would otherwise cover ours.
      e.preventDefault()
      cancel()
      fired.current = true
      onLongPress()
    },
    [cancel, enabled, onLongPress],
  )

  return {
    holding,
    handlers: {
      onPointerDown,
      onPointerUp: cancel,
      onPointerLeave: cancel,
      onPointerCancel: cancel,
      onClick,
      onContextMenu,
    },
  }
}
