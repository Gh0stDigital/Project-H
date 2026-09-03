import type { AssetCategory } from '@/config/assets'
import type { Challenge } from './challenge'

export type BattlePhase =
  | 'player_select'
  | 'player_challenge'
  | 'player_resolve'
  | 'enemy_intro'
  | 'enemy_challenge'
  | 'enemy_resolve'
  | 'victory'
  | 'defeat'

export interface EnemyCombatant {
  kind: 'enemy' | 'boss' | 'mimic'
  name: string
  imageCategory: AssetCategory
  imageKey: string
  battleBgKey: string
  maxHp: number
  currentHp: number
  damage: number
}

export interface PlateauRequirement {
  spellId: string
  cleared: boolean
}

/** Ordered spell-id deck. Only card order lives here — never vocabulary data. */
export interface DeckState {
  order: string[]
}

export interface TimerState {
  totalSeconds: number
  remainingSeconds: number
  running: boolean
}

/**
 * One enemy attack, which may demand several defense prompts in sequence.
 * Damage scales with how many were answered correctly — see
 * battleEngine.defenseDamage(). A fully-correct defense still lets a
 * sliver through (battleBalance.defendedDamageFraction), which is the
 * partial-defense behavior the game already had for single prompts.
 */
export interface DefenseSequence {
  challenges: Challenge[]
  /** Index of the prompt currently being answered. */
  index: number
  /** One entry per answered prompt, in order. */
  results: boolean[]
}

export function defenseSequenceComplete(seq: DefenseSequence): boolean {
  return seq.index >= seq.challenges.length
}

export interface BattleState {
  enemy: EnemyCombatant
  isBoss: boolean
  /** Non-null only for boss battles; empty array once fully cleared. */
  plateau: PlateauRequirement[] | null
  deck: DeckState
  phase: BattlePhase
  activeChallenge: Challenge | null
  /** Non-null while an enemy attack is being defended against. */
  defense: DefenseSequence | null
  timer: TimerState | null
  log: string[]
  totemDamageTakenThisBattle: number
  /** Result of the most recently resolved challenge, for UI feedback styling. */
  lastResult: 'correct' | 'incorrect' | null
  /** Guard so a victory's rewards can only ever be granted once. */
  rewardsGranted: boolean
}

export function isPlateauCleared(plateau: PlateauRequirement[] | null): boolean {
  if (!plateau) return true
  return plateau.every((r) => r.cleared)
}
