import { useState } from 'react'
import { useUiStore } from '@/state/uiStore'
import { usePersistentStore } from '@/state/persistentStore'
import { useDungeonStore } from '@/state/dungeonStore'
import { TopBar } from '@/ui/components/TopBar'
import { WorldImage } from '@/ui/components/WorldImage'
import { playableWorlds, incompleteWorlds, resolveWorld } from '@/systems/worldRegistry'
import { TotemPanel } from '@/ui/components/TotemPanel'
import { SlidePanel } from '@/ui/components/SlidePanel'
import { dungeonTiers, type DungeonTierId } from '@/config/balance'
import { buildDungeonConfig } from '@/systems/dungeonSession'
import { isUsable } from '@/systems/totemManager'
import { audio } from '@/systems/audioEngine'
import { curtain } from '@/state/transitionStore'
import { curtainTiming } from '@/config/transitions'
import { UiIcon } from '@/ui/components/UiIcon'

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

  /**
   * Which setting is open, if any.
   *
   * Every choice used to be laid out at once, which made the screen longer
   * every time a world or a tier was added — eight stacked sections to
   * scroll past to reach the button that starts the run. They are buttons
   * now: the screen shows what is currently chosen, and a tap opens the
   * choice over the top of it.
   */
  const [openSetting, setOpenSetting] = useState<
    null | 'world' | 'tier' | 'totemSet' | 'dungeonSet' | 'answerMode'
  >(null)
  const close = () => setOpenSetting(null)

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
    // The shrine sting first, then the screen goes dark on top of it, and the
    // dungeon is built behind the curtain. The dungeon's own music does not
    // start until the reveal has finished — useSoundtrack holds it — so the
    // sting plays into silence rather than being buried under a track
    // starting at the same instant.
    audio.play('shrine')
    void curtain({
      label: world.name,
      holdMs: curtainTiming.hold.dungeonEnter,
      onCovered: () => beginDungeon(config),
    })
  }

  return (
    <div className="screen screen-tight screen-scroll dungeon-config">
      <TopBar title="던전" onBack={() => goTo('menu')} />

      {!totem && (
        <div className="empty-state">
          <span className="glyph"><UiIcon name="totem" size={44} /></span>
          <p>
            지금 던전에 들어갈 수 있는 토템이 없습니다. 토템 화면에서 새로 기르세요.
          </p>
        </div>
      )}

      {spellSets.length === 0 && (
        <div className="empty-state">
          <span className="glyph"><UiIcon name="key" size={44} /></span>
          <p>던전에 들어가려면 주문 세트가 최소 하나 필요합니다. 도감에서 만드세요.</p>
        </div>
      )}

      {totem && spellSets.length > 0 && (
        <>
          {/* What this run is: where you are going, and who with. Every
              other choice is a button below, so this screen stays one
              screenful however many worlds and tiers exist. */}
          <h2 className="dungeon-name">{tier.name}</h2>

          <div className="scene-window compact">
            <WorldImage world={world} folder="locations" slot="entrance" alt="던전 입구" />
            <span className="scene-tag">{world?.name ?? tier.label}</span>
          </div>

          <TotemPanel totem={totem} />

          <div className="setup-grid">
            <button className="setup-option" onClick={() => setOpenSetting('world')}>
              <span className="setup-option-label">세계</span>
              <span className="setup-option-value">{world?.name ?? '— 선택 —'}</span>
            </button>
            <button className="setup-option" onClick={() => setOpenSetting('tier')}>
              <span className="setup-option-label">던전 등급</span>
              <span className="setup-option-value">{tier.label}</span>
            </button>
            <button
              className="setup-option"
              data-warn={totemSet && totemSet.spellIds.length > 0 ? undefined : true}
              onClick={() => setOpenSetting('totemSet')}
            >
              <span className="setup-option-label">전투 덱</span>
              <span className="setup-option-value">
                {totemSet ? `${totemSet.name} (${totemSet.spellIds.length})` : '— 선택 —'}
              </span>
            </button>
            <button
              className="setup-option"
              data-warn={dungeonSet && dungeonSet.spellIds.length > 0 ? undefined : true}
              onClick={() => setOpenSetting('dungeonSet')}
            >
              <span className="setup-option-label">성향 (단어)</span>
              <span className="setup-option-value">
                {dungeonSet ? `${dungeonSet.name} (${dungeonSet.spellIds.length})` : '— 선택 —'}
              </span>
            </button>
            <button className="setup-option wide" onClick={() => setOpenSetting('answerMode')}>
              <span className="setup-option-label">영어 답 입력 방식</span>
              <span className="setup-option-value">
                {englishAnswerMode === 'choice' ? '단어 고르기' : '철자 맞추기'}
              </span>
            </button>
          </div>

          {dungeonSet && (
            <p className="faint setup-summary">
              단어 {dungeonSet.spellIds.length}개 중 {Math.min(dungeonSet.spellIds.length, tier.wordLimit)}개를 사용합니다 ·
              적 피해 ×{tier.enemyDamageMultiplier}
            </p>
          )}

          {openSetting === 'world' && (
            <SlidePanel title="세계" onClose={close}>
              <div className="tier-card-list">
                {worlds.map((w) => (
                  <button
                    key={w.id}
                    className="tier-card stacked"
                    data-selected={world?.id === w.id}
                    onClick={() => {
                      setWorldId(w.id)
                      close()
                    }}
                  >
                    <div className="tier-card-name">{w.name}</div>
                    <div className="tier-card-meta faint">
                      {w.enemies.length}종의 적 · {w.npcs.length}명의 인물
                    </div>
                    {w.description && <div className="tier-card-meta faint">{w.description}</div>}
                  </button>
                ))}
              </div>
              {unfinished.length > 0 && (
                // Shown to whoever is building a world, not hidden away in a
                // console they may never open.
                <div className="world-unfinished">
                  {unfinished.map((w) => (
                    <div key={w.id} className="world-unfinished-item">
                      <span className="label">{w.name} — 미완성</span>
                      <span className="faint">
                        {w.missing.slice(0, 3).join(', ')}
                        {w.missing.length > 3 ? ` 외 ${w.missing.length - 3}개` : ''}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </SlidePanel>
          )}

          {openSetting === 'tier' && (
            <SlidePanel title="던전 등급" onClose={close}>
              <div className="tier-card-list">
                {dungeonTiers.map((t) => (
                  <button
                    key={t.id}
                    className="tier-card stacked"
                    data-selected={tierId === t.id}
                    onClick={() => {
                      setTierId(t.id)
                      close()
                    }}
                  >
                    <div className="tier-card-name">{t.name}</div>
                    <div className="tier-card-meta faint">{t.label}</div>
                    <div className="tier-card-meta faint">{t.description}</div>
                    <div className="tier-card-meta faint">
                      단어 {t.wordLimit}개 · 보스 ~{t.minEventsBeforeBossEligible}개 사건 · 적 피해 ×
                      {t.enemyDamageMultiplier}
                    </div>
                  </button>
                ))}
              </div>
            </SlidePanel>
          )}

          {openSetting === 'totemSet' && (
            <SlidePanel title="전투 덱" onClose={close}>
              <p className="faint">토템이 공격에 사용하는 주문 세트입니다.</p>
              <SpellSetList
                sets={spellSets}
                selectedId={totemSetId}
                onPick={(id) => {
                  setTotemSetId(id)
                  close()
                }}
              />
            </SlidePanel>
          )}

          {openSetting === 'dungeonSet' && (
            <SlidePanel title="성향 (단어)" onClose={close}>
              <p className="faint">던전이 이번 판에 가르칠 단어들입니다. 보스의 방벽도 여기서 만들어집니다.</p>
              <SpellSetList
                sets={spellSets}
                selectedId={dungeonSetId}
                onPick={(id) => {
                  setDungeonSetId(id)
                  close()
                }}
              />
            </SlidePanel>
          )}

          {openSetting === 'answerMode' && (
            <SlidePanel title="영어 답 입력 방식" onClose={close}>
              <div className="answer-mode-row">
                <button
                  className="answer-mode-option"
                  data-selected={englishAnswerMode === 'choice'}
                  onClick={() => {
                    updateSettings({ englishAnswerMode: 'choice' })
                    close()
                  }}
                >
                  <span className="label">단어 고르기</span>
                  <span className="sub">뜻을 통째로 골라 답합니다</span>
                </button>
                <button
                  className="answer-mode-option"
                  data-selected={englishAnswerMode === 'spell'}
                  onClick={() => {
                    updateSettings({ englishAnswerMode: 'spell' })
                    close()
                  }}
                >
                  <span className="label">철자 맞추기</span>
                  <span className="sub">글자를 하나씩 배열합니다</span>
                </button>
              </div>
              <p className="faint">한국어 답은 언제나 음절로 조합합니다.</p>
            </SlidePanel>
          )}

          {/* 8. Enter dungeon. Pinned to the bottom of the screen rather than
              placed after the settings: this screen grows every time a world
              is added, and the button that starts the run is the one thing
              that must never end up below the fold. */}
          <div className="dungeon-start">
            <button className="btn btn-primary btn-block" data-sfx="none" disabled={!canStart} onClick={handleStart}>
              던전 입장
            </button>
            {!canStart && <p className="faint">두 역할 모두에 비어 있지 않은 주문 세트를 골라야 계속할 수 있습니다.</p>}
          </div>
        </>
      )}
    </div>
  )
}

/** The spell-set list, identical in both set pickers. */
function SpellSetList({
  sets,
  selectedId,
  onPick,
}: {
  sets: { id: string; name: string; spellIds: string[] }[]
  selectedId: string | null
  onPick: (id: string) => void
}) {
  if (sets.length === 0) return <p className="faint">주문 세트가 없습니다 — 도감에서 먼저 만드세요.</p>
  return (
    <div className="tier-card-list">
      {sets.map((set) => (
        <button
          key={set.id}
          className="tier-card stacked"
          data-selected={selectedId === set.id}
          // An empty set cannot carry a run, so it is listed but not usable.
          disabled={set.spellIds.length === 0}
          onClick={() => onPick(set.id)}
        >
          <div className="tier-card-name">{set.name}</div>
          <div className="tier-card-meta faint">
            {set.spellIds.length === 0 ? '비어 있음' : `단어 ${set.spellIds.length}개`}
          </div>
        </button>
      ))}
    </div>
  )
}
