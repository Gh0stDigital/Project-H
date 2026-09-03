/**
 * Dungeon event catalog + generation balance.
 *
 * Every probability, weight and modifier that shapes what the player runs
 * into lives here. Event screens read the *resolved* event object and never
 * roll dice or consult a weight themselves — rebalancing the dungeon should
 * only ever mean editing this file.
 */

export type DungeonEventType =
  | 'treasure'
  | 'trap'
  | 'magic_room'
  | 'rest'
  | 'battle'
  | 'direction'
  | 'boss_door'
  | 'key_room'

/**
 * Base selection weights, relative to each other (they do not need to sum
 * to anything in particular).
 *
 * Rarity intent:
 *   treasure / trap / battle  common
 *   rest                      occasional
 *   direction                 uncommon
 *   magic_room                slightly rare
 *   boss_door                 rare, but reachable from turn 1
 *   key_room                  weight 0 — never rolled normally; it is
 *                             force-selected once unlocked (see keyRoomBalance)
 */
export const baseEventWeights: Record<DungeonEventType, number> = {
  treasure: 22,
  trap: 20,
  battle: 24,
  rest: 10,
  direction: 8,
  magic_room: 6,
  boss_door: 4,
  key_room: 0,
}

/** Never allow the same event type more than this many times in a row. */
export const maxRepeatEventStreak = 2

/**
 * Events that must only ever occur once per run. Once generated (or already
 * discovered) they are excluded from every later roll, which is what keeps
 * a run from producing two keys or re-finding a door it already knows.
 */
export const onceOnlyEvents: DungeonEventType[] = ['boss_door', 'key_room']

// ---------------------------------------------------------------------------
// Direction modifiers
// ---------------------------------------------------------------------------

/**
 * A Direction event hands the player a temporary bias on future event
 * rolls. `weightDelta` is added to the affected type's base weight (the
 * result is floored at 0 — a weight can never go negative).
 */
export interface DirectionEffect {
  /** Stable id, used to decide which existing modifier a new one replaces. */
  id: string
  label: string
  /** Thematic hint shown to the player instead of raw numbers. */
  flavor: string
  /** Event types this path biases, and by how much. */
  weightDeltas: Partial<Record<DungeonEventType, number>>
  /** How many Move events the effect lasts for. */
  durationMoves: number
}

export const directionBalance = {
  /** Strength of a "more of this" nudge, added to the base weight. */
  boost: 18,
  /** Strength of a "less of this" nudge, subtracted from the base weight. */
  reduction: 16,
  standardDuration: 5,
  shortDuration: 3,
  /**
   * Stacking rule (documented because the game had no prior rule):
   * modifiers affecting *different* event types coexist; a new modifier
   * that touches an event type an active modifier already touches replaces
   * that older modifier. Weights are clamped at 0 either way.
   */
  replaceOnOverlappingType: true,
}

export const twoWayDirections: DirectionEffect[] = [
  {
    id: 'dir_gilded',
    label: 'The Gilded Passage',
    flavor: 'A faint glitter of coin-light spills from this way.',
    weightDeltas: { treasure: directionBalance.boost },
    durationMoves: directionBalance.standardDuration,
  },
  {
    id: 'dir_snares',
    label: 'The Whispering Passage',
    flavor: 'Something clicks softly in the dark down here.',
    weightDeltas: { trap: directionBalance.boost },
    durationMoves: directionBalance.standardDuration,
  },
]

