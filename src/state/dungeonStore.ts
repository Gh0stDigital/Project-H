import { create } from 'zustand'
import type { Spell } from '@/domain/spell'
import type { DirectionChoice, DungeonConfig, DungeonRunState, RewardBundle } from '@/domain/dungeon'
import { emptyRewardBundle, introducedCount } from '@/domain/dungeon'
import type { BattleState } from '@/domain/battle'
import type { ItemId } from '@/domain/item'
import { battleBalance, dungeonTiers, rewardBalance, totemBalance } from '@/config/balance'
import { mimicBalance, treasureBalance, trapBalance } from '@/config/dungeonEvents'
import { getItemDef, itemBalance } from '@/config/items'
import { mimicRevealText } from '@/systems/eventContent'
import {
  startDungeon,
  generateNextEvent,
  applyDirectionChoice,
  applyRewardBundle,
  canEnterBoss,
  consumeKey,
  grantKey,
  markWordIntroduced,
  recordBossDefeated,
  recordEnemyDefeated,
  recordLevelUp,
  recordRestUsed,
  recordWordAttempt,
  setOutcomeText,
  setStandbyNotice,
  setState,
  startEventTimer,
  tickEventTimer as tickEventTimerPure,
  clearEventTimer,
  toStandby,
} from '@/systems/dungeonSession'
import {
  canMove,
  canOpenStandbyMenus,
  canOpenWordInfo,
  isRunOver,
} from '@/systems/dungeonState'
import {
  startBattle,
  spawnEnemy,
  spawnBoss,
  spawnMimic,
  beginPlayerChallenge,
  resolvePlayerAttack,
  beginEnemyChallenge,
  resolveDefensePrompt,
  tickTimer as engineTickTimer,
  returnToPlayerTurn,
  markDefeat,
  markRewardsGranted,
  selectableSpellIds,
} from '@/systems/battleEngine'
import { isFullyCleared } from '@/systems/bossPlateau'
import { createPuzzle, guess as applyGuess, type HangmanPuzzle } from '@/systems/hangman'
import { applyRest, quoteRest } from '@/systems/restArea'
import { buildRunReport, type RunReport } from '@/systems/runResults'
import type { AttemptKind } from '@/systems/wordStats'
import { resolveChallenge } from '@/systems/challengeEngine'
import { grantPlateauBonusXp } from '@/systems/spellCompendium'
import { applyItemToSpells, applyItemToTotem, countOf, itemUseText, rollItemDrop } from '@/systems/inventory'
import { addMoney, addTotemExperience, applyDamage, loseLifePoint } from '@/systems/totemManager'
import { usePersistentStore } from './persistentStore'

function findSpell(spells: Spell[], id: string): Spell | undefined {
  return spells.find((sp) => sp.id === id)
}

function resolveSpells(ids: string[], allSpells: Spell[]): Spell[] {
  return ids.map((id) => allSpells.find((s) => s.id === id)).filter((s): s is Spell => !!s)
}

/** Words introduced so far — drives the HUD and the Key Room gate. */
export function challengedCount(run: DungeonRunState): number {
  return introducedCount(run)
}

/** Which slide-over panel is open on top of the dungeon, if any. */
export type DungeonPanel = 'words' | 'items' | 'status'

/** Sub-mode within an event that the run state alone doesn't capture. */
export type EventStage =
  | 'intro'
  | 'treasure_choice'
  | 'treasure_result'
  | 'trap_answer'
  | 'trap_result'
  | 'magic_room'
  | 'direction_choice'
  | 'rest'
  | 'boss_door'
  | 'key_room'
  | 'reward'

interface DungeonStore {
  screenPhase: 'config' | 'run' | 'results'
  run: DungeonRunState | null
  battle: BattleState | null
  activePanel: DungeonPanel | null
  report: RunReport | null

  /** Where inside the current event we are. */
  stage: EventStage
  /** Live Magic Room puzzle, non-null only while one is being solved. */
  puzzle: HangmanPuzzle | null
  /** True while the dice animation is playing. */
  rolling: boolean
  /** Re-entrancy guard: blocks a second submit while one is being processed. */
  submitting: boolean
  /** True when the Rest Area was opened from Standby rather than an event. */
  restRevisit: boolean
  /** Boss-door confirmation is showing. Entering is irreversible. */
  confirmingBoss: boolean

