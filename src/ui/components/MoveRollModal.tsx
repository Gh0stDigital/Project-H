import { useEffect, useState } from 'react'

const DIE_FACES = ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅']

/** How long the die tumbles before settling, and how fast faces cycle. */
const ROLL_MS = 900
const TICK_MS = 80

interface MoveRollModalProps {
  /** Shown once the die settles — the event the player just walked into. */
  resultTitle: string | null
  /** Fired once the die lands, so the parent can offer Continue. */
  onSettled: () => void
}

/**
 * Dice-roll overlay shown when the player chooses Move. Renders *inside*
 * the scene window (as an absolutely-positioned layer over the location
 * art) rather than as a full-screen sheet, so the roll reads as something
 * happening in the room itself. The die tumbles for a beat, settles, then
 * reveals what lies ahead. The Continue button is not part of this overlay:
 * it renders in the screen's normal action slot so every tappable control
 * stays in the same place.
 */
export function MoveRollModal({ resultTitle, onSettled }: MoveRollModalProps) {
  const [face, setFace] = useState(0)
  const [settled, setSettled] = useState(false)

  // Cycle faces while rolling.
  useEffect(() => {
    if (settled) return
    const id = window.setInterval(() => setFace((f) => (f + 1) % DIE_FACES.length), TICK_MS)
    return () => window.clearInterval(id)
  }, [settled])

  // Settle on a final face after the roll duration.
  useEffect(() => {
    const id = window.setTimeout(() => {
      setFace(Math.floor(Math.random() * DIE_FACES.length))
      setSettled(true)
      onSettled()
    }, ROLL_MS)
    return () => window.clearTimeout(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="move-roll-overlay">
      <div className="move-roll-label">{settled ? 'You press onward…' : 'Rolling…'}</div>
      <div className={`move-roll-die${settled ? ' settled' : ' rolling'}`} aria-live="polite">
        {DIE_FACES[face]}
      </div>
      {settled && resultTitle && <div className="move-roll-result">{resultTitle}</div>}
    </div>
  )
}