export const fourWayDirections: DirectionEffect[] = [
  {
    id: 'dir_warpath',
    label: 'The Warpath',
    flavor: 'Deep gouges score the walls. Something hunts here.',
    weightDeltas: { battle: directionBalance.boost },
    durationMoves: directionBalance.standardDuration,
  },
  {
    id: 'dir_hush',
    label: 'The Hushed Way',
    flavor: 'The air is still and strangely undisturbed.',
    weightDeltas: { battle: -directionBalance.reduction },
    durationMoves: directionBalance.shortDuration,
  },
  {
    id: 'dir_sigils',
    label: 'The Sigil Road',
    flavor: 'Old glyphs pulse faintly along the stonework.',
    weightDeltas: { magic_room: directionBalance.boost },
    durationMoves: directionBalance.standardDuration,
  },
  {
    id: 'dir_hoard',
    label: 'The Hoarder’s Descent',
    flavor: 'Riches and ruin, tangled together somewhere below.',
    weightDeltas: {
      treasure: Math.round(directionBalance.boost * 0.7),
      trap: Math.round(directionBalance.boost * 0.7),
    },
    durationMoves: directionBalance.standardDuration,
  },
]

/** Chance a Direction event offers four paths rather than two. */
export const fourWayDirectionChance = 0.35

// ---------------------------------------------------------------------------
// Key Room
// ---------------------------------------------------------------------------

export const keyRoomBalance = {
  /**
   * Once every word in the dungeon's Spellword Set has been introduced, the
   * Key Room becomes eligible and is force-selected with this probability on
   * each following Move.
   */
  chanceOnceUnlocked: 0.9,
  /**
   * If it somehow keeps losing the roll, the chance climbs by this much per
   * Move so it can never stay hidden for long.
   */
  chanceRampPerMiss: 0.05,
}

// ---------------------------------------------------------------------------
// Treasure
// ---------------------------------------------------------------------------

export const treasureBalance = {
  /** Chance an opened chest turns out to be a Mimic instead of loot. */
  mimicChance: 0.18,
  /** Money granted by an ordinary opened chest. */
  baseMoney: 14,
  /** Chance an ordinary opened chest also yields a consumable item. */
  itemDropChance: 0.45,
  /** Extra money a Magic Room's higher-tier hoard is worth. */
  magicRoomMoney: 34,
  /** Bonus Totem XP from a solved Magic Room. */
  magicRoomTotemXp: 30,
  /** Chance a Magic Room also yields an item on top of its money + XP. */
  magicRoomItemChance: 0.75,
}

export const mimicBalance = {
  /** Mimic HP multiplier relative to an ordinary enemy of the same tier. */
  hpMultiplier: 1.15,
  /** Mimics hit harder than ordinary foes. */
  damageMultiplier: 1.2,
  /** XP multiplier over an ordinary enemy — mimics are worth more. */
  xpMultiplier: 2,
  /** Money multiplier over an ordinary enemy. */
  moneyMultiplier: 2,
  /** Chance a defeated Mimic drops its exclusive treasure. */
  exclusiveDropChance: 0.5,
  /** Money value of the Mimic-exclusive hoard. */
  exclusiveDropMoney: 45,
}

// ---------------------------------------------------------------------------
// Traps
// ---------------------------------------------------------------------------

export const trapBalance = {
  /** Damage before the tier multiplier when a trap is not disarmed. */
  baseDamage: 9,
  /** Seconds to answer a trap's defense prompt. */
  timerSeconds: 12,
}

// ---------------------------------------------------------------------------
// Magic Room (Hangman)
// ---------------------------------------------------------------------------

export const magicRoomBalance = {
  /** Incorrect guesses allowed before the door seals permanently. */
  maxMistakes: 3,
  /**
   * Size of the tappable guess grid. The grid always contains every
   * syllable of the answer plus decoys drawn from the run's other words,
   * up to this total.
   */
  guessGridSize: 14,
}

// ---------------------------------------------------------------------------
// Rest Areas
// ---------------------------------------------------------------------------

export const restBalance = {
  /** Fraction of max HP restored per use. */
  healFraction: 0.4,
  /** Price of the first use in a run. */
  startingPrice: 20,
  /** Each use multiplies the price of the next one by this. */
  priceGrowth: 1.6,
}

/** Price of the Nth rest use this run (0-indexed uses already spent). */
export function restPriceFor(usesSoFar: number): number {
  return Math.round(restBalance.startingPrice * Math.pow(restBalance.priceGrowth, usesSoFar))
}