  beginDungeon(config: DungeonConfig): void

  // Standby
  move(): void
  finishRoll(): void
  openRestArea(): void
  leaveRest(): void
  buyRest(): void
  askEnterBossDoor(): void
  cancelEnterBossDoor(): void
  enterBossDoor(): void
  useItem(itemId: ItemId): void
  abandonRun(): void

  // Events
  attemptTreasure(): void
  leaveTreasure(): void
  submitEventAnswer(text: string): void
  tickEventTimer(deltaSeconds: number): void
  triggerEventTimeout(): void
  guessSyllable(syllable: string): void
  finishMagicRoom(): void
  chooseDirection(choice: DirectionChoice): void
  takeKey(): void
  acknowledgeEvent(): void

  // Battle
  selectCard(spellId: string): void
  submitAttackAnswer(text: string): void
  continueAfterPlayerResolve(): void
  tickBattleTimer(deltaSeconds: number): void
  submitDefenseAnswer(text: string): void
  triggerDefenseTimeout(): void
  continueAfterEnemyResolve(): void
  continueAfterVictory(): void
  continueAfterDefeat(): void

  openPanel(panel: DungeonPanel): void
  closePanel(): void
  toggleWordInfo(): void
  exitToMenu(): void
}

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

function tierFor(run: DungeonRunState) {
  return dungeonTiers.find((t) => t.id === run.config.tierId)!
}

function totemDeckIds(run: DungeonRunState): string[] {
  return usePersistentStore.getState().spellSets.find((s) => s.id === run.config.totemSpellSetId)?.spellIds ?? []
}

/**
 * Credits a reward bundle to the player. Called exactly once per earned
 * reward, at the moment it is earned — the Results screen only reports.
 */
function creditReward(totemId: string, reward: RewardBundle) {
  const store = usePersistentStore.getState()
  if (reward.money !== 0 || reward.totemXp !== 0) {
    store.replaceTotem(totemId, (t) => {
      let next = t
      if (reward.money) next = addMoney(next, reward.money)
      if (reward.totemXp) next = addTotemExperience(next, reward.totemXp).totem
      return next
    })
  }
  for (const itemId of reward.itemIds) store.grantItem(itemId as ItemId)
}

/** Rolls an item drop and folds it into a bundle, with its display line. */
function addItemDrop(reward: RewardBundle, chance: number): RewardBundle {
  if (Math.random() >= chance) return reward
  const dropped = rollItemDrop()
  if (!dropped) return reward
  const def = getItemDef(dropped)
  return {
    ...reward,
    itemIds: [...reward.itemIds, dropped],
    lines: [...reward.lines, `${def.icon} ${def.name}`],
  }
}

/** Applies damage to the Totem, reporting whether it fell. */
function damageTotem(totemId: string, amount: number): boolean {
  let defeated = false
  usePersistentStore.getState().replaceTotem(totemId, (t) => {
    const next = applyDamage(t, amount)
    if (next.currentHp <= 0) defeated = true
    return next
  })
  return defeated
}

