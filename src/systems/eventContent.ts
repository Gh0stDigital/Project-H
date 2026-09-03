import type { AssetCategory } from '@/config/assets'
import type { DungeonEventType } from '@/config/dungeonEvents'
import type { ChallengeContext } from '@/domain/challenge'

/**
 * Static flavor/art table for each dungeon event type. Pure data — no
 * React, no state, no probabilities (those live in config/dungeonEvents.ts).
 * dungeonSession.ts consults this when building a DungeonEvent; the UI only
 * ever renders the resulting object.
 */
export interface EventDefinition {
  type: DungeonEventType
  title: string
  bodyText: string[]
  imageCategory: AssetCategory
  imageKey: string
  /** Whether resolving this event runs a vocabulary prompt. */
  hasChallenge: boolean
  challengeContext: ChallengeContext
}

export const eventDefinitions: Record<DungeonEventType, EventDefinition> = {
  treasure: {
    type: 'treasure',
    title: 'Locked Treasure',
    bodyText: [
      'A sturdy chest sits half-buried in the rubble.',
      'The lock is old, but the mechanism still bites. Speak the word to force it.',
    ],
    imageCategory: 'treasure',
    imageKey: 'locked',
    hasChallenge: true,
    challengeContext: 'treasure',
  },
  trap: {
    type: 'trap',
    title: 'A Trap!',
    bodyText: ['You hear a click underfoot.', 'Recall the meaning before the mechanism finishes winding!'],
    imageCategory: 'traps',
    imageKey: 'default',
    hasChallenge: true,
    challengeContext: 'trap',
  },
  magic_room: {
    type: 'magic_room',
    title: 'Sealed Magic Room',
    bodyText: [
      'A door of layered glyphs blocks the passage.',
      'One word holds it shut — reveal it letter by letter, and it will open.',
    ],
    imageCategory: 'treasure',
    imageKey: 'shrine',
    hasChallenge: false,
    challengeContext: 'event',
  },
  rest: {
    type: 'rest',
    title: 'Rest Area',
    bodyText: ['A safe alcove, quiet and dry.', 'A place to bind wounds — for a price.'],
    imageCategory: 'treasure',
    imageKey: 'rest',
    hasChallenge: false,
    challengeContext: 'event',
  },
  battle: {
    type: 'battle',
    title: 'Monster Encounter!',
    bodyText: ['A hostile creature blocks your path!', 'Prepare for battle.'],
    imageCategory: 'enemies',
    imageKey: 'default',
    hasChallenge: false,
    challengeContext: 'event',
  },
  direction: {
    type: 'direction',
    title: 'Branching Path',
    bodyText: ['The passage forks ahead.', 'Each way carries its own promise — and its own risk.'],
    imageCategory: 'events',
    imageKey: 'branch',
    hasChallenge: false,
    challengeContext: 'event',
  },
  boss_door: {
    type: 'boss_door',
    title: 'The Boss Door',
    bodyText: [
      'An enormous door of black stone fills the passage.',
      'A single keyhole sits at its centre. You mark the way back.',
    ],
    imageCategory: 'events',
    imageKey: 'bossroom',
    hasChallenge: false,
    challengeContext: 'event',
  },
  key_room: {
    type: 'key_room',
    title: 'The Key Chamber',
    bodyText: [
      'Every word this dungeon had to teach, you have now faced.',
      'On a plain stone plinth rests a heavy iron key.',
    ],
    imageCategory: 'events',
    imageKey: 'special',
    hasChallenge: false,
    challengeContext: 'event',
  },
}

/** Flavor for the mimic reveal, shown before the fight starts. */
export const mimicRevealText = [
  'The lid shudders — then splits into a grinning maw.',
  'It was never a chest. It was waiting.',
]
