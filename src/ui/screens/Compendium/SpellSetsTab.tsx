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
        + 새 주문 세트
      </button>

      {spellSets.length === 0 && (
        <div className="empty-state">
          <span className="glyph">🗂️</span>
          <p>아직 주문 세트가 없습니다. 주문을 세트로 묶어야 장착할 수 있습니다.</p>
        </div>
      )}

      {spellSets.map((set) => (
        <button key={set.id} className="card row" onClick={() => setEditing(set)} style={{ width: '100%', textAlign: 'left' }}>
          <div>
            <div style={{ fontWeight: 700 }}>{set.name}</div>
            <div className="faint">주문 {set.spellIds.length}개</div>
          </div>
          <span className="faint">편집 →</span>
        </button>
      ))}
    </div>
  )
}
