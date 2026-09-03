import type { DirectionChoice, RewardBundle } from '@/domain/dungeon'

/**
 * The small, purely presentational panels for the events that are a choice
 * rather than a puzzle: treasure approach, direction fork, key room, boss
 * door and the reward summary. All logic lives in the store.
 */

export function TreasureChoice({ onAttempt, onLeave }: { onAttempt: () => void; onLeave: () => void }) {
  return (
    <>
      <button className="btn btn-primary btn-block" onClick={onAttempt}>
        🔓 Attempt the lock
      </button>
      <button className="btn btn-ghost btn-block" onClick={onLeave}>
        Leave it
      </button>
    </>
  )
}

export function DirectionChoices({
  choices,
  onChoose,
}: {
  choices: DirectionChoice[]
  onChoose: (c: DirectionChoice) => void
}) {
  return (
    <div className="direction-list">
      {choices.map((c) => (
        <button key={c.id} className="direction-card" onClick={() => onChoose(c)}>
          <span className="direction-name">{c.label}</span>
          {/* Thematic clue only — never the raw weights. */}
          <span className="direction-flavor faint">{c.flavor}</span>
          <span className="direction-duration faint">Lasts {c.durationMoves} moves</span>
        </button>
      ))}
    </div>
  )
}

export function KeyRoomView({ onTake }: { onTake: () => void }) {
  return (
    <>
      <div className="feedback-banner correct">🗝️ The dungeon key is yours.</div>
      <button className="btn btn-primary btn-block" onClick={onTake}>
        Take the key
      </button>
    </>
  )
}

export function BossDoorNotice({ keyFound, onContinue }: { keyFound: boolean; onContinue: () => void }) {
  return (
    <>
      <div className={`feedback-banner ${keyFound ? 'correct' : ''}`}>
        {keyFound
          ? 'You have the key. This door will open whenever you are ready.'
          : 'The keyhole is empty. You will need the dungeon key.'}
      </div>
      <button className="btn btn-primary btn-block" onClick={onContinue}>
        Mark it and continue →
      </button>
    </>
  )
}

export function RewardSummary({ reward, onContinue }: { reward: RewardBundle; onContinue: () => void }) {
  return (
    <>
      <div className="reward-panel">
        <div className="reward-title">Rewards</div>
        <div className="reward-lines">
          {reward.lines.length === 0 ? (
            <span className="faint">Nothing of value.</span>
          ) : (
            reward.lines.map((line, i) => (
              <span key={i} className="reward-line">
                {line}
              </span>
            ))
          )}
        </div>
      </div>
      <button className="btn btn-primary btn-block" onClick={onContinue}>
        Continue →
      </button>
    </>
  )
}
