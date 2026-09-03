import { useEffect, useState } from 'react'
import type { DungeonState } from '@/domain/dungeon'
import { useDungeonStore, challengedCount } from '@/state/dungeonStore'
import { usePersistentStore } from '@/state/persistentStore'
import { canEnterBoss } from '@/systems/dungeonSession'
import { sceneArt, sceneKindForEvent } from '@/config/scenes'
import { AssetImage } from '@/ui/components/AssetImage'
import { TypewriterText } from '@/ui/components/TypewriterText'
import { Bar } from '@/ui/components/Bar'
import { DungeonProgressTrack } from '@/ui/components/DungeonProgressTrack'
import { TotemPanel } from '@/ui/components/TotemPanel'
import { MoveRollModal } from '@/ui/components/MoveRollModal'
import { RunHud } from '@/ui/components/RunHud'
import { ChallengeView } from './ChallengeView'
import { WordInfoPanel } from './WordInfoPanel'
import { ItemPanel } from './ItemPanel'
import { StatusPanel } from './StatusPanel'
import { StandbyActions } from './StandbyActions'
import { MagicRoomView } from './MagicRoomView'
import { RestAreaView } from './RestAreaView'
import {
  BossDoorNotice,
  DirectionChoices,
  KeyRoomView,
  RewardSummary,
  TreasureChoice,
} from './EventActionViews'

const modeLabels: Record<DungeonState, string> = {
  DungeonSetup: 'Setup',
  Standby: 'Standby',
  Rolling: 'Moving',
  ResolvingEvent: 'Event',
  VocabularyInput: 'Answering',
  Battle: 'Battle',
  Rest: 'Rest Area',
  BossBattle: 'Boss Battle',
  Results: 'Results',
  Defeat: 'Defeated',
}

/**
 * The non-battle half of a dungeon run: Standby, the dice roll, and every
 * event that isn't combat. Which of those is on screen is decided by the
 * run's explicit state plus its event stage — this component never decides
 * for itself what is legal, it only renders what the store says is current.
 */
