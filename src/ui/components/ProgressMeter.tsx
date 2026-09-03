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
        Words seen: <b>{challenged}/{total}</b>
      </span>
      <span className={`boss-status ${bossUnlocked ? 'open' : 'locked'}`}>
        {bossUnlocked ? '🗝️ Key held' : '🔒 No key'}
      </span>
      {onOpenWordInfo && (
        <button className="btn btn-ghost btn-sm" onClick={onOpenWordInfo}>
          ℹ️ Words
        </button>
      )}
    </div>
  )
}
