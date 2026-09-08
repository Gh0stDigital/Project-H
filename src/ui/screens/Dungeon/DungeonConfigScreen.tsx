import { useState } from 'react'
import { useUiStore } from '@/state/uiStore'
import { usePersistentStore } from '@/state/persistentStore'
import { useDungeonStore } from '@/state/dungeonStore'
import { TopBar } from '@/ui/components/TopBar'
import { AssetImage } from '@/ui/components/AssetImage'
import { TotemPanel } from '@/ui/components/TotemPanel'
import { dungeonTiers, type DungeonTierId } from '@/config/balance'
import { buildDungeonConfig } from '@/systems/dungeonSession'
import { isUsable } from '@/systems/totemManager'

export function DungeonConfigScreen() {
  const goTo = useUiStore((s) => s.goTo)
  const totems = usePersistentStore((s) => s.totems)
  const englishAnswerMode = usePersistentStore((s) => s.settings.englishAnswerMode)
  const updateSettings = usePersistentStore((s) => s.updateSettings)
  const activeTotemId = usePersistentStore((s) => s.activeTotemId)
  const spellSets = usePersistentStore((s) => s.spellSets)
  const lastSelection = usePersistentStore((s) => s.lastDungeonSelection)
  const setLastSelection = usePersistentStore((s) => s.setLastDungeonSelection)
  const beginDungeon = useDungeonStore((s) => s.beginDungeon)

  // A destroyed Totem can never start a run.
  const active = totems.find((t) => t.id === activeTotemId)
  const totem = active && isUsable(active) ? active : totems.find(isUsable)

  const [totemSetId, setTotemSetId] = useState<string | null>(totem?.equippedSpellSetId ?? lastSelection.totemSpellSetId)
  const [dungeonSetId, setDungeonSetId] = useState<string | null>(lastSelection.dungeonSpellSetId ?? totemSetId)
  const [tierId, setTierId] = useState<DungeonTierId>(lastSelection.tierId)

  const totemSet = spellSets.find((s) => s.id === totemSetId) ?? null
  const dungeonSet = spellSets.find((s) => s.id === dungeonSetId) ?? null
  const tier = dungeonTiers.find((t) => t.id === tierId)!

  const canStart = !!totem && isUsable(totem) && !!totemSet && totemSet.spellIds.length > 0 && !!dungeonSet && dungeonSet.spellIds.length > 0

  function handleStart() {
    if (!totem || !totemSet || !dungeonSet) return
    setLastSelection({ totemSpellSetId: totemSet.id, dungeonSpellSetId: dungeonSet.id, tierId })
    const config = buildDungeonConfig(totem.id, totemSet.id, dungeonSet.id, dungeonSet.spellIds, tier)
    beginDungeon(config)
  }

  return (
    <div className="screen screen-tight">
      <TopBar title="던전" onBack={() => goTo('menu')} />

      {!totem && (
        <div className="empty-state">
          <span className="glyph">🗿</span>
          <p>
            No Totem can enter a dungeon right now. Raise a new one from the Totem screen.
          </p>
        </div>
      )}

      {spellSets.length === 0 && (
        <div className="empty-state">
          <span className="glyph">🗝️</span>
          <p>던전에 들어가려면 주문 세트가 최소 하나 필요합니다. 도감에서 만드세요.</p>
        </div>
      )}

      {totem && spellSets.length > 0 && (
        <>
          {/* 1. Dungeon name — the flavorful headline for the currently
              selected tier, updates live as the tier picker below changes. */}
          <h2 className="dungeon-name">{tier.name}</h2>

          {/* 2. Dungeon entrance image */}
          <div className="scene-window compact">
            <AssetImage category="locations" assetKey="dkp_entrance" alt="던전 입구" />
            <span className="scene-tag">{tier.label}</span>
          </div>

          {/* 3. Active Totem — avatar + info, plus which deck it fights with */}
          <TotemPanel totem={totem} compact />

          <div className="config-row">
            <div className="field">
              <label htmlFor="totem-set-select">전투 덱</label>
              <select id="totem-set-select" value={totemSetId ?? ''} onChange={(e) => setTotemSetId(e.target.value || null)}>
                <option value="">— 선택 —</option>
                {spellSets.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.spellIds.length})
                  </option>
                ))}
              </select>
            </div>

            {/* 6. Dungeon Tendency — the word pool this run draws from */}
            <div className="field">
              <label htmlFor="dungeon-set-select">성향 (단어)</label>
              <select id="dungeon-set-select" value={dungeonSetId ?? ''} onChange={(e) => setDungeonSetId(e.target.value || null)}>
                <option value="">— 선택 —</option>
                {spellSets.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.spellIds.length})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* 4. Dungeon tier selection */}
          <div className="field">
            <label>던전 등급</label>
            <div className="tier-card-list row">
              {dungeonTiers.map((t) => (
                <button
                  key={t.id}
                  className="tier-card"
                  data-selected={tierId === t.id}
                  onClick={() => setTierId(t.id)}
                >
                  <div className="tier-card-name">{t.name}</div>
                  <div className="tier-card-meta faint">{t.label}</div>
                </button>
              ))}
            </div>
          </div>

          {/* 5. How English answers are given */}
          <div className="field">
            <label>영어 답 입력 방식</label>
            <div className="answer-mode-row">
              <button
                className="answer-mode-option"
                data-selected={englishAnswerMode === 'choice'}
                onClick={() => updateSettings({ englishAnswerMode: 'choice' })}
              >
                <span className="label">단어 고르기</span>
                <span className="sub">뜻을 통째로 골라 답합니다</span>
              </button>
              <button
                className="answer-mode-option"
                data-selected={englishAnswerMode === 'spell'}
                onClick={() => updateSettings({ englishAnswerMode: 'spell' })}
              >
                <span className="label">철자 맞추기</span>
                <span className="sub">글자를 하나씩 배열합니다</span>
              </button>
            </div>
            <p className="faint">한국어 답은 언제나 음절로 조합합니다.</p>
          </div>

          {/* 6. Dungeon information display */}
          <div className="dungeon-info-panel">
            <p className="dungeon-info-desc">{tier.description}</p>
            <div className="stats-grid">
              <div className="stat-tile">
                <div className="faint">단어 수 제한</div>
                <div className="value">{tier.wordLimit}</div>
              </div>
              <div className="stat-tile">
                <div className="faint">보스 해금</div>
                <div className="value">~{tier.minEventsBeforeBossEligible} evts</div>
              </div>
              <div className="stat-tile">
                <div className="faint">적 피해</div>
                <div className="value">×{tier.enemyDamageMultiplier}</div>
              </div>
            </div>
            {dungeonSet && (
              <p className="faint">
                Pool: {Math.min(dungeonSet.spellIds.length, tier.wordLimit)} of {dungeonSet.spellIds.length} words used.
              </p>
            )}
          </div>

          <div style={{ flex: 1 }} />

          {/* 7. Enter dungeon */}
          <button className="btn btn-primary btn-block" disabled={!canStart} onClick={handleStart}>
            던전 입장
          </button>
          {!canStart && <p className="faint">두 역할 모두에 비어 있지 않은 주문 세트를 골라야 계속할 수 있습니다.</p>}
        </>
      )}
    </div>
  )
}