export function ExploreView() {
  const run = useDungeonStore((s) => s.run)!
  const stage = useDungeonStore((s) => s.stage)
  const puzzle = useDungeonStore((s) => s.puzzle)
  const rolling = useDungeonStore((s) => s.rolling)
  const activePanel = useDungeonStore((s) => s.activePanel)

  const openPanel = useDungeonStore((s) => s.openPanel)
  const closePanel = useDungeonStore((s) => s.closePanel)
  const move = useDungeonStore((s) => s.move)
  const finishRoll = useDungeonStore((s) => s.finishRoll)
  const acknowledgeEvent = useDungeonStore((s) => s.acknowledgeEvent)
  const attemptTreasure = useDungeonStore((s) => s.attemptTreasure)
  const leaveTreasure = useDungeonStore((s) => s.leaveTreasure)
  const submitEventAnswer = useDungeonStore((s) => s.submitEventAnswer)
  const guessSyllable = useDungeonStore((s) => s.guessSyllable)
  const finishMagicRoom = useDungeonStore((s) => s.finishMagicRoom)
  const chooseDirection = useDungeonStore((s) => s.chooseDirection)
  const takeKey = useDungeonStore((s) => s.takeKey)
  const openRestArea = useDungeonStore((s) => s.openRestArea)
  const leaveRest = useDungeonStore((s) => s.leaveRest)
  const buyRest = useDungeonStore((s) => s.buyRest)
  const askEnterBossDoor = useDungeonStore((s) => s.askEnterBossDoor)
  const cancelEnterBossDoor = useDungeonStore((s) => s.cancelEnterBossDoor)
  const enterBossDoor = useDungeonStore((s) => s.enterBossDoor)
  const confirmingBoss = useDungeonStore((s) => s.confirmingBoss)
  const useItem = useDungeonStore((s) => s.useItem)
  const tickEventTimer = useDungeonStore((s) => s.tickEventTimer)

  const allSpells = usePersistentStore((s) => s.spells)
  const totems = usePersistentStore((s) => s.totems)
  const spellSets = usePersistentStore((s) => s.spellSets)
  const inventory = usePersistentStore((s) => s.inventory)
  const charsPerSecond = usePersistentStore((s) => s.settings.typewriterCharsPerSecond)

  const totem = totems.find((t) => t.id === run.config.totemId)!
  const totemSet = spellSets.find((s) => s.id === run.config.totemSpellSetId) ?? null
  const event = run.currentEvent

  // Dialogue must finish revealing before its buttons appear, so a tap
  // meant for the text can't land on an action.
  //
  // Keyed on the event and whether outcome text has replaced the intro —
  // deliberately NOT on the stage, so advancing within one event (reading
  // a chest, then choosing to open it) doesn't retype the same lines.
  const showingOutcome = run.lastOutcomeText.length > 0
  const dialogueLines = showingOutcome
    ? run.lastOutcomeText
    : event
      ? event.bodyText
      : run.standbyNotice
        ? [run.standbyNotice]
        : []
  const dialogueKey = `${event?.id ?? run.standbyNotice ?? 'none'}:${showingOutcome ? 'outcome' : 'intro'}`
  const [revealedKey, setRevealedKey] = useState<string | null>(null)
  const dialogueRevealed = revealedKey === dialogueKey

  const [rollSettled, setRollSettled] = useState(false)

  // The trap countdown. Paused whenever a panel is open or the tab is
  // hidden, and torn down the moment the timer clears — so exactly one
  // event timer can ever be running.
  const timerRunning = !!run.eventTimer?.running && !activePanel
  useEffect(() => {
    if (!timerRunning) return
    const id = window.setInterval(() => tickEventTimer(0.25), 250)
    return () => window.clearInterval(id)
  }, [timerRunning, tickEventTimer])
  const introduced = challengedCount(run)
  const total = run.config.dungeonWordIds.length

  const inStandby = run.state === 'Standby' && !rolling
  const challengeSpell = event?.challenge
    ? allSpells.find((sp) => sp.id === event.challenge!.spellId)
    : undefined
  const asksForKorean = event?.challenge?.direction === 'eng_to_kor'
  const answersInRun = run.config.dungeonWordIds
    .map((id) => allSpells.find((sp) => sp.id === id))
    .filter((sp): sp is (typeof allSpells)[number] => !!sp)

  const answeringChallenge =
    run.state === 'VocabularyInput' && !!event?.challenge && !!challengeSpell && stage !== 'trap_result' && stage !== 'treasure_result' && stage !== 'reward'
  // Inside an event (either still reading it, or answering//resolving it).
  const inEvent = run.state === 'ResolvingEvent' || run.state === 'VocabularyInput'

  // The backdrop follows the situation rather than the run, so it changes
  // every move. Seeded by event id (stable for the length of an event) and,
  // in Standby, by turn — so consecutive corridors aren't the same picture.
  const scene =
    run.state === 'Rest'
      ? sceneArt('rest', 'rest', run.config.locationKey)
      : event && !inStandby && !rolling
        ? sceneArt(sceneKindForEvent(event.type), event.id, run.config.locationKey)
        : sceneArt('standby', String(run.turn), run.config.locationKey)

  return (
    <div
      className="screen"
      // Anything that asks the player to commit to an answer or a path is
      // an "answering mode" and sheds the same non-essential chrome; a
      // four-way fork simply does not fit beside a scene image on a short
      // phone, and the paths carry their own flavor text.
      data-challenge={
        answeringChallenge || stage === 'magic_room' || stage === 'direction_choice' ? 'true' : undefined
      }
      data-mode={run.state === 'Rest' ? 'rest' : undefined}
    >
      <RunHud run={run} totem={totem} modeLabel={modeLabels[run.state]} />

      <DungeonProgressTrack challenged={introduced} total={total} bossUnlocked={run.keyFound} />

      {/* The scene window is always on screen — every state, every prompt. */}
      <div className="scene-window dungeon">
        <AssetImage category={scene.category} assetKey={scene.key} alt="Dungeon location" />
        {event && !inStandby && !rolling && (
          <div className="explore-event-overlay">
            <AssetImage category={event.imageCategory} assetKey={event.imageKey} alt={event.title} />
          </div>
        )}
        <span className="scene-tag">{inStandby || rolling ? 'Standby' : (event?.title ?? 'Standby')}</span>
        {rolling && <MoveRollModal resultTitle={null} onSettled={() => setRollSettled(true)} />}
      </div>

      {/* One dialogue window, always in the same place. It is deliberately
          NOT unmounted while the die is in the air — the text carries on
          through the roll and is replaced once the roll lands. */}
      {dialogueLines.length > 0 && run.state !== 'Rest' && (
        <TypewriterText
          key={dialogueKey}
          lines={dialogueLines}
          charsPerSecond={charsPerSecond}
          onRevealed={() => setRevealedKey(dialogueKey)}
        />
      )}

      <TotemPanel totem={totem} compact />

      {run.eventTimer && (
        <div className="timer-row">
          <span>⏱ {Math.ceil(run.eventTimer.remainingSeconds)}s</span>
          <div style={{ flex: 1 }}>
            <Bar value={run.eventTimer.remainingSeconds} max={run.eventTimer.totalSeconds} kind="timer" thin />
          </div>
        </div>
      )}

      {/* ---- Action slot: exactly one of these is live at a time ---- */}

      {rolling && (
        <button
          className="btn btn-primary btn-block"
          disabled={!rollSettled}
          onClick={() => {
            setRollSettled(false)
            finishRoll()
          }}
        >
          {rollSettled ? 'Continue →' : 'Rolling…'}
        </button>
      )}

      {inStandby && (
        <StandbyActions
          canEnterBoss={canEnterBoss(run)}
          bossDoorFound={run.bossDoorFound}
          keyFound={run.keyFound}
          restAreaFound={run.restAreaFound}
          onMove={move}
          onCheckTotem={() => openPanel('status')}
          onCheckWords={() => openPanel('words')}
          onUseItem={() => openPanel('items')}
          onEnterBoss={askEnterBossDoor}
          onReturnToRest={openRestArea}
        />
      )}

      {run.state === 'Rest' && (
        <RestAreaView
          totem={totem}
          usesSoFar={run.restUses}
          onRest={buyRest}
          onLeave={leaveRest}
        />
      )}

      {inEvent && dialogueRevealed && !answeringChallenge && (
        <>
          {(stage === 'intro' || stage === 'treasure_choice') && event?.type === 'treasure' && (
            <TreasureChoice onAttempt={attemptTreasure} onLeave={leaveTreasure} />
          )}

          {stage === 'direction_choice' && event?.directionChoices && (
            <DirectionChoices choices={event.directionChoices} onChoose={chooseDirection} />
          )}

          {stage === 'key_room' && <KeyRoomView onTake={takeKey} />}

          {stage === 'magic_room' && puzzle && (
            <MagicRoomView puzzle={puzzle} onGuess={guessSyllable} onFinish={finishMagicRoom} />
          )}

          {/* Reward / plain outcome acknowledgements. */}
          {(stage === 'reward' || stage === 'treasure_result') &&
            (run.pendingReward ? (
              <RewardSummary reward={run.pendingReward} onContinue={acknowledgeEvent} />
            ) : (
              <button className="btn btn-primary btn-block" onClick={acknowledgeEvent}>
                Continue →
              </button>
            ))}

          {stage === 'trap_result' && (
            <button className="btn btn-primary btn-block" onClick={acknowledgeEvent}>
              Continue →
            </button>
          )}

          {stage === 'intro' &&
            event &&
            event.type !== 'treasure' &&
            (event.type === 'boss_door' ? (
              <BossDoorNotice keyFound={run.keyFound} onContinue={acknowledgeEvent} />
            ) : (
              <button className="btn btn-primary btn-block" onClick={acknowledgeEvent}>
                {event.type === 'battle' ? '⚔️ Fight' : 'Continue →'}
              </button>
            ))}
        </>
      )}

      {answeringChallenge && (
        <ChallengeView
          challenge={event!.challenge!}
          answer={asksForKorean ? challengeSpell!.korean : challengeSpell!.english}
          decoyPool={answersInRun.map((sp) => (asksForKorean ? sp.korean : sp.english))}
          onSubmit={submitEventAnswer}
          submitLabel={event!.type === 'trap' ? 'Disarm!' : 'Unlock!'}
        />
      )}

      <div style={{ flex: 1 }} />

      {/* Entering the boss is irreversible — there is no way back to
          exploration afterwards — so it takes an explicit confirmation. */}
      {confirmingBoss && (
        <div className="overlay-backdrop" onClick={cancelEnterBossDoor}>
          <div className="confirm-dialog" onClick={(e) => e.stopPropagation()}>
            <h2>Enter the Boss Door?</h2>
            <p className="muted">
              The key turns once. You cannot return to exploring this dungeon — the run ends in victory or defeat.
            </p>
            <button className="btn btn-danger btn-block" onClick={enterBossDoor}>
              ⚔️ Enter
            </button>
            <button className="btn btn-ghost btn-block" onClick={cancelEnterBossDoor}>
              Not yet
            </button>
          </div>
        </div>
      )}

      {activePanel === 'words' && <WordInfoPanel run={run} battle={null} onClose={closePanel} />}
      {activePanel === 'items' && <ItemPanel inventory={inventory} onUse={useItem} onClose={closePanel} />}
      {activePanel === 'status' && (
        <StatusPanel totem={totem} run={run} totemSet={totemSet} challenged={introduced} onClose={closePanel} />
      )}
    </div>
  )
}
