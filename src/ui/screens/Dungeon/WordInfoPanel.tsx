import type { DungeonRunState } from '@/domain/dungeon'
import type { BattleState } from '@/domain/battle'
import { definitionsOf } from '@/domain/spell'
import { elementDefFor } from '@/config/wordTypes'
import { usePersistentStore } from '@/state/persistentStore'
import { SlidePanel } from '@/ui/components/SlidePanel'
import { Bar } from '@/ui/components/Bar'

interface WordInfoPanelProps {
  run: DungeonRunState
  battle: BattleState | null
  onClose: () => void
}

export function WordInfoPanel({ run, battle, onClose }: WordInfoPanelProps) {
  const spells = usePersistentStore((s) => s.spells)
  const spellSets = usePersistentStore((s) => s.spellSets)

  const dungeonSet = spellSets.find((s) => s.id === run.config.dungeonSpellSetId)
  const totemSet = spellSets.find((s) => s.id === run.config.totemSpellSetId)

  const dungeonSpells = run.config.dungeonWordIds.map((id) => spells.find((s) => s.id === id)).filter(Boolean)
  const totemSpells = (totemSet?.spellIds ?? []).map((id) => spells.find((s) => s.id === id)).filter(Boolean)

  return (
    <SlidePanel title="Word Information" onClose={onClose}>
      {battle?.plateau && (
        <section>
          <h3>Boss Barrier</h3>
          <div className="list">
            {battle.plateau.map((req) => {
              const spell = spells.find((s) => s.id === req.spellId)
              return (
                <div key={req.spellId} className="word-chip">
                  <span className={`status-dot ${req.cleared ? 'done' : 'pending'}`} />
                  <span style={{ flex: 1 }}>{spell?.korean ?? '?'}</span>
                  <span className="faint">{req.cleared ? 'Cleared' : 'Pending'}</span>
                </div>
              )
            })}
          </div>
        </section>
      )}

      <section>
        <h3>Dungeon Spell Set{dungeonSet ? ` — ${dungeonSet.name}` : ''}</h3>
        <div className="list">
          {dungeonSpells.map((spell) => (
            <div key={spell!.id} className="word-chip">
              <span className={`status-dot ${run.wordStats[spell!.id]?.introduced ? 'done' : 'pending'}`} />
              <span style={{ flex: 1 }}>
                {spell!.korean} <span className="faint">— {definitionsOf(spell!).join(', ')}</span>
              </span>
              <span title={elementDefFor(spell!.wordType).label}>{elementDefFor(spell!.wordType).icon}</span>
              <span className="faint">Lv{spell!.level}</span>
              <div style={{ width: 40 }}>
                <Bar value={spell!.charge} max={spell!.maxCharge} kind="charge" thin />
              </div>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h3>Totem Spell Set{totemSet ? ` — ${totemSet.name}` : ''}</h3>
        <div className="list">
          {totemSpells.map((spell) => (
            <div key={spell!.id} className="word-chip">
              <span style={{ flex: 1 }}>
                {spell!.korean} <span className="faint">— {definitionsOf(spell!).join(', ')}</span>
              </span>
              <span title={elementDefFor(spell!.wordType).label}>{elementDefFor(spell!.wordType).icon}</span>
              <span className="faint">Lv{spell!.level}</span>
              <div style={{ width: 40 }}>
                <Bar value={spell!.charge} max={spell!.maxCharge} kind="charge" thin />
              </div>
            </div>
          ))}
        </div>
      </section>
    </SlidePanel>
  )
}