export const useDungeonStore = create<DungeonStore>()((set, get) => ({
  screenPhase: 'config',
  run: null,
  battle: null,
  activePanel: null,
  report: null,
  stage: 'intro',
  puzzle: null,
  rolling: false,
  submitting: false,
  restRevisit: false,
  confirmingBoss: false,

  beginDungeon(config) {
    set({
      run: startDungeon(config),
      battle: null,
      screenPhase: 'run',
      report: null,
      activePanel: null,
      stage: 'intro',
      puzzle: null,
      rolling: false,
      submitting: false,
      restRevisit: false,
      confirmingBoss: false,
    })
  },

  // -------------------------------------------------------------------------
  // Standby
  // -------------------------------------------------------------------------

  move() {
    const { run, battle, rolling } = get()
    // Movement is Standby-only and single-shot: this is what stops a Move
    // landing mid-event, mid-roll or mid-battle.
    if (!run || battle || rolling || !canMove(run.state)) return
    set({ rolling: true, run: setState(run, 'Rolling'), activePanel: null })
  },

  finishRoll() {
    const { run, rolling } = get()
    if (!run || !rolling) return
    const spells = resolveSpells(run.config.dungeonWordIds, usePersistentStore.getState().spells)
    const { run: rolled } = generateNextEvent(run, spells)

    // A Magic Room needs its puzzle built up front, and its target word
    // counts as introduced however the puzzle ends.
    if (rolled.currentEvent!.type === 'magic_room' && spells.length > 0) {
      const target = spells[Math.floor(Math.random() * spells.length)]
      const puzzle = createPuzzle(
        target.korean,
        spells.filter((s) => s.id !== target.id).map((s) => s.korean),
      )
      set({ run: markWordIntroduced(rolled, target.id), rolling: false, stage: 'intro', puzzle })
      return
    }

    set({ run: rolled, rolling: false, stage: 'intro', puzzle: null })
  },

  openRestArea() {
    const { run, battle } = get()
    if (!run || battle || !run.restAreaFound || !canMove(run.state)) return
    set({ run: setState(run, 'Rest'), stage: 'rest', restRevisit: true, activePanel: null })
  },

  leaveRest() {
    const { run } = get()
    if (!run) return
    set({ run: toStandby(run), stage: 'intro', restRevisit: false })
  },

  buyRest() {
    const { run, submitting } = get()
    if (!run || submitting || run.state !== 'Rest') return
    const store = usePersistentStore.getState()
    const totem = store.totems.find((t) => t.id === run.config.totemId)
    if (!totem) return
    const result = applyRest(totem, run.restUses)
    // applyRest returns null when unaffordable or already at full HP, so a
    // double-tap can never double-charge.
    if (!result) return

    set({ submitting: true })
    store.replaceTotem(totem.id, () => result.totem)
    set({
      run: recordRestUsed(run, result.spent),
      submitting: false,
    })
  },

  askEnterBossDoor() {
    const { run, battle } = get()
    if (!run || battle || !canMove(run.state) || !canEnterBoss(run)) return
    set({ confirmingBoss: true })
  },

  cancelEnterBossDoor() {
    set({ confirmingBoss: false })
  },

  enterBossDoor() {
    const { run, battle } = get()
    if (!run || battle || !canMove(run.state)) return
    // Hard gate: the door must be found, the key held, and unused.
    if (!canEnterBoss(run)) return

    const tier = tierFor(run)
    const boss = spawnBoss(`boss-${run.startedAt}`, tier, run.config.dungeonWordIds.length)
    const bossBattle = startBattle(boss, totemDeckIds(run), run.config.dungeonWordIds)
    const run2 = consumeKey(setState(run, 'BossBattle'))
    set({ run: { ...run2, currentEvent: null, standbyNotice: null }, battle: bossBattle, stage: 'intro', activePanel: null, confirmingBoss: false })
  },

  useItem(itemId) {
    const { run } = get()
    if (!run || !canOpenStandbyMenus(run.state)) return
    const store = usePersistentStore.getState()
    if (countOf(store.inventory, itemId) <= 0) return

    const def = getItemDef(itemId)

    // An Escape Rope is how the player leaves a dungeon: it ends the run
    // as a voluntary retreat, which costs no Life Point.
    if (def.effect.kind === 'escape') {
      store.consumeItem(itemId)
      set({ activePanel: null })
      finishRun(set, get, { abandoned: true, totemDefeated: false })
      return
    }

    store.replaceTotem(run.config.totemId, (t) => applyItemToTotem(t, def))
    if (def.effect.kind === 'charge') {
      store.replaceSpells((spells) => applyItemToSpells(spells, totemDeckIds(run), def))
    }
    store.consumeItem(itemId)
    set({ run: setStandbyNotice(run, itemUseText(def)), activePanel: null })
  },

  abandonRun() {
    const { run } = get()
    if (!run || isRunOver(run.state)) return
    finishRun(set, get, { abandoned: true, totemDefeated: false })
  },

  // -------------------------------------------------------------------------
  // Events
  // -------------------------------------------------------------------------

  attemptTreasure() {
    const { run } = get()
    if (!run || run.state !== 'ResolvingEvent' || run.currentEvent?.type !== 'treasure') return
    set({ run: setState(run, 'VocabularyInput'), stage: 'treasure_choice' })
  },

  leaveTreasure() {
    const { run } = get()
    if (!run || run.state !== 'ResolvingEvent') return
    set({ run: toStandby(setOutcomeText(run, ['You leave the chest untouched.']), 'You left a chest behind.'), stage: 'intro' })
  },

  submitEventAnswer(text) {
    submitEvent(set, get, text, false)
  },

  tickEventTimer(deltaSeconds) {
    const { run } = get()
    if (!run || !run.eventTimer || !run.eventTimer.running) return
    const next = tickEventTimerPure(run, deltaSeconds)
    set({ run: next })
    if (next.eventTimer && next.eventTimer.remainingSeconds <= 0) get().triggerEventTimeout()
  },

  triggerEventTimeout() {
    submitEvent(set, get, '', true)
  },

  guessSyllable(syllable) {
    const { puzzle, run } = get()
    if (!puzzle || !run || puzzle.status !== 'playing') return
    // A repeated guess is a no-op inside applyGuess — it costs no attempt.
    set({ puzzle: applyGuess(puzzle, syllable) })
  },

  finishMagicRoom() {
    const { puzzle, run, submitting } = get()
    if (!puzzle || !run || submitting || puzzle.status === 'playing') return
    set({ submitting: true })

    if (puzzle.status !== 'solved') {
      set({
        run: toStandby(run, 'The magic door sealed itself for good.'),
        stage: 'intro',
        puzzle: null,
        submitting: false,
      })
      return
    }

    let reward: RewardBundle = {
      money: treasureBalance.magicRoomMoney,
      totemXp: treasureBalance.magicRoomTotemXp,
      itemIds: [],
      lines: [`💰 ${treasureBalance.magicRoomMoney}`, `✨ ${treasureBalance.magicRoomTotemXp} Totem XP`],
    }
    reward = addItemDrop(reward, treasureBalance.magicRoomItemChance)
    creditReward(run.config.totemId, reward)

    set({
      run: setOutcomeText(applyRewardBundle(run, reward), ['The glyphs unwind. The room opens.']),
      stage: 'reward',
      puzzle: null,
      submitting: false,
    })
  },

  chooseDirection(choice) {
    const { run, submitting } = get()
    if (!run || submitting || run.state !== 'ResolvingEvent') return
    if (run.currentEvent?.type !== 'direction') return
    // Only one path may ever be taken; the run leaves ResolvingEvent
    // immediately so a second tap finds nothing to act on.
    set({ submitting: true })
    const run2 = applyDirectionChoice(run, choice)
    set({
      run: toStandby(run2, `You take ${choice.label}.`),
      stage: 'intro',
      submitting: false,
    })
  },

  takeKey() {
    const { run, submitting } = get()
    if (!run || submitting || run.state !== 'ResolvingEvent') return
    if (run.currentEvent?.type !== 'key_room') return
    set({ submitting: true })
    // grantKey is idempotent — a run can never mint two keys.
    set({
      run: toStandby(grantKey(run), '🗝️ You obtained the dungeon key.'),
      stage: 'intro',
      submitting: false,
    })
  },

  acknowledgeEvent() {
    const { run, stage } = get()
    if (!run) return
    const event = run.currentEvent

    // Stages that mean "this event is finished" always return to Standby.
    // Without this an event whose battle or answer already resolved (a
    // mimic chest, say) would be offered a second time — and pay out a
    // second time with it.
    if (stage === 'reward' || stage === 'treasure_result' || stage === 'trap_result') {
      set({ run: toStandby(run), stage: 'intro' })
      return
    }

    if (run.state === 'ResolvingEvent' && event?.type === 'battle') {
      const tier = tierFor(run)
      const enemy = spawnEnemy(event.id, tier)
      set({
        run: setState(run, 'Battle'),
        battle: startBattle(enemy, totemDeckIds(run), null),
        stage: 'intro',
      })
      return
    }
    if (run.state === 'ResolvingEvent' && event?.type === 'rest') {
      set({ run: setState(run, 'Rest'), stage: 'rest', restRevisit: false })
      return
    }
    if (run.state === 'ResolvingEvent' && event?.type === 'magic_room') {
      set({ stage: 'magic_room' })
      return
    }
    if (run.state === 'ResolvingEvent' && event?.type === 'direction') {
      set({ stage: 'direction_choice' })
      return
    }
    if (run.state === 'ResolvingEvent' && event?.type === 'boss_door') {
      set({ run: toStandby(run, '🚪 You mark the Boss Door on your map.'), stage: 'intro' })
      return
    }
    if (run.state === 'ResolvingEvent' && event?.type === 'key_room') {
      set({ stage: 'key_room' })
      return
    }
    if (run.state === 'ResolvingEvent' && event?.type === 'treasure') {
      set({ stage: 'treasure_choice' })
      return
    }
    if (run.state === 'ResolvingEvent' && event?.type === 'trap') {
      // Traps are timed: the countdown starts the moment the prompt does.
      set({ run: startEventTimer(setState(run, 'VocabularyInput'), trapBalance.timerSeconds), stage: 'trap_answer' })
      return
    }
    set({ run: toStandby(run), stage: 'intro' })
  },

  // -------------------------------------------------------------------------
  // Battle
  // -------------------------------------------------------------------------

  selectCard(spellId) {
    const { battle } = get()
    if (!battle || battle.phase !== 'player_select') return
    const spell = findSpell(usePersistentStore.getState().spells, spellId)
    if (!spell) return
    set({ battle: beginPlayerChallenge(battle, spell) })
  },

  submitAttackAnswer(text) {
    const { battle, run, submitting } = get()
    if (!battle || !run || submitting) return
    if (battle.phase !== 'player_challenge' || !battle.activeChallenge) return
    const spellId = battle.activeChallenge.spellId
    const spell = findSpell(usePersistentStore.getState().spells, spellId)
    if (!spell) return

    set({ submitting: true })
    const outcome = resolvePlayerAttack(battle, spell, text)

    let finalSpell = outcome.resolution.spell
    let totalXp = outcome.resolution.xpGained
    const fromLevel = outcome.resolution.leveledUp.fromLevel
    let toLevel = outcome.resolution.leveledUp.toLevel

    if (outcome.plateauCleared) {
      const bonus = grantPlateauBonusXp(finalSpell)
      finalSpell = bonus.spell
      totalXp += bonus.xpGained
      toLevel = bonus.leveledUp.toLevel
    }
    usePersistentStore
      .getState()
      .replaceSpells((spells) => spells.map((s) => (s.id === finalSpell.id ? finalSpell : s)))

    let run2 = recordWordAttempt(run, spellId, 'attack', outcome.resolution.correct)
    if (toLevel > fromLevel) run2 = recordLevelUp(run2, spellId, fromLevel, toLevel)
    run2 = { ...run2, stats: { ...run2.stats, spellXpEarned: run2.stats.spellXpEarned + totalXp } }

    set({ battle: outcome.state, run: run2, submitting: false })
  },

  continueAfterPlayerResolve() {
    const { battle, run } = get()
    if (!battle || !run) return
    if (battle.phase === 'victory') {
      get().continueAfterVictory()
      return
    }
    const dungeonSpells = resolveSpells(run.config.dungeonWordIds, usePersistentStore.getState().spells)
    const timerSeconds = usePersistentStore.getState().settings.enemyTimerSeconds
    set({ battle: beginEnemyChallenge(battle, dungeonSpells, timerSeconds) })
  },

  tickBattleTimer(deltaSeconds) {
    const { battle } = get()
    if (!battle || !battle.timer || !battle.timer.running) return
    const next = engineTickTimer(battle, deltaSeconds)
    set({ battle: next })
    if (next.timer && next.timer.remainingSeconds <= 0) get().triggerDefenseTimeout()
  },

  submitDefenseAnswer(text) {
    resolveDefense(set, get, text, false)
  },

  triggerDefenseTimeout() {
    resolveDefense(set, get, '', true)
  },

  continueAfterEnemyResolve() {
    const { battle } = get()
    if (!battle) return
    if (battle.phase === 'defeat') {
      get().continueAfterDefeat()
      return
    }
    set({ battle: returnToPlayerTurn(battle) })
  },

  continueAfterVictory() {
    const { battle, run } = get()
    if (!battle || !run) return
    // Single-shot: rewards are paid once, however many times this is called.
    if (battle.rewardsGranted) return
    const totemId = run.config.totemId
    const wasMimic = battle.enemy.kind === 'mimic'

    if (battle.isBoss) {
      let reward: RewardBundle = {
        money: rewardBalance.bossMoneyReward,
        totemXp: totemBalance.xpPerBossWin,
        itemIds: [],
        lines: [`💰 ${rewardBalance.bossMoneyReward}`, `✨ ${totemBalance.xpPerBossWin} Totem XP`],
      }
      for (let i = 0; i < itemBalance.bossDropCount; i++) reward = addItemDrop(reward, 1)
      creditReward(totemId, reward)
      usePersistentStore.getState().replaceTotem(totemId, (t) => ({
        ...t,
        stats: {
          ...t.stats,
          bossesDefeated: t.stats.bossesDefeated + 1,
          dungeonsCompleted: t.stats.dungeonsCompleted + 1,
        },
      }))

      const run2 = applyRewardBundle(recordBossDefeated(run), reward)
      set({ battle: markRewardsGranted(battle), run: run2 })
      finishRun(set, get, { abandoned: false, totemDefeated: false })
      return
    }

    const xp = Math.round(totemBalance.xpPerBattleWin * (wasMimic ? mimicBalance.xpMultiplier : 1))
    const money = Math.round(battleBalance.enemyMoneyReward * (wasMimic ? mimicBalance.moneyMultiplier : 1))
    let reward: RewardBundle = {
      money,
      totemXp: xp,
      itemIds: [],
      lines: [`💰 ${money}`, `✨ ${xp} Totem XP`],
    }
    reward = addItemDrop(reward, battleBalance.enemyItemDropChance)
    if (wasMimic && Math.random() < mimicBalance.exclusiveDropChance) {
      reward = {
        ...reward,
        money: reward.money + mimicBalance.exclusiveDropMoney,
        lines: [...reward.lines, `🎁 Mimic hoard: 💰 ${mimicBalance.exclusiveDropMoney}`],
      }
    }
    creditReward(totemId, reward)

    // Clearing `battle` is what hands the screen back to ExploreView so the
    // reward panel can show; leaving it set would strand the player in a
    // finished BattleView with nothing left to press.
    const run2 = applyRewardBundle(recordEnemyDefeated(run, wasMimic), reward)
    set({
      battle: null,
      run: setState(setOutcomeText(run2, [`${battle.enemy.name} falls.`]), 'ResolvingEvent'),
      stage: 'reward',
    })
  },

  continueAfterDefeat() {
    const { run } = get()
    if (!run) return
    finishRun(set, get, { abandoned: false, totemDefeated: true })
  },

  openPanel(panel) {
    const { run } = get()
    if (!run) return
    if (panel === 'words' ? !canOpenWordInfo(run.state) : !canOpenStandbyMenus(run.state)) return
    set({ activePanel: panel })
  },
  closePanel() {
    set({ activePanel: null })
  },
  toggleWordInfo() {
    const { run, activePanel, battle } = get()
    if (!run) return
    if (activePanel === 'words') {
      set({ activePanel: null })
      return
    }
    if (!canOpenWordInfo(run.state)) return
    // The Words panel lists every word with its meaning, so it stays shut
    // while a battle prompt is on screen — timed or not, it would just be
    // the answer.
    if (battle && (battle.phase === 'player_challenge' || battle.phase === 'enemy_challenge')) return
    set({ activePanel: 'words' })
  },

  exitToMenu() {
    set({
      screenPhase: 'config',
      run: null,
      battle: null,
      report: null,
      activePanel: null,
      stage: 'intro',
      puzzle: null,
      rolling: false,
      submitting: false,
      restRevisit: false,
      confirmingBoss: false,
    })
  },
}))

