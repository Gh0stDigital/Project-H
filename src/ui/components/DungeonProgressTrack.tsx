interface DungeonProgressTrackProps {
  challenged: number
  total: number
  bossUnlocked: boolean
}

/** Fixed number of waypoint markers along the track, independent of the
 * dungeon's actual word count — keeps the map readable whether the pool
 * is 10 words or 50. */
const CHECKPOINT_COUNT = 6

/**
 * A winding, map-style progress track for the current dungeon run — a
 * trail of waypoints leading to a boss gate, filling in as words get
 * challenged. Sits above the scene image as a "where am I on this run"
 * readout, distinct from the plain Words-challenged counter below it.
 */
export function DungeonProgressTrack({ challenged, total, bossUnlocked }: DungeonProgressTrackProps) {
  const fraction = total > 0 ? Math.min(1, challenged / total) : 0
  const clearedCheckpoints = Math.round(fraction * CHECKPOINT_COUNT)

  return (
    <div className="dungeon-track" role="img" aria-label={`Dungeon progress: ${challenged} of ${total} words challenged`}>
      <div className="dungeon-track-line">
        <div className="dungeon-track-fill" style={{ width: `${fraction * 100}%` }} />
        <div className="dungeon-track-marker" style={{ left: `${fraction * 100}%` }} aria-hidden="true" />
      </div>
      <div className="dungeon-track-nodes">
        {Array.from({ length: CHECKPOINT_COUNT }, (_, i) => (
          <span key={i} className={`dungeon-track-node${i < clearedCheckpoints ? ' cleared' : ''}`} />
        ))}
        <span className={`dungeon-track-node boss ${bossUnlocked ? 'open' : 'locked'}`}>{bossUnlocked ? '⚔️' : '🔒'}</span>
      </div>
    </div>
  )
}
