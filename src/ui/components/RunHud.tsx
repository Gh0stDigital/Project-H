import type { DungeonRunState } from '@/domain/dungeon'
import type { Totem } from '@/domain/totem'
import { describeModifier } from '@/systems/directionModifiers'

interface RunHudProps {
  run: DungeonRunState
  totem: Totem
  /** Short label for the mode the player is currently in. */
  modeLabel: string
}

/**
 * The always-on run readout: what mode you're in, how deep you are, your
 * Life Points and money, whether the key and Boss Door are accounted for,
 * and which Direction biases are still running. Kept to two compact rows so
 * it can sit above every dungeon state without changing the layout.
 */
export function RunHud({ run, totem, modeLabel }: RunHudProps) {
  return (
    <div className="run-hud">
      <div className="run-hud-row">
        <span className="run-hud-mode">{modeLabel}</span>
        <span className="run-hud-turn">Turn {run.turn}</span>
        <span className="run-hud-life" title="Life Points">
          {'◆'.repeat(Math.max(0, totem.lifePoints))}
          <span className="faint">{'◇'.repeat(Math.max(0, totem.maxLifePoints - totem.lifePoints))}</span>
        </span>
        <span className="run-hud-money">💰 {totem.money}</span>
      </div>

      <div className="run-hud-row secondary">
        <span className={`run-hud-chip ${run.keyFound ? 'on' : 'off'}`}>
          {run.keyFound ? '🗝️ Key' : '🗝️ No key'}
        </span>
        <span className={`run-hud-chip ${run.bossDoorFound ? 'on' : 'off'}`}>
          {run.bossDoorFound ? '🚪 Door found' : '🚪 Door unknown'}
        </span>
        {run.modifiers.length === 0 ? (
          <span className="run-hud-chip faint">No path effects</span>
        ) : (
          run.modifiers.map((m) => (
            <span key={m.id} className="run-hud-chip mod" title={m.label}>
              {describeModifier(m)} · {m.movesRemaining}
            </span>
          ))
        )}
      </div>
    </div>
  )
}
