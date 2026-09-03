import { useEffect, useState } from 'react'
import { useDungeonStore } from '@/state/dungeonStore'
import { usePersistentStore } from '@/state/persistentStore'
import { attackCardClue, selectableSpellIds } from '@/systems/battleEngine'
import { isFullyCleared, remainingCount } from '@/systems/bossPlateau'
import { AssetImage } from '@/ui/components/AssetImage'
import { sceneArt } from '@/config/scenes'
import { Bar } from '@/ui/components/Bar'
import { SpellCard } from '@/ui/components/SpellCard'
import { TotemPanel } from '@/ui/components/TotemPanel'
import { RunHud } from '@/ui/components/RunHud'
import { ChallengeView } from './ChallengeView'
import { WordInfoPanel } from './WordInfoPanel'

export function BattleView() {
  const battle = useDungeonStore((s) => s.battle)!
  const run = useDungeonStore((s) => s.run)!
  const wordInfoOpen = useDungeonStore((s) => s.activePanel === 'words')
  const toggleWordInfo = useDungeonStore((s) => s.toggleWordInfo)
  const closePanel = useDungeonStore((s) => s.closePanel)
  const selectCard = useDungeonStore((s) => s.selectCard)
  const submitAttackAnswer = useDungeonStore((s) => s.submitAttackAnswer)
  const continueAfterPlayerResolve = useDungeonStore((s) => s.continueAfterPlayerResolve)
  const tickBattleTimer = useDungeonStore((s) => s.tickBattleTimer)
  const submitDefenseAnswer = useDungeonStore((s) => s.submitDefenseAnswer)
  const continueAfterEnemyResolve = useDungeonStore((s) => s.continueAfterEnemyResolve)
  const continueAfterVictory = useDungeonStore((s) => s.continueAfterVictory)
  const continueAfterDefeat = useDungeonStore((s) => s.continueAfterDefeat)

  const spells = usePersistentStore((s) => s.spells)
  const totem = usePersistentStore((s) => s.totems.find((t) => t.id === run.config.totemId))!

  // The enemy timer pauses whenever the tab is hidden or the Words panel is
  // open, so only ever one timer is actually counting down.
  const [documentVisible, setDocumentVisible] = useState(!document.hidden)
  useEffect(() => {
    const handler = () => setDocumentVisible(!document.hidden)
    document.addEventListener('visibilitychange', handler)
    return () => document.removeEventListener('visibilitychange', handler)
  }, [])

  useEffect(() => {
    if (battle.phase !== 'enemy_challenge' || !battle.timer?.running) return
    if (wordInfoOpen || !documentVisible) return
    const id = window.setInterval(() => tickBattleTimer(0.25), 250)
    return () => window.clearInterval(id)
  }, [battle.phase, battle.timer?.running, wordInfoOpen, documentVisible, tickBattleTimer])

  const challengeSpell = battle.activeChallenge
    ? spells.find((sp) => sp.id === battle.activeChallenge!.spellId)
    : undefined
  const asksForKorean = battle.activeChallenge?.direction === 'eng_to_kor'
  const answerFor = (sp: (typeof spells)[number]) => (asksForKorean ? sp.korean : sp.english)
  const decoyPool = run.config.dungeonWordIds
    .map((id) => spells.find((sp) => sp.id === id))
    .filter((sp): sp is (typeof spells)[number] => !!sp)
    .map(answerFor)

  // While a barrier is up the whole dungeon set stays selectable, so no
  // word can become unreachable and lock the fight.
  const handIds = selectableSpellIds(battle, battle.isBoss ? run.config.dungeonWordIds : null)
  const handSpells = handIds
    .map((id) => spells.find((s) => s.id === id))
    .filter((s): s is (typeof spells)[number] => !!s)

  const barrierUp = battle.isBoss && battle.plateau && !isFullyCleared(battle.plateau)
  const barrierLeft = battle.plateau ? remainingCount(battle.plateau) : 0
  const barrierTotal = battle.plateau?.length ?? 0
  const lastLog = battle.log[battle.log.length - 1] ?? ''
  const answering = battle.phase === 'player_challenge' || battle.phase === 'enemy_challenge'

  // A boss fight gets the boss room; ordinary fights get battle art.
  const scene = sceneArt(
    battle.isBoss ? 'boss_battle' : 'battle_screen',
    battle.enemy.name,
    run.config.locationKey,
  )

  return (
    <div className="screen" data-challenge={answering ? 'true' : undefined}>
      <div className="row">
        <span className="faint">{battle.isBoss ? '⚔️ BOSS BATTLE' : `⚔️ ${battle.enemy.name.toUpperCase()}`}</span>
        {!answering && (
          <button className="btn btn-ghost btn-sm" onClick={toggleWordInfo}>
            ℹ️ Words
          </button>
        )}
      </div>

      <RunHud run={run} totem={totem} modeLabel={battle.isBoss ? 'Boss Battle' : 'Battle'} />

      <div className="scene-window battle">
        <AssetImage category={scene.category} assetKey={scene.key} alt="Dungeon location" />
        <div className="battle-enemy-overlay">
          <AssetImage category={battle.enemy.imageCategory} assetKey={battle.enemy.imageKey} alt={battle.enemy.name} />
        </div>
        <span className="scene-tag">{battle.enemy.name}</span>
      </div>

      <div className="enemy-hp-row">
        <div className="row">
          <span>{battle.enemy.name}</span>
          <span className="faint">
            {battle.enemy.currentHp}/{battle.enemy.maxHp} HP
          </span>
        </div>
        <Bar value={battle.enemy.currentHp} max={battle.enemy.maxHp} kind="hp" />
      </div>

      <TotemPanel totem={totem} compact />

      {barrierUp && (
        <div className="plateau-banner">
          🛡️ Barrier active — {barrierLeft} of {barrierTotal} word{barrierTotal === 1 ? '' : 's'} left. Use each word
          correctly (attacking or defending) to break it.
        </div>
      )}

      {/* Multi-prompt attacks show which word of the volley you're on. */}
      {battle.phase === 'enemy_challenge' && battle.defense && battle.defense.challenges.length > 1 && (
        <div className="defense-progress">
          Word {battle.defense.index + 1} of {battle.defense.challenges.length}
          <span className="defense-dots">
            {battle.defense.challenges.map((c, i) => (
              <span
                key={c.id}
                className={`defense-dot${
                  i < battle.defense!.results.length
                    ? battle.defense!.results[i]
                      ? ' hit'
                      : ' miss'
                    : i === battle.defense!.index
                      ? ' active'
                      : ''
                }`}
              />
            ))}
          </span>
        </div>
      )}

      {battle.phase === 'enemy_challenge' && battle.timer && (
        <div className="timer-row">
          <span>⏱ {Math.ceil(battle.timer.remainingSeconds)}s</span>
          <div style={{ flex: 1 }}>
            <Bar value={battle.timer.remainingSeconds} max={battle.timer.totalSeconds} kind="timer" thin />
          </div>
        </div>
      )}

      {battle.phase === 'player_select' && (
        <>
          <p className="muted" style={{ textAlign: 'center' }}>
            Choose a Spellword to attack with:
          </p>
          <div className="hand-scroll">
            {handSpells.map((spell) => {
              const cleared = battle.plateau?.find((r) => r.spellId === spell.id)?.cleared
              return (
                <SpellCard
                  key={spell.id}
                  spell={spell}
                  clue={attackCardClue(spell.english)}
                  barrierCleared={barrierUp ? cleared : undefined}
                  onClick={() => selectCard(spell.id)}
                />
              )
            })}
          </div>
          {handSpells.length === 0 && (
            <p className="faint" style={{ textAlign: 'center' }}>
              No Spellwords equipped — visit the Totem screen after this battle.
            </p>
          )}
        </>
      )}

      {battle.phase === 'player_challenge' && battle.activeChallenge && challengeSpell && (
        <ChallengeView
          challenge={battle.activeChallenge}
          answer={answerFor(challengeSpell)}
          decoyPool={decoyPool}
          onSubmit={submitAttackAnswer}
          submitLabel="Attack!"
        />
      )}

      {battle.phase === 'enemy_challenge' && battle.activeChallenge && challengeSpell && (
        <ChallengeView
          challenge={battle.activeChallenge}
          answer={answerFor(challengeSpell)}
          decoyPool={decoyPool}
          onSubmit={submitDefenseAnswer}
          submitLabel="Defend!"
        />
      )}

      {battle.phase === 'player_resolve' && (
        <>
          <div className={`feedback-banner ${battle.lastResult ?? ''}`}>{lastLog}</div>
          <button className="btn btn-primary btn-block" onClick={continueAfterPlayerResolve}>
            Continue →
          </button>
        </>
      )}

      {battle.phase === 'enemy_resolve' && (
        <>
          <div className={`feedback-banner ${battle.lastResult ?? ''}`}>{lastLog}</div>
          <button className="btn btn-primary btn-block" onClick={continueAfterEnemyResolve}>
            Continue →
          </button>
        </>
      )}

      {battle.phase === 'victory' && (
        <>
          <div className="feedback-banner correct">
            🎉 {battle.enemy.name} is defeated!
          </div>
          <button className="btn btn-primary btn-block" onClick={continueAfterVictory}>
            Continue →
          </button>
        </>
      )}

      {battle.phase === 'defeat' && (
        <>
          <div className="feedback-banner incorrect">💀 Your Totem has fallen...</div>
          <button className="btn btn-primary btn-block" onClick={continueAfterDefeat}>
            See Results
          </button>
        </>
      )}

      <div style={{ flex: 1 }} />

      {wordInfoOpen && <WordInfoPanel run={run} battle={battle} onClose={closePanel} />}
    </div>
  )
}