// ---------------------------------------------------------------------------
// Internal resolution helpers
// ---------------------------------------------------------------------------

type SetFn = (partial: Partial<DungeonStore>) => void
type GetFn = () => DungeonStore

/**
 * Resolves an event vocabulary prompt — a treasure lock or a trap.
 *
 * Both the player's submission and the trap timer's auto-fail come through
 * here, and the `submitting` guard means a submit landing at the same
 * instant as the timeout can only be counted once.
 */
function submitEvent(set: SetFn, get: GetFn, text: string, timedOut: boolean) {
  const { run, submitting } = get()
  if (!run || submitting || run.state !== 'VocabularyInput') return
  const event = run.currentEvent
  if (!event?.challenge) return
  const spell = findSpell(usePersistentStore.getState().spells, event.challenge.spellId)
  if (!spell) return

  set({ submitting: true })

  const kind: AttemptKind = event.type === 'trap' ? 'defense' : 'attack'
  // A timeout is graded as an answer that can never match, so it goes
  // through the same stat bookkeeping as a wrong answer.
  const submitted = timedOut ? `__timeout__${event.id}` : text
  const resolution = resolveChallenge(spell, event.challenge, submitted, kind)
  usePersistentStore
    .getState()
    .replaceSpells((spells) => spells.map((sp) => (sp.id === resolution.spell.id ? resolution.spell : sp)))

  let run2 = recordWordAttempt(clearEventTimer(run), spell.id, kind, resolution.correct)
  if (resolution.leveledUp.leveledUp) {
    run2 = recordLevelUp(run2, spell.id, resolution.leveledUp.fromLevel, resolution.leveledUp.toLevel)
  }
  run2 = { ...run2, stats: { ...run2.stats, spellXpEarned: run2.stats.spellXpEarned + resolution.xpGained } }

  if (event.type === 'trap') {
    resolveTrap(set, get, run2, resolution.correct, timedOut)
    return
  }
  resolveTreasure(set, run2, resolution.correct)
}

