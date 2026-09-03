import { useMemo, useRef, useState } from 'react'
import { usePersistentStore } from '@/state/persistentStore'
import {
  parseImportText,
  importRowsToInputs,
  exportSpellsToCsv,
  IMPORT_TEMPLATE_CSV,
  IMPORT_TEMPLATE_SIMPLE_CSV,
} from '@/systems/spellImport'
import { elementDefFor, wordTypeDefs } from '@/config/wordTypes'

/** Saves text as a local file via a throwaway object URL — no network involved. */
function downloadTextFile(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

const PLACEHOLDER = `안녕하세요, hello
감사합니다, thank you
사랑	love (noun)
# lines starting with # are ignored`

interface SpellImportPanelProps {
  onDone: () => void
  onCancel: () => void
}

/**
 * Batch Spell Word import. Paste text or load a .txt/.csv file, preview
 * what will happen line-by-line, then commit. Entirely local — the file
 * is read in-browser via FileReader and never leaves the device.
 */
export function SpellImportPanel({ onDone, onCancel }: SpellImportPanelProps) {
  const spells = usePersistentStore((s) => s.spells)
  const bulkCreateSpells = usePersistentStore((s) => s.bulkCreateSpells)
  const createSpellSet = usePersistentStore((s) => s.createSpellSet)

  const [text, setText] = useState('')
  const [makeSet, setMakeSet] = useState(true)
  const [setName, setSetName] = useState('')
  const [imported, setImported] = useState<number | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const result = useMemo(() => parseImportText(text, spells), [text, spells])
  const hasContent = text.trim().length > 0

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => setText(String(reader.result ?? ''))
    reader.readAsText(file)
    e.target.value = ''
  }

  function handleImport() {
    if (result.ok.length === 0) return
    const created = bulkCreateSpells(importRowsToInputs(result.ok))
    if (makeSet && created.length > 0) {
      const name = setName.trim() || `Imported Set (${created.length})`
      createSpellSet(name, created.map((s) => s.id))
    }
    setImported(created.length)
  }

  if (imported !== null) {
    return (
      <div className="list">
        <div className="empty-state">
          <span className="glyph">✅</span>
          <p>
            Imported {imported} Spell Word{imported === 1 ? '' : 's'}
            {makeSet ? ' and created a Spell Set from them.' : '.'}
          </p>
        </div>
        <button className="btn btn-primary btn-block" onClick={onDone}>
          Done
        </button>
      </div>
    )
  }

  return (
    <div className="list">
      <div className="field">
        <label htmlFor="import-text">Paste your word list</label>
        <textarea
          id="import-text"
          rows={7}
          spellCheck={false}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={PLACEHOLDER}
        />
        <p className="faint">
          Quick form: one word per line, Korean first then the definition — comma, tab or pipe separated. Pasting
          straight from a spreadsheet works too. Add a header row (word, word type, definition 1, definition 2,
          sample sentence, present, past, future…) to fill in the full entry; columns can be in any order. Element is
          worked out from the Word Type, so an Element column is ignored.
        </p>
      </div>

      <div className="btn-row">
        <button
          className="btn btn-ghost btn-sm"
          onClick={() => downloadTextFile('thoth-vocab-template.csv', IMPORT_TEMPLATE_CSV, 'text/csv')}
        >
          ⬇️ Full Template
        </button>
        <button className="btn btn-ghost btn-sm" onClick={() => setText(IMPORT_TEMPLATE_CSV)}>
          👁️ Preview
        </button>
      </div>
      <div className="btn-row">
        <button className="btn btn-ghost btn-sm" onClick={() => setText(IMPORT_TEMPLATE_SIMPLE_CSV)}>
          ✏️ Simple Form
        </button>
        <button
          className="btn btn-ghost btn-sm"
          disabled={spells.length === 0}
          onClick={() => downloadTextFile('thoth-vocab-export.csv', exportSpellsToCsv(spells), 'text/csv')}
        >
          ⬆️ Export My Words
        </button>
      </div>
      <div className="btn-row">
        <button className="btn btn-ghost btn-sm" onClick={() => fileInputRef.current?.click()}>
          📄 Load .txt / .csv file
        </button>
        {hasContent && (
          <button className="btn btn-ghost btn-sm" onClick={() => setText('')}>
            Clear
          </button>
        )}
      </div>
      <input ref={fileInputRef} type="file" accept=".txt,.csv" style={{ display: 'none' }} onChange={handleFile} />

      {hasContent && (
        <>
          <div className="import-summary">
            <span className="import-count ok">✓ {result.ok.length} ready</span>
            {result.duplicates.length > 0 && (
              <span className="import-count duplicate">⚠ {result.duplicates.length} duplicate</span>
            )}
            {result.errors.length > 0 && <span className="import-count error">✕ {result.errors.length} error</span>}
          </div>

          <div className="import-preview">
            {result.rows.map((row) => (
              <div key={row.line} className={`import-row ${row.status}`}>
                <span className="import-row-line">{row.line}</span>
                <div className="import-row-body">
                  {row.status === 'ok' ? (
                    <>
                      <span>
                        {row.korean} <span className="faint">— {row.english}</span>
                        {row.input.wordType && (
                          <span className={`element-chip element-${elementDefFor(row.input.wordType).id}`}>
                            {elementDefFor(row.input.wordType).icon} {wordTypeDefs[row.input.wordType].shortLabel}
                          </span>
                        )}
                      </span>
                      {row.message && <span className="import-row-message duplicate">{row.message}</span>}
                    </>
                  ) : (
                    <>
                      <span className="faint">{row.raw}</span>
                      <span className={`import-row-message ${row.status}`}>{row.message}</span>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="field">
            <label className="row-start" style={{ gap: 8, cursor: 'pointer' }}>
              <input type="checkbox" checked={makeSet} onChange={(e) => setMakeSet(e.target.checked)} />
              Also create a Spell Set from these words
            </label>
            {makeSet && (
              <input
                type="text"
                value={setName}
                onChange={(e) => setSetName(e.target.value)}
                placeholder={`Imported Set (${result.ok.length})`}
              />
            )}
          </div>
        </>
      )}

      <div className="btn-row">
        <button className="btn btn-primary btn-block" onClick={handleImport} disabled={result.ok.length === 0}>
          Import {result.ok.length > 0 ? result.ok.length : ''} Word{result.ok.length === 1 ? '' : 's'}
        </button>
      </div>
      <button className="btn btn-ghost btn-block" onClick={onCancel}>
        Cancel
      </button>
    </div>
  )
}
