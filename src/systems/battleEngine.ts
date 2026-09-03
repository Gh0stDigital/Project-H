import type { Spell } from '@/domain/spell'
import type { BattleState, DefenseSequence, EnemyCombatant, PlateauRequirement } from '@/domain/battle'
import type { Challenge } from '@/domain/challenge'
import { battleBalance, type DungeonTierDef } from '@/config/balance'
import { mimicBalance } from '@/config/dungeonEvents'
import { pickFlavor } from '@/config/assets'
import { buildDeck, playCard, visibleCards } from './deck'
import { generateChallenge, resolveChallenge, type ChallengeResolution } from './challengeEngine'
import { buildPlateau, clearRequirement, isFullyCleared } from './bossPlateau'
import { damageForSpell } from './spellProgression'
import { makeId } from './idGen'

/**
 * Turn-based battle state machine. Pure functions only — React components
 * and the dungeon store call these and re-render from the returned state.
 * Vocabulary data (Spells) is always passed in by the caller; this module
 * never reads or writes the Compendium directly.
 */

function keyOf(url: string): string {
  return url.split('/').pop()!.replace('.png', '')
}

export function spawnEnemy(seed: string, tier: DungeonTierDef): EnemyCombatant {
  const hp = 26 + Math.round(tier.enemyDamageMultiplier * 10)
  return {
    kind: 'enemy',
    name: 'Wandering Foe',
    imageCategory: 'enemies',
    imageKey: keyOf(pickFlavor('enemies', seed)),
    battleBgKey: keyOf(pickFlavor('battlebg', seed)),
    maxHp: hp,
    currentHp: hp,
    damage: Math.round(battleBalance.baseEnemyDamage * tier.enemyDamageMultiplier),
  }
}

/**
 * A Mimic: an ordinary foe's shape, but tougher, angrier and worth more.
 * Spawned only from an opened treasure chest.
 */
export function spawnMimic(seed: string, tier: DungeonTierDef): EnemyCombatant {
  const base = spawnEnemy(seed, tier)
  const hp = Math.round(base.maxHp * mimicBalance.hpMultiplier)
  return {
    ...base,
    kind: 'mimic',
    name: 'Mimic',
    imageCategory: 'treasure',
    imageKey: 'open',
    maxHp: hp,
    currentHp: hp,
    damage: Math.round(base.damage * mimicBalance.damageMultiplier),
  }
}

export function spawnBoss(seed: string, tier: DungeonTierDef, wordCount: number): EnemyCombatant {
  const hp = battleBalance.bossBaseHp + wordCount * battleBalance.bossHpPerWord
  return {
    kind: 'boss',
    name: 'Boss Guardian',
    imageCategory: 'bosses',
    imageKey: keyOf(pickFlavor('bosses', seed)),
    battleBgKey: 'boss',
    maxHp: hp,
    currentHp: hp,
    damage: Math.round(battleBalance.baseEnemyDamage * 1.4 * tier.enemyDamageMultiplier),
  }
}

export function startBattle(
  enemy: EnemyCombatant,
  totemDeckSpellIds: string[],
  dungeonWordIds: string[] | null,
): BattleState {
  const isBoss = enemy.kind === 'boss'
  return {
    enemy,
    isBoss,
    plateau: isBoss && dungeonWordIds ? buildPlateau(dungeonWordIds) : null,
    deck: buildDeck(totemDeckSpellIds),
    phase: 'player_select',
    activeChallenge: null,
    defense: null,
    timer: null,
    log: [isBoss ? 'The boss blocks your path!' : `${enemy.name} appears!`],
    totemDamageTakenThisBattle: 0,
    lastResult: null,
    rewardsGranted: false,
  }
}

/**
 * Cards the player may attack with.
 *
 * While a boss barrier is up the *whole dungeon word set* stays selectable,
 * not just the rotating hand — otherwise a word buried in the deck could
 * lock the barrier shut. A failed attempt never removes a word either: the
 * card returns to the deck, so nothing becomes permanently unavailable.
 */
export function selectableSpellIds(state: BattleState, dungeonWordIds: string[] | null): string[] {
  const barrierUp = state.isBoss && state.plateau && !isFullyCleared(state.plateau)
  if (barrierUp && dungeonWordIds && dungeonWordIds.length > 0) {
    const seen = new Set<string>()
    return [...dungeonWordIds, ...state.deck.order].filter((id) => {
      if (seen.has(id)) return false
      seen.add(id)
      return true
    })
  }
  return visibleHand(state)
}

export function visibleHand(state: BattleState, count: number = battleBalance.visibleHandSize): string[] {
  return visibleCards(state.deck, count)
}

export function beginPlayerChallenge(state: BattleState, spell: Spell): BattleState {
  // Attacking: the card shows a masked clue built from the English meaning
  // (Courage -> C_____E) and the player supplies the Korean word. The full
  // English is never shown on the card front or in the prompt.
  const challenge = generateChallenge(spell, 'attack', 'eng_to_kor')
  return { ...state, phase: 'player_challenge', activeChallenge: challenge, lastResult: null }
}

