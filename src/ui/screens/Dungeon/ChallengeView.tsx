import { useMemo, useState } from 'react'
import type { Challenge } from '@/domain/challenge'
import { buildTileChallenge, assembledText, type AnswerTile } from '@/systems/tileAssembly'

interface ChallengeViewProps {
  challenge: Challenge
  /** The correct answer, cut into tiles for the player to reassemble. */
  answer: string
  /** Other answers in this run — cut the same way to supply decoy tiles. */
  decoyPool: string[]
  onSubmit: (text: string) => void
  submitLabel?: string
}

/**
 * English↔Korean vocabulary prompt answered by tapping tiles into order,
 * rather than typing. Removes typo and synonym false-negatives (the target
 * is the player's own saved answer, spelled out) and means no keyboard
 * ever opens mid-dungeon.
 */
export function ChallengeView({ challenge, answer, decoyPool, onSubmit, submitLabel = 'Answer' }: ChallengeViewProps) {
  const asksForKorean = challenge.direction === 'eng_to_kor'
  const kind = asksForKorean ? 'korean' : 'english'

  // Rebuilt only when the challenge changes — not on every timer tick,
  // which would reshuffle the tiles under the player's finger.
  const board = useMemo(
    () => buildTileChallenge(answer, kind, decoyPool),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [challenge.id],
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
    <div className="panel challenge-prompt">
      <div className="prompt-label">{asksForKorean ? 'Translate to Korean' : 'Translate to English'}</div>
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
          Clear
        </button>
        <button className="btn btn-primary btn-sm" disabled={picked.length === 0} onClick={submit}>
          {submitLabel}
        </button>
      </div>
    </div>
  )
}
