import { useState } from 'react'
import type { SpellSet } from '@/domain/spellSet'
import { usePersistentStore } from '@/state/persistentStore'
import { SpellSetEditor } from './SpellSetEditor'

export function SpellSetsTab() {
  const spellSets = usePersistentStore((s) => s.spellSets)
  const [editing, setEditing] = useState<'new' | SpellSet | null>(null)

  if (editing) {
    return (
      <SpellSetEditor
        existing={editing === 'new' ? undefined : editing}
        onDone={() => setEditing(null)}
        onCancel={() => setEditing(null)}
      />
    )
  }

  return (
    <div className="list">
      <button className="btn btn-primary btn-block" onClick={() => setEditing('new')}>
        + New Spell Set
      </button>

      {spellSets.length === 0 && (
        <div className="empty-state">
          <span className="glyph">🗂️</span>
          <p>No Spell Sets yet. Group your Spells into a set to equip them.</p>
        </div>
      )}

      {spellSets.map((set) => (
        <button key={set.id} className="card row" onClick={() => setEditing(set)} style={{ width: '100%', textAlign: 'left' }}>
          <div>
            <div style={{ fontWeight: 700 }}>{set.name}</div>
            <div className="faint">{set.spellIds.length} Spells</div>
          </div>
          <span className="faint">Edit →</span>
        </button>
      ))}
    </div>
  )
}