function resolveTrap(set: SetFn, get: GetFn, run: DungeonRunState, correct: boolean, timedOut = false) {
  const tier = tierFor(run)
  if (correct) {
    set({
      run: setOutcomeText(run, ['You freeze — then step clear. The trap never fires.']),
      stage: 'trap_result',
      submitting: false,
    })
    return
  }

  const damage = Math.round(trapBalance.baseDamage * tier.enemyDamageMultiplier)
  const defeated = damageTotem(run.config.totemId, damage)
  const totem = usePersistentStore.getState().totems.find((t) => t.id === run.config.totemId)
  set({
    run: setOutcomeText(run, [
      timedOut ? 'Too slow — the mechanism fires!' : 'Wrong! The mechanism fires!',
      `You take ${damage} damage.`,
      `HP: ${Math.max(0, totem?.currentHp ?? 0)}/${totem?.maxHp ?? 0}`,
    ]),
    stage: 'trap_result',
    submitting: false,
  })
  if (defeated) finishRun(set, get, { abandoned: false, totemDefeated: true })
}

function resolveTreasure(set: SetFn, run: DungeonRunState, correct: boolean) {
  if (!correct) {
    set({
      run: setOutcomeText(run, ['The lock shears with a snap.', 'This chest will never open now.']),
      stage: 'treasure_result',
      submitting: false,
    })
    return
  }

  // A correctly opened chest may turn out to be a Mimic.
  if (Math.random() < treasureBalance.mimicChance) {
    const tier = tierFor(run)
    const mimic = spawnMimic(run.currentEvent!.id, tier)
    set({
      run: setOutcomeText(setState(run, 'Battle'), mimicRevealText),
      battle: startBattle(mimic, totemDeckIds(run), null),
      stage: 'intro',
      submitting: false,
    })
    return
  }

  let reward: RewardBundle = {
    ...emptyRewardBundle(),
    money: treasureBalance.baseMoney,
    lines: [`💰 ${treasureBalance.baseMoney}`],
  }
  reward = addItemDrop(reward, treasureBalance.itemDropChance)
  creditReward(run.config.totemId, reward)

  set({
    run: setOutcomeText(applyRewardBundle(run, reward), ['The lock gives. The lid swings open.']),
    stage: 'treasure_result',
    submitting: false,
  })
}

