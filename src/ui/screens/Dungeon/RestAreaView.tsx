import type { Totem } from '@/domain/totem'
import { quoteRest } from '@/systems/restArea'

interface RestAreaViewProps {
  totem: Totem
  usesSoFar: number
  onRest: () => void
  onLeave: () => void
}

/**
 * The Rest Area. Once found it stays on the map for the rest of the run and
 * can be revisited from Standby; each use costs more than the last. Every
 * number shown here comes from the rest quote, never from the component.
 */
export function RestAreaView({ totem, usesSoFar, onRest, onLeave }: RestAreaViewProps) {
  const quote = quoteRest(totem, usesSoFar)

  return (
    <div className="panel rest-area">
      <h3>⛺ Rest Area</h3>
      {/* Flavor is the first thing to go on a short phone — the numbers
          below are what the player actually decides on. */}
      <p className="muted rest-flavor">A dry alcove and a banked fire. Someone left supplies — at a price.</p>

      <div className="stats-grid">
        <div className="stat-tile">
          <div className="faint">Restores</div>
          <div className="value">❤️ {quote.healAmount}</div>
        </div>
        <div className="stat-tile">
          <div className="faint">Price</div>
          <div className="value">💰 {quote.price}</div>
        </div>
        <div className="stat-tile">
          <div className="faint">You have</div>
          <div className="value">💰 {totem.money}</div>
        </div>
        <div className="stat-tile">
          <div className="faint">Next visit</div>
          <div className="value">💰 {quote.nextPrice}</div>
        </div>
      </div>

      <div className="hp-row">
        <span>
          ❤️ {totem.currentHp}/{totem.maxHp}
        </span>
        <span className="faint">Rested {usesSoFar}×</span>
      </div>

      {quote.blockedReason === 'full_hp' && <p className="faint">You're already at full health.</p>}
      {quote.blockedReason === 'too_expensive' && (
        <p className="faint">You can't afford to rest here yet.</p>
      )}

      <div className="btn-row">
        <button
          className="btn btn-primary btn-block"
          disabled={quote.blockedReason !== null}
          onClick={onRest}
        >
          Rest — 💰 {quote.price}
        </button>
      </div>
      <button className="btn btn-ghost btn-block" onClick={onLeave}>
        Leave
      </button>
    </div>
  )
}
