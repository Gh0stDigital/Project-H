import { UiIcon } from './UiIcon'

interface ProgressMeterProps {
  challenged: number
  total: number
  /** True once the dungeon key is in hand — the real gate on the boss. */
  bossUnlocked: boolean
  onOpenWordInfo?: () => void
}

export function ProgressMeter({ challenged, total, bossUnlocked, onOpenWordInfo }: ProgressMeterProps) {
  return (
    <div className="progress-meter">
      <span>
        접한 단어 <b>{challenged}/{total}</b>
      </span>
      <span className={`boss-status ${bossUnlocked ? 'open' : 'locked'}`}>
        {bossUnlocked ? <><UiIcon name="key" size={12} /> 열쇠 있음</> : '🔒 열쇠 없음'}
      </span>
      {onOpenWordInfo && (
        <button className="btn btn-ghost btn-sm" onClick={onOpenWordInfo}>
          ℹ️ 단어
        </button>
      )}
    </div>
  )
}