function resolveDefense(set: SetFn, get: GetFn, text: string, timedOut: boolean) {
  const { battle, run, submitting } = get()
  if (!battle || !run || submitting) return
  if (battle.phase !== 'enemy_challenge' || !battle.activeChallenge || !battle.defense) return

  const spellId = battle.activeChallenge.spellId
  const spell = findSpell(usePersistentStore.getState().spells, spellId)
  if (!spell) return

  set({ submitting: true })
  const timerSeconds = usePersistentStore.getState().settings.enemyTimerSeconds
  const outcome = resolveDefensePrompt(battle, spell, text, timedOut, timerSeconds)

  let finalSpell = outcome.resolution.spell
  let totalXp = outcome.resolution.xpGained
  const fromLevel = outcome.resolution.leveledUp.fromLevel
  let toLevel = outcome.resolution.leveledUp.toLevel

  if (outcome.plateauCleared) {
    const bonus = grantPlateauBonusXp(finalSpell)
    finalSpell = bonus.spell
    totalXp += bonus.xpGained
    toLevel = bonus.leveledUp.toLevel
  }
  usePersistentStore
    .getState()
    .replaceSpells((spells) => spells.map((s) => (s.id === finalSpell.id ? finalSpell : s)))

  let run2 = recordWordAttempt(run, spellId, 'defense', outcome.resolution.correct)
  if (toLevel > fromLevel) run2 = recordLevelUp(run2, spellId, fromLevel, toLevel)
  run2 = { ...run2, stats: { ...run2.stats, spellXpEarned: run2.stats.spellXpEarned + totalXp } }

  let battleAfter = outcome.state
  let defeated = false
  if (outcome.sequenceComplete && outcome.damageToTotem > 0) {
    defeated = damageTotem(run.config.totemId, outcome.damageToTotem)
    if (defeated) battleAfter = markDefeat(battleAfter)
  }

  set({ battle: battleAfter, run: run2, submitting: false })
}

