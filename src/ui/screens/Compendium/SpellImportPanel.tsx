import { useMemo, useRef, useState } from 'react'
import { usePersistentStore } from '@/state/persistentStore'
import {
  parseImportText,
  importRowsToInputs,
  exportSpellsToCsv,
  retypesAnything,
  IMPORT_TEMPLATE_CSV,
  IMPORT_TEMPLATE_SIMPLE_CSV,
} from '@/systems/spellImport'
import { elementDefFor, wordTypeDefs } from '@/config/wordTypes'
import { ElementIcon } from '@/ui/components/ElementIcon'

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
# 이렇게 #으로 시작하는 줄은 무시됩니다`

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
  const editSpell = usePersistentStore((s) => s.editSpell)
  const createSpellSet = usePersistentStore((s) => s.createSpellSet)

  const [text, setText] = useState('')
  const [makeSet, setMakeSet] = useState(true)
  const [setName, setSetName] = useState('')
  const [fillBlanks, setFillBlanks] = useState(true)
  const [retype, setRetype] = useState(false)
  const [imported, setImported] = useState<number | null>(null)
  const [filled, setFilled] = useState(0)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const result = useMemo(() => parseImportText(text, spells, { retype }), [text, spells, retype])
  /**
   * Whether the file disagrees with a saved entry's word type at all — asked
   * without the option on, so ticking it does not make the question of
   * whether to offer it depend on its own answer.
   */
  const canRetype = useMemo(
    () => retypesAnything(parseImportText(text, spells), spells),
    [text, spells],
  )
  const hasContent = text.trim().length > 0
  /**
   * Whether the file claims to carry examples at all.
   *
   * Only then is "no example" worth printing next to a row: in the short
   * two-column form there is nowhere to put one, and saying so on every
   * line would be noise rather than a warning.
   */
  const headerHasExample = result.headerColumns?.includes('sampleSentence') ?? false
  const willFill = fillBlanks ? result.fills.length : 0
  const canImport = result.ok.length > 0 || willFill > 0
  const importLabel =
    result.ok.length > 0 && willFill > 0
      ? `단어 ${result.ok.length}개 가져오고 ${willFill}개 채우기`
      : result.ok.length > 0
        ? `단어 ${result.ok.length}개 가져오기`
        : willFill > 0
          ? `빈 칸 ${willFill}개 채우기`
          : '가져오기'

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => setText(String(reader.result ?? ''))
    reader.readAsText(file)
    e.target.value = ''
  }

  function handleImport() {
    if (result.ok.length === 0 && !(fillBlanks && result.fills.length > 0)) return
    const created = bulkCreateSpells(importRowsToInputs(result.ok))
    if (makeSet && created.length > 0) {
      const name = setName.trim() || `가져온 세트 (${created.length})`
      createSpellSet(name, created.map((s) => s.id))
    }
    // Repairs come after the new entries so one press does both: a corrected
    // file is usually part list, part fix.
    if (fillBlanks) {
      for (const row of result.fills) editSpell(row.fill!.spellId, row.fill!.patch)
      setFilled(result.fills.length)
    } else setFilled(0)
    setImported(created.length)
  }

  if (imported !== null) {
    return (
      <div className="list">
        <div className="empty-state">
          <span className="glyph">✅</span>
          <p>
            주문 단어 {imported}개를 가져왔습니다
            {makeSet && imported > 0 ? '. 이 단어들로 주문 세트도 만들었습니다.' : '.'}
            {filled > 0 && <> 이미 있던 단어 {filled}개의 빈 칸도 채웠습니다.</>}
          </p>
        </div>
        <button className="btn btn-primary btn-block" onClick={onDone}>
          완료
        </button>
      </div>
    )
  }

  return (
    <div className="list">
      <div className="field">
        <label htmlFor="import-text">단어 목록을 붙여 넣으세요</label>
        <textarea
          id="import-text"
          rows={7}
          spellCheck={false}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={PLACEHOLDER}
        />
        <p className="faint">
          간단한 형식: 한 줄에 단어 하나, 한국어를 먼저 쓰고 뜻을 씁니다 — 쉼표, 탭, 세로줄로 구분합니다.
          스프레드시트에서 그대로 붙여 넣어도 됩니다. 머리글 행(단어, 품사, 뜻 1, 뜻 2, 예문, 현재형, 과거형,
          미래형…)을 넣으면 전체 항목을 채울 수 있고, 열 순서는 상관없습니다. 속성은 품사에서 정해지므로
          속성 열은 무시됩니다.
        </p>
      </div>

      <div className="btn-row">
        <button
          className="btn btn-ghost btn-sm"
          onClick={() => downloadTextFile('thoth-vocab-template.csv', IMPORT_TEMPLATE_CSV, 'text/csv')}
        >
          ⬇️ 전체 서식
        </button>
        <button className="btn btn-ghost btn-sm" onClick={() => setText(IMPORT_TEMPLATE_CSV)}>
          👁️ 미리 보기
        </button>
      </div>
      <div className="btn-row">
        <button className="btn btn-ghost btn-sm" onClick={() => setText(IMPORT_TEMPLATE_SIMPLE_CSV)}>
          ✏️ 간단한 형식
        </button>
        <button
          className="btn btn-ghost btn-sm"
          disabled={spells.length === 0}
          onClick={() => downloadTextFile('thoth-vocab-export.csv', exportSpellsToCsv(spells), 'text/csv')}
        >
          ⬆️ 내 단어 내보내기
        </button>
      </div>
      <div className="btn-row">
        <button className="btn btn-ghost btn-sm" onClick={() => fileInputRef.current?.click()}>
          📄 .txt / .csv 파일 열기
        </button>
        {hasContent && (
          <button className="btn btn-ghost btn-sm" onClick={() => setText('')}>
            지우기
          </button>
        )}
      </div>
      <input ref={fileInputRef} type="file" accept=".txt,.csv" style={{ display: 'none' }} onChange={handleFile} />

      {hasContent && (
        <>
          <div className="import-summary">
            <span className="import-count ok">✓ 준비됨 {result.ok.length}</span>
            {result.fills.length > 0 && (
              <span className="import-count fill">↻ 채울 수 있음 {result.fills.length}</span>
            )}
            {result.duplicates.length - result.fills.length > 0 && (
              <span className="import-count duplicate">
                ⚠ 중복 {result.duplicates.length - result.fills.length}
              </span>
            )}
            {result.errors.length > 0 && <span className="import-count error">✕ 오류 {result.errors.length}</span>}
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
                            <ElementIcon element={elementDefFor(row.input.wordType)} size={13} />{' '}
                            {wordTypeDefs[row.input.wordType].shortLabel}
                          </span>
                        )}
                      </span>
                      {/* The example is the field that used to go missing
                          without anyone being able to tell until they were
                          halfway through a dungeon. Now it is on screen
                          before anything is committed. */}
                      {row.input.sampleSentence?.trim() ? (
                        <span className="import-row-example">예문 · {row.input.sampleSentence}</span>
                      ) : (
                        headerHasExample && <span className="import-row-example none">예문 없음</span>
                      )}
                      {row.message && <span className="import-row-message duplicate">{row.message}</span>}
                    </>
                  ) : (
                    <>
                      <span className="faint">{row.raw}</span>
                      <span className={`import-row-message ${row.fill ? 'fill' : row.status}`}>{row.message}</span>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="field">
            {(result.fills.length > 0 || canRetype) && (
              <label className="row-start" style={{ gap: 8, cursor: 'pointer' }}>
                <input type="checkbox" checked={fillBlanks} onChange={(e) => setFillBlanks(e.target.checked)} />
                이미 있는 단어의 빈 칸 채우기 (덮어쓰지 않습니다)
              </label>
            )}
            {/* Offered only when it would change something, and only ever by
                asking: the word type decides an entry's Element, and a saved
                one cannot be told apart from a default that was never set. */}
            {fillBlanks && canRetype && (
              <label className="row-start" style={{ gap: 8, cursor: 'pointer' }}>
                <input type="checkbox" checked={retype} onChange={(e) => setRetype(e.target.checked)} />
                품사도 파일에 맞추기 (기존 품사를 덮어씁니다)
              </label>
            )}
            <label className="row-start" style={{ gap: 8, cursor: 'pointer' }}>
              <input type="checkbox" checked={makeSet} onChange={(e) => setMakeSet(e.target.checked)} />
              이 단어들로 주문 세트도 만들기
            </label>
            {makeSet && result.ok.length > 0 && (
              <input
                type="text"
                value={setName}
                onChange={(e) => setSetName(e.target.value)}
                placeholder={`가져온 세트 (${result.ok.length})`}
              />
            )}
          </div>
        </>
      )}

      <div className="btn-row">
        <button className="btn btn-primary btn-block" onClick={handleImport} disabled={!canImport}>
          {importLabel}
        </button>
      </div>
      <button className="btn btn-ghost btn-block" onClick={onCancel}>
        취소
      </button>
    </div>
  )
}
