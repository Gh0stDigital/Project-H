import type { DungeonState } from '@/domain/dungeon'

/**
 * Dungeon state machine.
 *
 * The single authority on what the player is allowed to do right now. The
 * store asks this module before acting, so an event, a dice roll, a timer,
 * a battle and the results screen can never overlap — no matter how many
 * times a component re-renders or a button is tapped.
 *
 * Pure: no React, no store, no side effects.
 */

/** Which states each state may legally move to. */
const transitions: Record<DungeonState, DungeonState[]> = {
  // Pre-run configuration; entering the dungeon lands in Standby.
  DungeonSetup: ['Standby'],

  // The hub. Everything the player chooses to do departs from here.
  Standby: ['Rolling', 'Rest', 'BossBattle', 'Results', 'Defeat'],

  // The die is in the air. Resolves into whatever the roll produced.
  Rolling: ['ResolvingEvent'],

  // An event is on screen being read/decided.
  ResolvingEvent: ['VocabularyInput', 'Battle', 'Rest', 'Standby', 'Defeat'],

  // Answering a vocabulary prompt (treasure, trap, magic room).
  VocabularyInput: ['ResolvingEvent', 'Battle', 'Standby', 'Defeat'],

  // Ordinary or mimic combat. On victory it returns to the event's
  // resolution screen to show rewards, then on to Standby.
  Battle: ['ResolvingEvent', 'Standby', 'Defeat'],

  // A rest area, entered from an event or revisited from Standby.
  Rest: ['Standby'],

  // The final fight. There is no path back to exploration.
  BossBattle: ['Results', 'Defeat'],

  // Terminal states.
  Results: [],
  Defeat: ['Results'],
}

export function canTransition(from: DungeonState, to: DungeonState): boolean {
  return transitions[from].includes(to)
}

/**
 * Returns `to` when the transition is legal, otherwise `from` (the move is
 * ignored). Callers that must know use `canTransition` first.
 */
export function transition(from: DungeonState, to: DungeonState): DungeonState {
  return canTransition(from, to) ? to : from
}

// ---------------------------------------------------------------------------
// Capability checks — what the UI is allowed to offer in a given state
// ---------------------------------------------------------------------------

/** Standby-only actions: Move, Check Totem/Words, Items, Boss Door, Rest. */
export function canAct(state: DungeonState): boolean {
  return state === 'Standby'
}

/** Move is Standby-only, which is what blocks rolling mid-event. */
export function canMove(state: DungeonState): boolean {
  return state === 'Standby'
}

/** Standby menus must never open over a battle or a timed prompt. */
export function canOpenStandbyMenus(state: DungeonState): boolean {
  return state === 'Standby' || state === 'Rest'
}

/**
 * The Words panel is readable during battle (it shows barrier progress),
 * but never while a timed prompt is on screen — that would be a free peek
 * at the answer.
 */
export function canOpenWordInfo(state: DungeonState): boolean {
  return state !== 'VocabularyInput' && state !== 'Results'
}

export function isBattleState(state: DungeonState): boolean {
  return state === 'Battle' || state === 'BossBattle'
}

export function isTerminal(state: DungeonState): boolean {
  return state === 'Results' || state === 'Defeat'
}

/** The run is over — no further gameplay input may be accepted. */
export function isRunOver(state: DungeonState): boolean {
  return state === 'Results'
}
