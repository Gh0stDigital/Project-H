import { useEffect, useState } from 'react'

interface TypewriterTextProps {
  lines: string[]
  charsPerSecond?: number
  /** Tapping anywhere on the box once the reveal is already complete. */
  onTapComplete?: () => void
  /** Fired once (whether by animation finishing or tap-to-skip) when the full text is shown. */
  onRevealed?: () => void
}

/**
 * Visual-novel style typewriter text. Tapping the box completes the current
 * reveal immediately rather than waiting out the animation.
 */
export function TypewriterText({ lines, charsPerSecond = 38, onTapComplete, onRevealed }: TypewriterTextProps) {
  const fullText = lines.join('\n')
  const [shown, setShown] = useState(0)
  const [revealedFired, setRevealedFired] = useState(false)

  useEffect(() => {
    setShown(0)
    setRevealedFired(false)
  }, [fullText])

  useEffect(() => {
    if (shown >= fullText.length) return
    const id = window.setTimeout(() => setShown((s) => s + 1), 1000 / charsPerSecond)
    return () => window.clearTimeout(id)
  }, [shown, fullText, charsPerSecond])

  const done = shown >= fullText.length

  useEffect(() => {
    if (done && !revealedFired) {
      setRevealedFired(true)
      onRevealed?.()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [done, revealedFired])

  function handleTap() {
    if (!done) {
      setShown(fullText.length)
    } else {
      onTapComplete?.()
    }
  }

  return (
    <div className="typewriter-box" onClick={handleTap} role="button" tabIndex={0}>
      <div style={{ whiteSpace: 'pre-wrap' }}>{fullText.slice(0, shown)}</div>
    </div>
  )
}
