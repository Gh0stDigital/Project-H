import { useMemo, useState } from 'react'
import { useUiStore } from '@/state/uiStore'
import { usePersistentStore } from '@/state/persistentStore'
import { TopBar } from '@/ui/components/TopBar'
import { Bar } from '@/ui/components/Bar'
import { spellAccuracy } from '@/domain/spell'
import { sortSpells, filterSpellsBySet, type RecordsSortKey } from '@/systems/records'
import { definitionsOf } from '@/domain/spell'
import { elementDefFor, wordTypeDefs } from '@/config/wordTypes'
import { ElementIcon } from '@/ui/components/ElementIcon'
import { UiIcon } from '@/ui/components/UiIcon'

const sortOptions: { key: RecordsSortKey; label: string }[] = [
  { key: 'level', label: '레벨' },
  { key: 'charge', label: '충전' },
  { key: 'accuracy', label: '정확도' },
  { key: 'mostPracticed', label: '가장 많이 연습한' },
  { key: 'mostMissed', label: '가장 많이 틀린' },
  { key: 'recentlyPracticed', label: '최근' },
  { key: 'alphabetical', label: 'A-Z' },
]

export function RecordsScreen() {
  const goTo = useUiStore((s) => s.goTo)
  const spells = usePersistentStore((s) => s.spells)
  const spellSets = usePersistentStore((s) => s.spellSets)

  const [sortKey, setSortKey] = useState<RecordsSortKey>('recentlyPracticed')
  const [setFilter, setSetFilter] = useState<string | 'all'>('all')

  const activeSet = setFilter === 'all' ? null : spellSets.find((s) => s.id === setFilter) ?? null
  const list = useMemo(() => sortSpells(filterSpellsBySet(spells, activeSet), sortKey), [spells, activeSet, sortKey])

  return (
    <div className="screen screen-scroll">
      <TopBar title="기록" onBack={() => goTo('menu')} />

      <div className="filter-row">
        <span
          className={`chip ${setFilter === 'all' ? 'active' : ''}`}
          onClick={() => setSetFilter('all')}
        >
          모든 주문
        </span>
        {spellSets.map((set) => (
          <span key={set.id} className={`chip ${setFilter === set.id ? 'active' : ''}`} onClick={() => setSetFilter(set.id)}>
            {set.name}
          </span>
        ))}
      </div>

      <div className="filter-row">
        {sortOptions.map((opt) => (
          <span key={opt.key} className={`chip ${sortKey === opt.key ? 'active' : ''}`} onClick={() => setSortKey(opt.key)}>
            {opt.label}
          </span>
        ))}
      </div>

      {list.length === 0 && (
        <div className="empty-state">
          <span className="glyph"><UiIcon name="chart" size={44} /></span>
          <p>아직 보여줄 주문이 없습니다.</p>
        </div>
      )}

      <div className="list">
        {list.map((spell) => (
          <div key={spell.id} className="record-row">
            <div className="head">
              <span className="kor">{spell.korean}</span>
              <span className={`element-chip element-${elementDefFor(spell.wordType).id}`}>
                <ElementIcon element={elementDefFor(spell.wordType)} size={13} />{' '}
                {wordTypeDefs[spell.wordType].shortLabel}
              </span>
              <span className="faint">Lv {spell.level}</span>
            </div>
            <p className="muted" style={{ fontSize: 13 }}>{definitionsOf(spell).join(' · ')}</p>

            <div className="row">
              <span className="faint" style={{ minWidth: 46 }}>
                충전
              </span>
              <div style={{ flex: 1 }}>
                <Bar value={spell.charge} max={spell.maxCharge} kind="charge" thin />
              </div>
              <span className="faint">{spell.charge}/{spell.maxCharge}</span>
            </div>

            <div className="stats-grid">
              <div>
                <b>{Math.round(spellAccuracy(spell) * 100)}%</b>
                정확도
              </div>
              <div>
                <b>{spell.timesEncountered}</b>
                조우
              </div>
              <div>
                <b>{spell.experience}</b>
                경험치
              </div>
              <div>
                <b>{spell.correctAnswers}</b>
                정답
              </div>
              <div>
                <b>{spell.incorrectAnswers}</b>
                오답
              </div>
              <div>
                <b>{spell.correctAttacks}</b>
                공격 성공
              </div>
              <div>
                <b>{spell.failedAttacks}</b>
                공격 실패
              </div>
              <div>
                <b>{spell.successfulDefenses}</b>
                방어
              </div>
              <div>
                <b>{spell.failedDefenses}</b>
                방어 실패
              </div>
            </div>

            <p className="faint">
              마지막 연습: {spell.lastPracticedAt ? new Date(spell.lastPracticedAt).toLocaleDateString() : '없음'}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}