/**
 * Ends the run exactly once and builds the report.
 *
 * A defeat costs exactly one Life Point here and nowhere else, so no
 * combination of trap damage, enemy damage and re-renders can take two.
 */
function finishRun(
  set: SetFn,
  get: GetFn,
  { abandoned, totemDefeated }: { abandoned: boolean; totemDefeated: boolean },
) {
  const { run } = get()
  if (!run || isRunOver(run.state)) return

  const store = usePersistentStore.getState()
  const before = store.totems.find((t) => t.id === run.config.totemId)
  const levelBefore = before?.level ?? 1

  let lifePointLost = false
  let totemDestroyed = false
  if (totemDefeated) {
    store.replaceTotem(run.config.totemId, (t) => {
      const result = loseLifePoint(t)
      lifePointLost = result.lifePointLost
      totemDestroyed = result.becameDestroyed || t.destroyed
      return result.totem
    })
  }

  const after = usePersistentStore.getState().totems.find((t) => t.id === run.config.totemId)
  const run2: DungeonRunState = {
    ...run,
    state: 'Results',
    stats: {
      ...run.stats,
      abandoned,
      totemDefeated,
      lifePointsRemaining: after?.lifePoints ?? 0,
      lifePointLost,
      totemDestroyed,
    },
  }

  const report = buildRunReport({
    run: run2,
    spells: usePersistentStore.getState().spells,
    totemHp: after?.currentHp ?? 0,
    totemMaxHp: after?.maxHp ?? 0,
    totemLevelBefore: levelBefore,
    totemLevelAfter: after?.level ?? levelBefore,
  })

  set({ run: run2, battle: null, report, screenPhase: 'results', activePanel: null, puzzle: null, rolling: false })
}

export { selectableSpellIds, isFullyCleared, quoteRest }