/**
 * The clue shown on an attack card: the first and last letter of the
 * English meaning, capitalised — "Anxiety" becomes "AY". Just enough to
 * tell the cards apart without handing over the answer the player is
 * about to be asked to produce.
 */
export function attackCardClue(english: string): string {
  const first = english.trim().split(/\s+/)[0] ?? ''
  if (first.length === 0) return '??'
  if (first.length === 1) return first.toUpperCase()
  return `${first[0]}${first[first.length - 1]}`.toUpperCase()
}

export interface AttackOutcome {
  state: BattleState
  resolution: ChallengeResolution
  damageDealt: number
  plateauCleared: boolean
}

/** Resolves the player's attack submission. Advances the deck either way. */
export function resolvePlayerAttack(state: BattleState, spell: Spell, submitted: string): AttackOutcome {
  const challenge = state.activeChallenge as Challenge
  const resolution = resolveChallenge(spell, challenge, submitted, 'attack')

  let plateau = state.plateau
  let plateauCleared = false
  let damageDealt = 0
  let enemy = state.enemy

  if (resolution.correct) {
    const plateauActive = state.isBoss && plateau && !isFullyCleared(plateau)
    if (plateauActive && plateau!.some((r) => r.spellId === spell.id && !r.cleared)) {
      plateau = clearRequirement(plateau!, spell.id)
      plateauCleared = true
    }
    const stillBlocked = state.isBoss && plateau && !isFullyCleared(plateau)
    if (!stillBlocked) {
      damageDealt = damageForSpell(resolution.spell)
      enemy = { ...enemy, currentHp: Math.max(0, enemy.currentHp - damageDealt) }
    }
  }

  const deck = playCard(state.deck, spell.id)
  const log = [
    ...state.log,
    resolution.correct
      ? damageDealt > 0
        ? `${spell.korean} lands for ${damageDealt} damage!`
        : `${spell.korean} strikes true, but the Plateau absorbs it.`
      : `You mistranslate "${challenge.prompt}" — the attack fizzles.`,
  ]

  const nextPhase = enemy.currentHp <= 0 ? 'victory' : 'player_resolve'

  return {
    state: {
      ...state,
      enemy,
      deck,
      plateau,
      phase: nextPhase,
      activeChallenge: null,
      log,
      lastResult: resolution.correct ? 'correct' : 'incorrect',
    },
    resolution,
    damageDealt,
    plateauCleared,
  }
}

/**
 * Starts an enemy attack, which may demand several defense prompts in a
 * row. Prompts show the Korean word; the player supplies an accepted
 * English meaning under a visible timer.
 */
export function beginEnemyChallenge(
  state: BattleState,
  dungeonSpells: Spell[],
  timerSeconds: number,
  rng: () => number = Math.random,
): BattleState {
  if (dungeonSpells.length === 0) {
    return { ...state, phase: 'enemy_intro', activeChallenge: null, defense: null, timer: null }
  }

  const count = defensePromptCount(state.isBoss, dungeonSpells.length, rng)
  const challenges: Challenge[] = []
  const used = new Set<string>()
  for (let i = 0; i < count; i++) {
    // Prefer distinct words per attack, but never loop forever on a tiny pool.
    let spell = dungeonSpells[Math.floor(rng() * dungeonSpells.length)]
    for (let tries = 0; tries < 8 && used.has(spell.id) && used.size < dungeonSpells.length; tries++) {
      spell = dungeonSpells[Math.floor(rng() * dungeonSpells.length)]
    }
    used.add(spell.id)
    challenges.push(generateChallenge(spell, 'defense', 'kor_to_eng'))
  }

  const defense: DefenseSequence = { challenges, index: 0, results: [] }
  return {
    ...state,
    phase: 'enemy_challenge',
    defense,
    activeChallenge: challenges[0],
    timer: { totalSeconds: timerSeconds, remainingSeconds: timerSeconds, running: true },
    lastResult: null,
  }
}

/** How many words this attack demands. Bosses lean harder on multi-word. */
export function defensePromptCount(isBoss: boolean, poolSize: number, rng: () => number): number {
  const chance = isBoss ? battleBalance.bossMultiPromptChance : battleBalance.multiPromptChance
  const max = Math.min(
    poolSize,
    isBoss ? battleBalance.bossMaxDefensePrompts : battleBalance.maxDefensePrompts,
  )
  if (max <= battleBalance.minDefensePrompts) return battleBalance.minDefensePrompts
  if (rng() >= chance) return battleBalance.minDefensePrompts
  const extra = 1 + Math.floor(rng() * (max - battleBalance.minDefensePrompts))
  return Math.min(max, battleBalance.minDefensePrompts + extra)
}

export function tickTimer(state: BattleState, deltaSeconds: number): BattleState {
  if (!state.timer || !state.timer.running) return state
  const remainingSeconds = Math.max(0, state.timer.remainingSeconds - deltaSeconds)
  return { ...state, timer: { ...state.timer, remainingSeconds } }
}

