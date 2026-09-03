import type { DungeonRunState } from '@/domain/dungeon'
import type { Totem } from '@/domain/totem'
import type { SpellSet } from '@/domain/spellSet'
import { totemBalance, dungeonTiers } from '@/config/balance'
import { SlidePanel } from '@/ui/components/SlidePanel'
import { AssetImage } from '@/ui/components/AssetImage'
import { Bar } from '@/ui/components/Bar'

interface StatusPanelProps {
  totem: Totem
  run: DungeonRunState
  totemSet: SpellSet | null
  challenged: number
  onClose: () => void
}

export function StatusPanel({ totem, run, totemSet, challenged, onClose }: StatusPanelProps) {
  const xpNeeded = totemBalance.xpToNextLevel(totem.level)
  const tier = dungeonTiers.find((t) => t.id === run.config.tierId)

  return (
    <SlidePanel title="Status" onClose={onClose}>
      <section className="status-hero">
        <div className="status-portrait">
          <AssetImage category="totems" assetKey={totem.avatarKey} alt={totem.name} className="avatar-img avatar-hero" />
        </div>
        <div className="status-hero-body">
          <h2>{totem.name}</h2>
          <p className="muted">
            Level {totem.level} · ◆ {totem.lifePoints}/{totem.maxLifePoints} Life
          </p>
          <div className="hp-row">
            <span>❤️ {totem.currentHp}/{totem.maxHp}</span>
            <div style={{ flex: 1 }}>
              <Bar value={totem.currentHp} max={totem.maxHp} kind="hp" thin />
            </div>
          </div>
          <div className="hp-row">
            <span>✨ {totem.experience}/{xpNeeded}</span>
            <div style={{ flex: 1 }}>
              <Bar value={totem.experience} max={xpNeeded} kind="xp" thin />
            </div>
          </div>
        </div>
      </section>

      <section>
        <h3>This Run</h3>
        <div className="stats-grid">
          <div className="stat-tile">
            <div className="faint">Dungeon</div>
            <div className="value">{tier?.label ?? run.config.tierId}</div>
          </div>
          <div className="stat-tile">
            <div className="faint">Words Introduced</div>
            <div className="value">{challenged}/{run.config.dungeonWordIds.length}</div>
          </div>
          <div className="stat-tile">
            <div className="faint">Turn</div>
            <div className="value">{run.turn}</div>
          </div>
          <div className="stat-tile">
            <div className="faint">Foes Defeated</div>
            <div className="value">{run.stats.enemiesDefeated}</div>
          </div>
          <div className="stat-tile">
            <div className="faint">Correct</div>
            <div className="value">{run.stats.correctAnswers}</div>
          </div>
          <div className="stat-tile">
            <div className="faint">Incorrect</div>
            <div className="value">{run.stats.incorrectAnswers}</div>
          </div>
          <div className="stat-tile">
            <div className="faint">Money Earned</div>
            <div className="value">💰 {run.stats.moneyEarned}</div>
          </div>
          <div className="stat-tile">
            <div className="faint">Boss Door</div>
            <div className="value">{run.bossDoorFound ? (run.keyFound ? 'OPEN' : 'Locked') : 'Unknown'}</div>
          </div>
        </div>
      </section>

      <section>
        <h3>Overall</h3>
        <div className="stats-grid">
          <div className="stat-tile">
            <div className="faint">Money</div>
            <div className="value">💰 {totem.money}</div>
          </div>
          <div className="stat-tile">
            <div className="faint">Bosses Beaten</div>
            <div className="value">{totem.stats.bossesDefeated}</div>
          </div>
          <div className="stat-tile">
            <div className="faint">Dungeons Cleared</div>
            <div className="value">{totem.stats.dungeonsCompleted}</div>
          </div>
          <div className="stat-tile">
            <div className="faint">Battle Deck</div>
            <div className="value">{totemSet ? `${totemSet.spellIds.length} Spells` : 'None'}</div>
          </div>
        </div>
      </section>
    </SlidePanel>
  )
}
