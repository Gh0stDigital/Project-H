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
        🔓 자물쇠를 열어 보기
      </button>
      <button className="btn btn-ghost btn-block" onClick={onLeave}>
        그냥 두기
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
          <span className="direction-duration faint">{c.durationMoves}번 이동 동안 지속</span>
        </button>
      ))}
    </div>
  )
}

export function KeyRoomView({ onTake }: { onTake: () => void }) {
  return (
    <>
      <div className="feedback-banner correct">🗝️ 던전 열쇠를 손에 넣었습니다.</div>
      <button className="btn btn-primary btn-block" onClick={onTake}>
        열쇠 집기
      </button>
    </>
  )
}

export function BossDoorNotice({ keyFound, onContinue }: { keyFound: boolean; onContinue: () => void }) {
  return (
    <>
      <div className={`feedback-banner ${keyFound ? 'correct' : ''}`}>
        {keyFound
          ? '열쇠를 가지고 있습니다. 준비되면 언제든 이 문은 열립니다.'
          : '열쇠 구멍이 비어 있습니다. 던전 열쇠가 필요합니다.'}
      </div>
      <button className="btn btn-primary btn-block" onClick={onContinue}>
        표시해 두고 계속 →
      </button>
    </>
  )
}

export function RewardSummary({ reward, onContinue }: { reward: RewardBundle; onContinue: () => void }) {
  return (
    <>
      <div className="reward-panel">
        <div className="reward-title">보상</div>
        <div className="reward-lines">
          {reward.lines.length === 0 ? (
            <span className="faint">쓸 만한 것은 없습니다.</span>
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
        계속 →
      </button>
    </>
  )
}
