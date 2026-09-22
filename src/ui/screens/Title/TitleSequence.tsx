import { useEffect, useState } from 'react'
import type React from 'react'
import { getAsset, hasAsset, type AssetCategory } from '@/config/assets'
import { audio } from '@/systems/audioEngine'
import { autosaveTime, usePersistentStore } from '@/state/persistentStore'
import { useUiStore } from '@/state/uiStore'
import {
  nextTitlePhase,
  titleFill,
  titleHasArrived,
  titleIsWaiting,
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
  const arrive = useUiStore((s) => s.arrive)
  const startNewGame = usePersistentStore((s) => s.startNewGame)
  const [phase, setPhase] = useState<TitlePhase>('cover')
  const [warning, setWarning] = useState(false)
  /**
   * Read once, at mount, and kept.
   *
   * The store writes on every change, so by the time the player reaches the
   * choice the app itself has usually saved — asking then would say "yes,
   * there is a save" even on a first launch. This is what was on disk before
   * this session touched anything.
   */
  const [existing] = useState<Date | null>(() => autosaveTime())
  /**
   * How tall each plate's file is relative to its width, once decoded.
   *
   * Only used to work out how much room the picture leaves for the binding.
   * Until a plate has loaded there is nothing on screen for the boards to
   * meet, and the fallback below keeps them at their minimum rather than
   * letting them jump when the number arrives.
   */
  const [aspect, setAspect] = useState<{ cover?: number; awaken?: number }>({})

  // Nothing to show: leave before the player ever sees a frame of it.
  useEffect(() => {
    if (!hasArt) onDone()
  }, [hasArt, onDone])

  // The menu is the player's now, even though the sequence is still on top
  // of it fading out. That is the moment the theme is allowed to start, so
  // it comes up with the menu rather than a second after it.
  useEffect(() => {
    if (titleHasArrived(phase) || !hasArt) arrive()
  }, [phase, hasArt, arrive])

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
      // Hand back to the machine rather than naming the next beat here:
      // one place decides the order, and this effect only decides when
      // loading is finished.
      setTimeout(() => { if (!cancelled) setPhase((ph) => nextTitlePhase(ph)) }, rest)
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
    audio.play('gameStart')
    setPhase('choosing')
  }

  /** Both answers sound the same, because both mean "this one, then". */
  function choose(fresh: boolean) {
    if (phase !== 'choosing') return
    audio.play('gameChoice')
    if (fresh) startNewGame()
    setPhase('igniting')
  }

  function askNewGame() {
    // Nothing to lose: no save, no question.
    if (!existing) return choose(true)
    audio.play('gameChoice')
    setWarning(true)
  }

  const onCover = titleIsWaiting(phase) || phase === 'igniting'

  return (
    <div
      className={`title-sequence phase-${phase}`}
      // The CSS and the state machine have to agree on how long these beats
      // are, so only one of them gets to decide.
      style={
        {
          '--title-fade-ms': `${titleTimings.fading}ms`,
          '--title-reveal-ms': `${titleTimings.revealing}ms`,
          // The painted height of each plate: its width on screen — the
          // viewport, since both files are taller than a phone is wide — times
          // how far it is scaled up, times its own proportions.
          '--cover-fill': `${titleFill.cover}`,
          '--awaken-fill': `${titleFill.awaken}`,
          '--cover-h': `calc(100vw * ${titleFill.cover} * ${aspect.cover ?? 1})`,
          '--awaken-h': `calc(100vw * ${titleFill.awaken} * ${aspect.awaken ?? 1})`,
        } as React.CSSProperties
      }
    >
      <Plate
        name="cover"
        src={getAsset('ui', 'cover')}
        hidden={!onCover}
        onAspect={(r) => setAspect((a) => (a.cover === r ? a : { ...a, cover: r }))}
      />
      <Plate
        name="awaken"
        src={getAsset('ui', 'awaken')}
        hidden={onCover}
        onAspect={(r) => setAspect((a) => (a.awaken === r ? a : { ...a, awaken: r }))}
      />

      {/* The boards and gilt the cover is held in. Sized in CSS from the same
          number the picture is scaled by, so it never needs to be told how
          much space was left over. */}
      <div className="title-frame" aria-hidden="true">
        <span className="title-corner tl" />
        <span className="title-corner tr" />
        <span className="title-corner bl" />
        <span className="title-corner br" />
      </div>

      <div className="title-white" />

      {phase === 'cover' && (
        <button className="title-start" onClick={start} autoFocus data-sfx="none">
          <span className="title-start-text">화면을 눌러 시작</span>
          <span className="title-start-sub">TAP TO START</span>
        </button>
      )}

      {phase === 'choosing' && !warning && (
        <div className="title-menu">
          <button className="title-option" onClick={askNewGame} autoFocus data-sfx="none">
            <span className="title-option-text">새 게임</span>
            <span className="title-option-sub">NEW GAME</span>
          </button>
          {/* Offered only when there is something to load. A button that
              says "continue" and then starts from nothing is worse than no
              button. */}
          {existing && (
            <button className="title-option" onClick={() => choose(false)} data-sfx="none">
              <span className="title-option-text">이어하기</span>
              <span className="title-option-sub">LOAD GAME · {savedWhen(existing)}</span>
            </button>
          )}
        </div>
      )}

      {phase === 'choosing' && warning && (
        <div className="title-menu title-warning">
          <p className="title-warning-text">
            저장된 기록이 있습니다 ({savedWhen(existing!)}).
            <br />새 게임을 시작하면 그 기록은 지워집니다.
          </p>
          <button className="title-option danger" onClick={() => choose(true)} data-sfx="none">
            <span className="title-option-text">지우고 새로 시작</span>
            <span className="title-option-sub">ERASE AND BEGIN</span>
          </button>
          {/* The safe answer takes the focus, not the destructive one: an
              Enter pressed out of habit should back out, not erase. */}
          <button
            className="title-option"
            onClick={() => { audio.play('cancel'); setWarning(false) }}
            autoFocus
            data-sfx="none"
          >
            <span className="title-option-text">돌아가기</span>
            <span className="title-option-sub">BACK</span>
          </button>
        </div>
      )}

      {/* Kept through the reveal so it fades out with the black rather than
          vanishing a beat before it. */}
      {(phase === 'loading' || phase === 'revealing') && (
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
 * The art is square-ish and the screen is a tall phone, so filling the screen
 * outright would throw away most of each picture. Instead the picture is
 * shown whole, scaled up to a point chosen per plate, and the space left over
 * at the top and bottom is the binding the whole thing sits in.
 *
 * `onAspect` reports the file's proportions once it has decoded. The boards
 * have to meet the painted edge, and where that edge falls depends on the
 * shape of the art — so it is measured rather than written down. A number in
 * the stylesheet would be correct until the day the art is replaced, which on
 * this screen has already happened twice.
 */
function Plate({
  name,
  src,
  hidden,
  onAspect,
}: {
  name: string
  src: string
  hidden: boolean
  onAspect: (ratio: number) => void
}) {
  return (
    <div className={`title-plate ${name}`} aria-hidden={hidden}>
      <img className="title-plate-blur" src={src} alt="" draggable={false} />
      <img
        className="title-plate-art"
        src={src}
        alt=""
        draggable={false}
        onLoad={(e) => {
          const img = e.currentTarget
          if (img.naturalWidth > 0) onAspect(img.naturalHeight / img.naturalWidth)
        }}
      />
    </div>
  )
}

/**
 * How long ago the save was written, in words.
 *
 * A timestamp would be precise and useless: what the player needs to know
 * before erasing it is whether this is the game they were playing an hour
 * ago or one they abandoned last year.
 */
function savedWhen(when: Date): string {
  const minutes = Math.floor((Date.now() - when.getTime()) / 60000)
  if (minutes < 1) return '방금'
  if (minutes < 60) return `${minutes}분 전`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}시간 전`
  return `${Math.floor(hours / 24)}일 전`
}