export function setTimerRunning(state: BattleState, running: boolean): BattleState {
  if (!state.timer) return state
  return { ...state, timer: { ...state.timer, running } }
}

/**
 * Damage from an enemy attack, given how many of its prompts were answered
 * correctly.
 *
 * Partial defense already existed for single prompts (a correct answer let
 * `defendedDamageFraction` through rather than zero), so multi-prompt
 * attacks extend the same idea: damage scales linearly from full damage at
 * zero correct down to that same reduced fraction at all correct.
 */
export function defenseDamage(enemyDamage: number, correct: number, total: number): number {
  if (total <= 0) return 0
  const ratio = correct / total
  const floor = battleBalance.defendedDamageFraction
  const multiplier = 1 - ratio * (1 - floor)
  return Math.round(enemyDamage * multiplier)
}

export interface DefensePromptOutcome {
  state: BattleState
  resolution: ChallengeResolution
  /** The spell this prompt asked about. */
  spellId: string
  /** True once every prompt in the attack has been answered. */
  sequenceComplete: boolean
  /** Only meaningful when sequenceComplete — 0 until then. */
  damageToTotem: number
  plateauCleared: boolean
}

/**
 * Resolves ONE prompt of the current enemy attack. When more prompts
 * remain the state advances to the next one with a fresh timer; when the
 * last one is answered the accumulated damage is applied.
 */
export function resolveDefensePrompt(
  state: BattleState,
  spell: Spell,
  submitted: string,
  timedOut: boolean,
  timerSeconds: number,
): DefensePromptOutcome {
  const defense = state.defense!
  const challenge = defense.challenges[defense.index]
  const resolution = timedOut
    ? forceIncorrect(spell, challenge)
    : resolveChallenge(spell, challenge, submitted, 'defense')

  // A correct defense counts toward the boss barrier, exactly like a
  // correct attack — which is what stops the barrier soft-locking.
  let plateau = state.plateau
  let plateauCleared = false
  if (resolution.correct && state.isBoss && plateau) {
    const req = plateau.find((r) => r.spellId === spell.id && !r.cleared)
    if (req) {
      plateau = clearRequirement(plateau, spell.id)
      plateauCleared = true
    }
  }

  const results = [...defense.results, resolution.correct]
  const nextIndex = defense.index + 1
  const complete = nextIndex >= defense.challenges.length

  const log = [
    ...state.log,
    resolution.correct
      ? `You recall "${challenge.prompt}" in time.`
      : timedOut
        ? `Too slow! "${challenge.prompt}" goes unanswered.`
        : `Wrong meaning for "${challenge.prompt}".`,
  ]

  if (!complete) {
    return {
      state: {
        ...state,
        plateau,
        defense: { ...defense, index: nextIndex, results },
        activeChallenge: defense.challenges[nextIndex],
        timer: { totalSeconds: timerSeconds, remainingSeconds: timerSeconds, running: true },
        log,
        lastResult: resolution.correct ? 'correct' : 'incorrect',
      },
      resolution,
      spellId: spell.id,
      sequenceComplete: false,
      damageToTotem: 0,
      plateauCleared,
    }
  }

  const correctCount = results.filter(Boolean).length
  const damageToTotem = defenseDamage(state.enemy.damage, correctCount, results.length)
  const summary =
    correctCount === results.length
      ? `Attack blocked — only ${damageToTotem} damage gets through.`
      : correctCount === 0
        ? `The attack lands in full for ${damageToTotem} damage!`
        : `Partly blocked — ${correctCount}/${results.length} correct, ${damageToTotem} damage taken.`

  return {
    state: {
      ...state,
      plateau,
      phase: 'enemy_resolve',
      defense: { ...defense, index: nextIndex, results },
      activeChallenge: null,
      timer: null,
      totemDamageTakenThisBattle: state.totemDamageTakenThisBattle + damageToTotem,
      log: [...log, summary],
      lastResult: correctCount === results.length ? 'correct' : 'incorrect',
    },
    resolution,
    spellId: spell.id,
    sequenceComplete: true,
    damageToTotem,
    plateauCleared,
  }
}

function forceIncorrect(spell: Spell, challenge: Challenge): ChallengeResolution {
  // Re-use resolveChallenge's stat bookkeeping by submitting a value that
  // can never match, guaranteeing an "incorrect" result on timeout.
  return resolveChallenge(spell, challenge, `__timeout__${makeId('x')}`, 'defense')
}

export function returnToPlayerTurn(state: BattleState): BattleState {
  if (state.enemy.currentHp <= 0) return { ...state, phase: 'victory', defense: null }
  return { ...state, phase: 'player_select', defense: null, activeChallenge: null, timer: null }
}

/** Flipped once a victory's rewards have been paid out, so they can't repeat. */
export function markRewardsGranted(state: BattleState): BattleState {
  return { ...state, rewardsGranted: true }
}

export function markDefeat(state: BattleState): BattleState {
  return { ...state, phase: 'defeat' }
}

export function plateauRequirements(state: BattleState): PlateauRequirement[] {
  return state.plateau ?? []
}
