import { useMemo, useState } from 'react'
import type { Challenge } from '@/domain/challenge'
import type { TimerState } from '@/domain/battle'
import { Bar } from '@/ui/components/Bar'
import { usePersistentStore } from '@/state/persistentStore'
import { buildTileChallenge, assembledText, type AnswerTile } from '@/systems/tileAssembly'

interface ChallengeViewProps {
  challenge: Challenge
  /** The correct answer, cut into tiles for the player to reassemble. */
  answer: string
  /** Other answers in this run — cut the same way to supply decoy tiles. */
  decoyPool: string[]
  onSubmit: (text: string) => void
  submitLabel?: string
  /**
   * Countdown for a timed prompt, drawn inside the panel.
   *
   * It used to sit in the view behind this one, where the panel covered it:
   * the enemy would start counting down and the only thing on screen was
   * the question. A timer the player cannot see is not a timer.
   */
  timer?: TimerState | null
}

/**
 * English↔Korean vocabulary prompt answered by tapping tiles into order,
 * rather than typing. Removes typo and synonym false-negatives (the target
 * is the player's own saved answer, spelled out) and means no keyboard
 * ever opens mid-dungeon.
 */
export function ChallengeView({ challenge, answer, decoyPool, onSubmit, submitLabel = '정답', timer = null }: ChallengeViewProps) {
  const asksForKorean = challenge.direction === 'eng_to_kor'
  const kind = asksForKorean ? 'korean' : 'english'
  // Only affects the English direction; Korean is syllables either way.
  const mode = usePersistentStore((s) => s.settings.englishAnswerMode)

  // Rebuilt only when the challenge changes — not on every timer tick,
  // which would reshuffle the tiles under the player's finger.
  const board = useMemo(
    () => buildTileChallenge(answer, kind, decoyPool, Math.random, mode),
    // Rebuilt when the prompt changes, or when the answer mode is switched
    // between runs — not on every render, which would reshuffle the tiles
    // under the player's finger.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [challenge.id, mode],
  )

  const [picked, setPicked] = useState<AnswerTile[]>([])

  // A multi-word enemy attack reuses this component for each prompt in the
  // volley, so the tiles placed for the previous word must be cleared when
  // the challenge changes — otherwise they linger in the answer row and the
  // new board can never be assembled.
  const [lastChallengeId, setLastChallengeId] = useState(challenge.id)
  if (lastChallengeId !== challenge.id) {
    setLastChallengeId(challenge.id)
    setPicked([])
  }

  const pickedIds = new Set(picked.map((t) => t.id))
  const assembled = assembledText(picked, board.joiner)

  function submit() {
    if (picked.length > 0) onSubmit(assembled)
  }

  return (
    <div className={`panel challenge-prompt${board.granularity === 'whole' ? ' choice-board' : ''}`}>
      {timer && (
        <div className="timer-row prompt-timer">
          <span>⏱ {Math.ceil(timer.remainingSeconds)}s</span>
          <div style={{ flex: 1 }}>
            <Bar value={timer.remainingSeconds} max={timer.totalSeconds} kind="timer" thin />
          </div>
        </div>
      )}
      <div className="prompt-label">{asksForKorean ? '한국어로 번역하세요' : '영어로 번역하세요'}</div>
      <div className="prompt-word" lang={asksForKorean ? 'en' : 'ko'}>
        {challenge.prompt}
      </div>

      {/* What the player has built so far — tap a piece to take it back. */}
      <div className="tile-answer" lang={asksForKorean ? 'ko' : 'en'}>
        {picked.map((tile) => (
          <button
            key={tile.id}
            className="answer-tile placed"
            onClick={() => setPicked((p) => p.filter((t) => t.id !== tile.id))}
          >
            {tile.text}
          </button>
        ))}
        {Array.from({ length: Math.max(0, board.answerLength - picked.length) }, (_, i) => (
          <span key={`slot-${i}`} className="answer-slot" />
        ))}
      </div>

      <div className="tile-tray" lang={asksForKorean ? 'ko' : 'en'}>
        {board.tiles.map((tile) => (
          <button
            key={tile.id}
            className="answer-tile"
            disabled={pickedIds.has(tile.id)}
            onClick={() => setPicked((p) => [...p, tile])}
          >
            {tile.text}
          </button>
        ))}
      </div>

      <div className="tile-actions">
        <button className="btn btn-ghost btn-sm" disabled={picked.length === 0} onClick={() => setPicked([])}>
          지우기
        </button>
        <button className="btn btn-primary btn-sm" disabled={picked.length === 0} onClick={submit}>
          {submitLabel}
        </button>
      </div>
    </div>
  )
}
