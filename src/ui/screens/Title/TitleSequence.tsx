import { useEffect, useState } from 'react'
import { getAsset, hasAsset, type AssetCategory } from '@/config/assets'
import { audio } from '@/systems/audioEngine'
import {
  nextTitlePhase,
  titlePhaseMs,
  titleTimings,
  type TitlePhase,
} from '@/systems/titleSequence'

interface TitleSequenceProps {
  /** Called once, when the sequence is over and the menu should take over. */
  onDone: () => void
}

/** Art the menu needs the instant the sequence lifts, decoded while it runs. */
const PRELOAD: ReadonlyArray<readonly [AssetCategory, string]> = [
  ['ui', 'title'],
  ['icons', 'BookIcon'],
  ['icons', 'totemIcon'],
  ['icons', 'keyIcon'],
  ['icons', 'chartIcon'],
]

/**
 * The opening: a book on a desk, a tap, and what the book lets out.
 *
 * It renders above everything and hands over when it is finished, so the app
 * underneath is mounted and settled the whole time — which is what makes the
 * loading beat honest rather than decorative. It really is decoding the
 * menu's art, and it really does wait for it.
 *
 * The whole thing is optional. With no cover art in the folder there is
 * nothing to open, so the sequence reports itself done before its first
 * paint and the player goes straight to the menu, the same way every other
 * art slot in the game degrades.
 */
export function TitleSequence({ onDone }: TitleSequenceProps) {
  const hasArt = hasAsset('ui', 'cover') && hasAsset('ui', 'awaken')
  const [phase, setPhase] = useState<TitlePhase>('cover')

  // Nothing to show: leave before the player ever sees a frame of it.
  useEffect(() => {
    if (!hasArt) onDone()
  }, [hasArt, onDone])

  // The self-timed beats. `cover` waits for the tap and `loading` waits for
  // the art, so neither returns a duration and neither schedules anything.
  useEffect(() => {
    const ms = titlePhaseMs(phase)
    if (ms === null) return
    const id = setTimeout(() => setPhase((p) => nextTitlePhase(p)), ms)
    return () => clearTimeout(id)
  }, [phase])

  // The loading beat: decode the menu's art, then wait out whatever is left
  // of the minimum so a fast device does not flash a single frame of it.
  useEffect(() => {
    if (phase !== 'loading') return
    let cancelled = false
    const started = Date.now()

    const decoded = PRELOAD.filter(([c, k]) => hasAsset(c, k)).map(
      ([category, key]) =>
        new Promise<void>((resolve) => {
          const img = new Image()
          // A slot that fails to decode must not strand the player on the
          // loading screen, so failure resolves exactly like success.
          img.onload = img.onerror = () => resolve()
          img.src = getAsset(category, key)
        }),
    )

    void Promise.all(decoded).then(() => {
      if (cancelled) return
      const held = Date.now() - started
      const rest = Math.max(0, titleTimings.minLoading - held)
      setTimeout(() => { if (!cancelled) setPhase('done') }, rest)
    })
    return () => { cancelled = true }
  }, [phase])

  useEffect(() => {
    if (phase === 'done') onDone()
  }, [phase, onDone])

  if (!hasArt || phase === 'done') return null

  function start() {
    if (phase !== 'cover') return
    // The tap is also the gesture that unlocks audio, so the sting lands on
    // the same frame the book catches light.
    audio.unlock()
    audio.play('bossDoor')
    setPhase('igniting')
  }

  const onCover = phase === 'cover' || phase === 'igniting'

  return (
    <div className={`title-sequence phase-${phase}`}>
      <Plate name="cover" src={getAsset('ui', 'cover')} hidden={!onCover} />
      <Plate name="awaken" src={getAsset('ui', 'awaken')} hidden={onCover} />

      <div className="title-white" />

      {phase === 'cover' && (
        <button className="title-start" onClick={start} autoFocus data-sfx="none">
          <span className="title-start-text">화면을 눌러 시작</span>
          <span className="title-start-sub">TAP TO START</span>
        </button>
      )}

      {phase === 'loading' && (
        <div className="title-loading">
          <span className="title-loading-text">불러오는 중…</span>
          <span className="title-loading-bar" />
        </div>
      )}
    </div>
  )
}

/**
 * One full-screen still.
 *
 * The art is square-ish and the screen is a tall phone, so cropping to fill
 * would throw away most of each picture — on the cover that is the desk, the
 * figurine and the dice, which is the half that says what kind of game this
 * is. Instead the picture is shown whole and the space left over is filled
 * with a blown-up, blurred copy of itself: no letterbox bars, and nothing
 * lost out of frame. Both layers are the same `src`, so it is one decode.
 */
function Plate({ name, src, hidden }: { name: string; src: string; hidden: boolean }) {
  return (
    <div className={`title-plate ${name}`} aria-hidden={hidden}>
      <img className="title-plate-blur" src={src} alt="" draggable={false} />
      <img className="title-plate-art" src={src} alt="" draggable={false} />
    </div>
  )
}
