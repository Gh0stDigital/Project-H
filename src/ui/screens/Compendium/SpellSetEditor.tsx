import { useState } from 'react'
import type { SpellSet } from '@/domain/spellSet'
import { usePersistentStore } from '@/state/persistentStore'

interface SpellSetEditorProps {
  existing?: SpellSet
  onDone: () => void
  onCancel: () => void
}

export function SpellSetEditor({ existing, onDone, onCancel }: SpellSetEditorProps) {
  const spells = usePersistentStore((s) => s.spells)
  const createSpellSet = usePersistentStore((s) => s.createSpellSet)
  const renameSpellSet = usePersistentStore((s) => s.renameSpellSet)
  const addSpellToSet = usePersistentStore((s) => s.addSpellToSet)
  const removeSpellFromSet = usePersistentStore((s) => s.removeSpellFromSet)
  const deleteSpellSet = usePersistentStore((s) => s.deleteSpellSet)

  const [name, setName] = useState(existing?.name ?? '')
  const [selected, setSelected] = useState<Set<string>>(new Set(existing?.spellIds ?? []))

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function handleSave() {
    if (existing) {
      renameSpellSet(existing.id, name)
      for (const id of existing.spellIds) if (!selected.has(id)) removeSpellFromSet(existing.id, id)
      for (const id of selected) if (!existing.spellIds.includes(id)) addSpellToSet(existing.id, id)
    } else {
      createSpellSet(name || 'Untitled Set', [...selected])
    }
    onDone()
  }

  return (
    <div className="list">
      <div className="field">
        <label htmlFor="set-name">Set name</label>
        <input id="set-name" type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Chapter 1 Verbs" />
      </div>

      <h3>Spells in this set ({selected.size})</h3>
      {spells.length === 0 && <p className="faint">Create Spell Words first, then add them to a set here.</p>}
      <div className="list">
        {spells.map((s) => (
          <label key={s.id} className="card row" style={{ cursor: 'pointer' }}>
            <span>
              <b>{s.korean}</b> <span className="faint">— {s.english}</span>
            </span>
            <input type="checkbox" checked={selected.has(s.id)} onChange={() => toggle(s.id)} />
          </label>
        ))}
      </div>

      <div className="btn-row">
        <button className="btn btn-primary btn-block" onClick={handleSave}>
          {existing ? 'Save Changes' : 'Create Set'}
        </button>
      </div>
      {existing && (
        <button
          className="btn btn-danger btn-block"
          onClick={() => {
            if (confirm(`Delete set "${existing.name}"? This will not delete the Spells themselves.`)) {
              deleteSpellSet(existing.id)
              onDone()
            }
          }}
        >
          Delete Set
        </button>
      )}
      <button className="btn btn-ghost btn-block" onClick={onCancel}>
        Cancel
      </button>
    </div>
  )
}
