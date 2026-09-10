import { useState } from 'react'
import { useUiStore } from '@/state/uiStore'
import { usePersistentStore } from '@/state/persistentStore'
import { useDungeonStore } from '@/state/dungeonStore'
import { TopBar } from '@/ui/components/TopBar'
import { WorldImage } from '@/ui/components/WorldImage'
import { playableWorlds, incompleteWorlds, resolveWorld } from '@/systems/worldRegistry'
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

  // Fall back to a set that could actually be used. A freshly raised Totem
  // has nothing equipped and a first run has nothing remembered, so both
  // pickers opened empty — and the run could not be started until you found
  // and set them, with the button that says so sitting off the bottom of the
  // screen. Picking the obvious choice when there is one is not a decision
  // taken away: both pickers are right there to change.
  const firstUsableSet = spellSets.find((s) => s.spellIds.length > 0)?.id ?? null
  const [totemSetId, setTotemSetId] = useState<string | null>(
    totem?.equippedSpellSetId ?? lastSelection.totemSpellSetId ?? firstUsableSet,
  )
  const [dungeonSetId, setDungeonSetId] = useState<string | null>(
    lastSelection.dungeonSpellSetId ?? totemSetId ?? firstUsableSet,
  )
  const [tierId, setTierId] = useState<DungeonTierId>(lastSelection.tierId)
  const [worldId, setWorldId] = useState<string | null>(() => playableWorlds()[0]?.id ?? null)

  const totemSet = spellSets.find((s) => s.id === totemSetId) ?? null
  const dungeonSet = spellSets.find((s) => s.id === dungeonSetId) ?? null
  const tier = dungeonTiers.find((t) => t.id === tierId)!

  // Only worlds whose pack is complete can be entered. An unfinished one is
  // listed below with what it still needs, so it reads as work in progress
  // rather than as a bug.
  const worlds = playableWorlds()
  const unfinished = incompleteWorlds()
  const world = resolveWorld(worldId)

  const canStart =
    !!totem && isUsable(totem) && !!totemSet && totemSet.spellIds.length > 0 && !!dungeonSet && dungeonSet.spellIds.length > 0 && !!world

  function handleStart() {
    if (!totem || !totemSet || !dungeonSet || !world) return
    setLastSelection({ totemSpellSetId: totemSet.id, dungeonSpellSetId: dungeonSet.id, tierId })
    const config = buildDungeonConfig(totem.id, totemSet.id, dungeonSet.id, dungeonSet.spellIds, tier, world.id)
    beginDungeon(config)
  }

  return (
    <div className="screen screen-tight screen-scroll dungeon-config">
      <TopBar title="던전" onBack={() => goTo('menu')} />

      {!totem && (
        <div className="empty-state">
          <span className="glyph">🗿</span>
          <p>
            지금 던전에 들어갈 수 있는 토템이 없습니다. 토템 화면에서 새로 기르세요.
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
            <WorldImage world={world} folder="locations" slot="entrance" alt="던전 입구" />
            <span className="scene-tag">{tier.label}</span>
          </div>

          {/* 3. Active Totem — avatar + info, plus which deck it fights with */}
          {/* Not compact here: this is the screen where you take in who you
              are about to play as, not a status strip beside a scene. */}
          <TotemPanel totem={totem} />

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

          {/* 4. World selection */}
          <div className="field">
            <label>세계</label>
            <div className="tier-card-list row">
              {worlds.map((w) => (
                <button
                  key={w.id}
                  className="tier-card"
                  data-selected={world?.id === w.id}
                  onClick={() => setWorldId(w.id)}
                >
                  <div className="tier-card-name">{w.name}</div>
                  <div className="tier-card-meta faint">
                    {w.enemies.length}종의 적 · {w.npcs.length}명의 인물
                  </div>
                </button>
              ))}
            </div>
            {world?.description && <p className="faint">{world.description}</p>}
            {unfinished.length > 0 && (
              // Shown to whoever is building a world, not hidden away in a
              // console they may never open.
              <div className="world-unfinished">
                {unfinished.map((w) => (
                  <div key={w.id} className="world-unfinished-item">
                    <span className="label">{w.name} — 미완성</span>
                    <span className="faint">{w.missing.slice(0, 3).join(', ')}{w.missing.length > 3 ? ` 외 ${w.missing.length - 3}개` : ''}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 5. Dungeon tier selection */}
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

          {/* 6. How English answers are given */}
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

          {/* 7. Dungeon information display */}
          <div className="dungeon-info-panel">
            <p className="dungeon-info-desc">{tier.description}</p>
            <div className="stats-grid">
              <div className="stat-tile">
                <div className="faint">단어 수 제한</div>
                <div className="value">{tier.wordLimit}</div>
              </div>
              <div className="stat-tile">
                <div className="faint">보스 해금</div>
                <div className="value">~{tier.minEventsBeforeBossEligible}개 사건</div>
              </div>
              <div className="stat-tile">
                <div className="faint">적 피해</div>
                <div className="value">×{tier.enemyDamageMultiplier}</div>
              </div>
            </div>
            {dungeonSet && (
              <p className="faint">
                단어 {dungeonSet.spellIds.length}개 중 {Math.min(dungeonSet.spellIds.length, tier.wordLimit)}개를 사용합니다.
              </p>
            )}
          </div>

          {/* 8. Enter dungeon. Pinned to the bottom of the screen rather than
              placed after the settings: this screen grows every time a world
              is added, and the button that starts the run is the one thing
              that must never end up below the fold. */}
          <div className="dungeon-start">
            <button className="btn btn-primary btn-block" disabled={!canStart} onClick={handleStart}>
              던전 입장
            </button>
            {!canStart && <p className="faint">두 역할 모두에 비어 있지 않은 주문 세트를 골라야 계속할 수 있습니다.</p>}
          </div>
        </>
      )}
    </div>
  )
}
