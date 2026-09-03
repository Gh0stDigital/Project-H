import { useMemo, useState } from 'react'
import { useUiStore } from '@/state/uiStore'
import { usePersistentStore } from '@/state/persistentStore'
import { TopBar } from '@/ui/components/TopBar'
import { Bar } from '@/ui/components/Bar'
import { spellAccuracy } from '@/domain/spell'
import { sortSpells, filterSpellsBySet, type RecordsSortKey } from '@/systems/records'
import { definitionsOf } from '@/domain/spell'
import { elementDefFor, wordTypeDefs } from '@/config/wordTypes'

const sortOptions: { key: RecordsSortKey; label: string }[] = [
  { key: 'level', label: 'Level' },
  { key: 'charge', label: 'Charge' },
  { key: 'accuracy', label: 'Accuracy' },
  { key: 'mostPracticed', label: 'Most Practiced' },
  { key: 'mostMissed', label: 'Most Missed' },
  { key: 'recentlyPracticed', label: 'Recent' },
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
      <TopBar title="Records" onBack={() => goTo('menu')} />

      <div className="filter-row">
        <span
          className={`chip ${setFilter === 'all' ? 'active' : ''}`}
          onClick={() => setSetFilter('all')}
        >
          All Spells
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
          <span className="glyph">📊</span>
          <p>No Spells to show yet.</p>
        </div>
      )}

      <div className="list">
        {list.map((spell) => (
          <div key={spell.id} className="record-row">
            <div className="head">
              <span className="kor">{spell.korean}</span>
              <span className={`element-chip element-${elementDefFor(spell.wordType).id}`}>
                {elementDefFor(spell.wordType).icon} {wordTypeDefs[spell.wordType].shortLabel}
              </span>
              <span className="faint">Lv {spell.level}</span>
            </div>
            <p className="muted" style={{ fontSize: 13 }}>{definitionsOf(spell).join(' · ')}</p>

            <div className="row">
              <span className="faint" style={{ minWidth: 46 }}>
                Charge
              </span>
              <div style={{ flex: 1 }}>
                <Bar value={spell.charge} max={spell.maxCharge} kind="charge" thin />
              </div>
              <span className="faint">{spell.charge}/{spell.maxCharge}</span>
            </div>

            <div className="stats-grid">
              <div>
                <b>{Math.round(spellAccuracy(spell) * 100)}%</b>
                Accuracy
              </div>
              <div>
                <b>{spell.timesEncountered}</b>
                Encounters
              </div>
              <div>
                <b>{spell.experience}</b>
                XP
              </div>
              <div>
                <b>{spell.correctAnswers}</b>
                Correct
              </div>
              <div>
                <b>{spell.incorrectAnswers}</b>
                Incorrect
              </div>
              <div>
                <b>{spell.correctAttacks}</b>
                Attacks Hit
              </div>
              <div>
                <b>{spell.failedAttacks}</b>
                Attacks Missed
              </div>
              <div>
                <b>{spell.successfulDefenses}</b>
                Defenses
              </div>
              <div>
                <b>{spell.failedDefenses}</b>
                Failed Def.
              </div>
            </div>

            <p className="faint">
              Last practiced: {spell.lastPracticedAt ? new Date(spell.lastPracticedAt).toLocaleDateString() : 'never'}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}
