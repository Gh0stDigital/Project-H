import { useEffect, useRef, useState } from 'react'

/**
 * True for a moment after `value` drops.
 *
 * Drives the hit cue: HP is the only thing the UI needs to watch, so any
 * source of damage — an attack, a trap, a mimic — animates without the
 * systems layer having to announce it. Only decreases count, so healing at
 * a Rest Area never reads as being hurt.
 */
export function useDamageFlash(value: number, durationMs = 420): boolean {
  const previous = useRef(value)
  const [hit, setHit] = useState(false)

  useEffect(() => {
    const dropped = value < previous.current
    previous.current = value
    if (!dropped) return

    // Restart cleanly when hits land back to back, rather than letting the
    // first one's timer cut the second one short.
    setHit(false)
    const start = window.setTimeout(() => setHit(true), 0)
    const end = window.setTimeout(() => setHit(false), durationMs)
    return () => {
      window.clearTimeout(start)
      window.clearTimeout(end)
    }
  }, [value, durationMs])

  return hit
}
