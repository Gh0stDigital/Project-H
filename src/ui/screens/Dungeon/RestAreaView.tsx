import type { Totem } from '@/domain/totem'
import type { RewardBundle } from '@/domain/dungeon'
import type { RestNpc } from '@/systems/restNpcs'
import { quoteRest } from '@/systems/restArea'
import { AssetImage } from '@/ui/components/AssetImage'

interface RestAreaViewProps {
  totem: Totem
  usesSoFar: number
  npcs: RestNpc[]
  /** The last exchange, kept on screen until the player leaves. */
  said: { npcId: string; reward: RewardBundle } | null
  onTalk: (npcId: string) => void
  onRest: () => void
  onLeave: () => void
}

/**
 * The Rest Area. Once found it stays on the map for the rest of the run and
 * can be revisited from Standby; each use costs more than the last. Every
 * number shown here comes from the rest quote, never from the component.
 */
export function RestAreaView({ totem, usesSoFar, npcs, said, onTalk, onRest, onLeave }: RestAreaViewProps) {
  const quote = quoteRest(totem, usesSoFar)
  const speaking = said ? npcs.find((n) => n.id === said.npcId) : null

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

      {npcs.length > 0 && (
        <div className="npc-section">
          <div className="npc-heading">
            Others here <span className="faint">· {npcs.filter((n) => !n.spoken).length} to speak to</span>
          </div>

          <div className="npc-row">
            {npcs.map((npc) => (
              <button
                key={npc.id}
                className={`npc-card${npc.spoken ? ' spoken' : ''}${said?.npcId === npc.id ? ' active' : ''}`}
                onClick={() => onTalk(npc.id)}
                disabled={npc.spoken}
              >
                <AssetImage category="npcs" assetKey={npc.avatarKey} alt={npc.name} className="npc-portrait" />
                <span className="npc-name">{npc.name}</span>
                <span className="faint npc-state">{npc.spoken ? 'Spoken' : 'Talk'}</span>
              </button>
            ))}
          </div>

          {speaking && (
            // Their line is one of the player's own sample sentences, which
            // is the point: your examples come back at you in the dungeon.
            <div className="npc-speech" key={speaking.id}>
              <div className="npc-speech-name">{speaking.name}</div>
              <p className="npc-line" lang="ko">
                {speaking.line}
              </p>
              {speaking.translation && <p className="npc-translation faint">{speaking.translation}</p>}
              <div className="npc-gift">
                {said && (said.reward.money > 0 || said.reward.lines.length > 0) ? (
                  <>Gave you {said.reward.lines.join(' · ')}</>
                ) : (
                  <span className="faint">They had nothing to spare.</span>
                )}
              </div>
            </div>
          )}
        </div>
      )}
      <button className="btn btn-ghost btn-block" onClick={onLeave}>
        Leave
      </button>
    </div>
  )
}
