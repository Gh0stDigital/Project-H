import { useState } from 'react'
import { useUiStore } from '@/state/uiStore'
import { useDungeonStore } from '@/state/dungeonStore'
import { getItemDef } from '@/config/items'
import { pct, type RunReport, type WordReportRow } from '@/systems/runResults'
import type { ItemId } from '@/domain/item'
import { SlidePanel } from '@/ui/components/SlidePanel'

type DetailPanel = 'words' | 'haul' | null

/**
 * End-of-run report.
 *
 * The summary is sized to one viewport — outcome, Totem state, the headline
 * numbers and accuracy — with the long lists (every word's performance, the
 * items collected, level-ups) behind modals rather than a scroll. Purely a
 * readout: every reward was credited when it was earned, so rendering or
 * re-rendering this screen can never grant anything a second time.
 */
export function ResultsView() {
  const goTo = useUiStore((s) => s.goTo)
  const report = useDungeonStore((s) => s.report)
  const exitToMenu = useDungeonStore((s) => s.exitToMenu)
  const [panel, setPanel] = useState<DetailPanel>(null)

  if (!report) {
    exitToMenu()
    return null
  }

  const glyph = report.outcome === 'victory' ? '🏆' : report.outcome === 'abandoned' ? '🚪' : '💀'
  const attempted = report.words.filter((w) => w.correct + w.incorrect > 0).length
  const haulCount = report.itemsCollected.length + report.levelUps.length + report.masteredWords.length

  return (
    <div className="screen results-screen">
      <div className="results-head">
        <span className="glyph">{glyph}</span>
        <h1>{report.title}</h1>
        <p className="muted">
          {report.turns} turn{report.turns === 1 ? '' : 's'} · {pct(report.totalAccuracy)} accuracy
        </p>
      </div>

      {/* ---- Totem outcome ---- */}
      <div className={`panel totem-outcome ${report.totemDestroyed ? 'destroyed' : ''}`}>
        <div className="row">
          <span>❤️ {report.totemHp}/{report.totemMaxHp}</span>
          <span>◆ {report.lifePointsRemaining} Life</span>
          {report.totemLevelAfter > report.totemLevelBefore && (
            <span className="faint">Lv {report.totemLevelBefore} → {report.totemLevelAfter}</span>
          )}
        </div>
        {report.totemDestroyed ? (
          <p className="destroyed-note">Your Totem is destroyed. Raise a new one from the Totem screen.</p>
        ) : (
          report.lifePointLost && <p className="faint">You lost 1 Life Point.</p>
        )}
      </div>

      {/* ---- Headline numbers ---- */}
      <div className="results-grid tight">
        <Stat label="Money" value={`💰 ${report.moneyEarned}`} />
        <Stat label="Totem XP" value={report.totemXpEarned} />
        <Stat label="Foes" value={report.enemiesDefeated} />
        <Stat label="Mimics" value={report.mimicsDefeated} />
        <Stat label="Treasure" value={report.treasureCollected} />
        <Stat label="Rests" value={report.restsUsed} />
      </div>

      {/* ---- Accuracy ---- */}
      <div className="panel accuracy-panel">
        <div className="accuracy-row">
          <Accuracy label="Overall" value={report.totalAccuracy} />
          <Accuracy label="Attack" value={report.attackAccuracy} />
          <Accuracy label="Defense" value={report.defenseAccuracy} />
        </div>
        <div className="faint" style={{ textAlign: 'center' }}>
          {report.totalCorrect} correct · {report.totalIncorrect} wrong
        </div>
      </div>

      {/* ---- Everything long lives behind a modal ---- */}
      <div className="btn-row">
        <button className="btn btn-ghost" onClick={() => setPanel('words')}>
          📖 Words ({attempted}/{report.words.length})
        </button>
        <button className="btn btn-ghost" disabled={haulCount === 0} onClick={() => setPanel('haul')}>
          🎁 Haul ({haulCount})
        </button>
      </div>

      <div style={{ flex: 1 }} />

      <button
        className="btn btn-primary btn-block"
        onClick={() => {
          exitToMenu()
          goTo('menu')
        }}
      >
        Return to Main Menu
      </button>

      {panel === 'words' && <WordsPanel report={report} onClose={() => setPanel(null)} />}
      {panel === 'haul' && <HaulPanel report={report} onClose={() => setPanel(null)} />}
    </div>
  )
}

function WordsPanel({ report, onClose }: { report: RunReport; onClose: () => void }) {
  return (
    <SlidePanel title="Word Performance" onClose={onClose}>
      {report.struggled.length > 0 && (
        <section>
          <h3>Worth Reviewing</h3>
          <div className="list">
            {report.struggled.map((w) => (
              <WordRow key={w.spellId} word={w} />
            ))}
          </div>
        </section>
      )}
      <section>
        <h3>Every Word</h3>
        <div className="list">
          {report.words.map((w) => (
            <WordRow key={w.spellId} word={w} />
          ))}
        </div>
      </section>
    </SlidePanel>
  )
}

function HaulPanel({ report, onClose }: { report: RunReport; onClose: () => void }) {
  const itemCounts = report.itemsCollected.reduce<Record<string, number>>((acc, id) => {
    acc[id] = (acc[id] ?? 0) + 1
    return acc
  }, {})

  return (
    <SlidePanel title="Haul" onClose={onClose}>
      {Object.keys(itemCounts).length > 0 && (
        <section>
          <h3>Items &amp; Treasure</h3>
          <div className="reward-lines">
            {Object.entries(itemCounts).map(([id, count]) => {
              const def = getItemDef(id as ItemId)
              return (
                <span key={id} className="reward-line">
                  {def.icon} {def.name} ×{count}
                </span>
              )
            })}
          </div>
        </section>
      )}

      {report.levelUps.length > 0 && (
        <section>
          <h3>Spell Level-Ups</h3>
          <p>{report.levelUps.map((l) => `${l.korean} ${l.from}→${l.to}`).join(' · ')}</p>
        </section>
      )}

      {report.masteredWords.length > 0 && (
        <section>
          <h3>Newly Mastered</h3>
          <p>{report.masteredWords.join(', ')}</p>
        </section>
      )}

      <section>
        <h3>Totals</h3>
        <div className="stats-grid">
          <div className="stat-tile">
            <div className="faint">Spell XP</div>
            <div className="value">{report.spellXpEarned}</div>
          </div>
          <div className="stat-tile">
            <div className="faint">Turns</div>
            <div className="value">{report.turns}</div>
          </div>
        </div>
      </section>
    </SlidePanel>
  )
}

function WordRow({ word }: { word: WordReportRow }) {
  const attempts = word.correct + word.incorrect
  return (
    <div className="word-report-row">
      <span className={`status-dot ${word.introduced ? 'done' : 'pending'}`} />
      <div className="word-report-body">
        <div className="word-report-word">
          {word.korean} <span className="faint">— {word.english}</span>
        </div>
        <div className="faint word-report-meta">
          {attempts === 0 ? (
            'Never attempted'
          ) : (
            <>
              {word.correct}✓ / {word.incorrect}✗ · {pct(word.accuracy)}
              {word.attackTotal > 0 && ` · atk ${pct(word.attackAccuracy)}`}
              {word.defenseTotal > 0 && ` · def ${pct(word.defenseAccuracy)}`}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function Accuracy({ label, value }: { label: string; value: number }) {
  return (
    <div className="accuracy-cell">
      <div className="accuracy-value">{pct(value)}</div>
      <div className="faint">{label}</div>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="stat-tile">
      <div className="value">{value}</div>
      <div className="label">{label}</div>
    </div>
  )
}
