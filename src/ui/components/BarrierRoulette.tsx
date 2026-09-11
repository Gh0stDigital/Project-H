import { useEffect, useRef, useState } from 'react'
import type { Spell } from '@/domain/spell'
import { attackCardClue } from '@/systems/battleEngine'
import { audio } from '@/systems/audioEngine'

/** How long the reel runs, and how quickly it slows down. */
const SPIN_MS = 1500
const FIRST_TICK_MS = 55
const LAST_TICK_MS = 260

interface BarrierRouletteProps {
  /** The words still holding the barrier up — what the reel may land on. */
  candidates: Spell[]
  total: number
  /** Decides the word, and is the authority on it: see dungeonStore. */
  onSpin: () => string | null
  /** Called once the reel has settled on that word. */
  onLanded: (spellId: string) => void
}

/**
 * The barrier picks the word, not the player.
 *
 * A Dungeon Spell Set of fifty words meant fifty cards in the hand, which is
 * not a hand — it is a list nobody can read on a phone, and the barrier is
 * the one fight where every word is selectable at once. So the choice goes
 * away: the wheel offers one of the requirements still standing, and the
 * player answers it. Nothing can be skipped and nothing has to be scrolled.
 *
 * The reel only ever animates towards a word the store has already chosen —
 * it is a way of showing a decision, not a way of making one.
 */
export function BarrierRoulette({ candidates, total, onSpin, onLanded }: BarrierRouletteProps) {
  const [index, setIndex] = useState(0)
  const [landed, setLanded] = useState<Spell | null>(null)
  const [spinning, setSpinning] = useState(false)
  const timers = useRef<number[]>([])

  useEffect(() => () => timers.current.forEach((id) => window.clearTimeout(id)), [])

  // A new set of candidates means a new turn: clear the previous result so
  // the reel does not sit showing the word that has just been answered.
  const signature = candidates.map((s) => s.id).join(',')
  const [lastSignature, setLastSignature] = useState(signature)
  if (lastSignature !== signature) {
    setLastSignature(signature)
    setLanded(null)
    setSpinning(false)
  }

  function spin() {
    if (spinning || candidates.length === 0) return
    const chosen = onSpin()
    if (!chosen) return
    const target = candidates.findIndex((s) => s.id === chosen)
    if (target < 0) return

    setSpinning(true)
    setLanded(null)
    timers.current.forEach((id) => window.clearTimeout(id))
    timers.current = []

    // Ease out by lengthening the gap between ticks rather than by moving a
    // wheel: the reel is a list of words, and easing the text swap is what
    // reads as slowing down.
    let elapsed = 0
    let step = 0
    while (elapsed < SPIN_MS) {
      const progress = elapsed / SPIN_MS
      const gap = FIRST_TICK_MS + (LAST_TICK_MS - FIRST_TICK_MS) * progress * progress
      const at = elapsed
      const face = step
      timers.current.push(
        window.setTimeout(() => {
          setIndex(face % Math.max(1, candidates.length))
          audio.play('diceRoll')
        }, at),
      )
      elapsed += gap
      step += 1
    }
    // Land on the word the store chose, whatever the reel happened to be
    // showing when it ran out of ticks.
    timers.current.push(
      window.setTimeout(() => {
        setIndex(target)
        setLanded(candidates[target])
        setSpinning(false)
        audio.play('discovery')
        onLanded(chosen)
      }, elapsed + 120),
    )
  }

  const showing = candidates[index % Math.max(1, candidates.length)] ?? null
  const remaining = candidates.length

  return (
    <div className="panel barrier-roulette">
      <div className="barrier-roulette-label">
        방벽이 단어를 고릅니다 — {total}개 중 {remaining}개 남음
      </div>

      <div className={`barrier-reel${spinning ? ' is-spinning' : ''}${landed ? ' is-landed' : ''}`}>
        <span className="barrier-reel-clue">{showing ? attackCardClue(showing.english) : '—'}</span>
      </div>

      <button
        className="btn btn-primary btn-block"
        data-sfx="none"
        onClick={spin}
        disabled={spinning || remaining === 0}
      >
        {spinning ? '돌아가는 중…' : '방벽 돌리기'}
      </button>
      <p className="faint" style={{ textAlign: 'center', margin: '6px 0 0' }}>
        아직 깨지지 않은 단어 중 하나가 나옵니다.
      </p>
    </div>
  )
}
