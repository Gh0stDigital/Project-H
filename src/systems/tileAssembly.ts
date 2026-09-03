/**
 * Answer-tile assembly.
 *
 * Instead of typing a free-text answer, the player builds it by tapping
 * tiles. The tiles for the correct answer are mixed with decoy tiles drawn
 * from the other words in the run, so the puzzle still requires recall —
 * but a right answer can never be rejected for a typo, and a semantically
 * valid synonym can never be "wrong", because the target is the player's
 * own saved answer, spelled out.
 *
 * Pure functions only: no React, no state, randomness via an injected rng.
 */

import type { AnswerKind } from './answerChecker'
import { tileBalance } from '@/config/balance'

/** How an answer is cut into tappable pieces. */
export type TileGranularity = 'syllable' | 'word' | 'letter'

export interface AnswerTile {
  /** Stable per-tile key (text alone isn't unique — answers repeat letters). */
  id: string
  text: string
}

export interface TileChallenge {
  granularity: TileGranularity
  /** Joined with this when checking what the player assembled. */
  joiner: string
  /** The shuffled pool the player picks from (answer pieces + decoys). */
  tiles: AnswerTile[]
  /** How many tiles the correct answer needs — drives the slot count. */
  answerLength: number
}

/**
 * Chooses how to cut an answer into tiles:
 * - Korean: one tile per Hangul syllable block (each is a single codepoint).
 * - English, multi-word: one tile per word ("thank you" → [thank][you]).
 * - English, single word: one tile per letter ("love" → [l][o][v][e]).
 */
export function granularityFor(answer: string, kind: AnswerKind): TileGranularity {
  if (kind === 'korean') return 'syllable'
  return answer.trim().includes(' ') ? 'word' : 'letter'
}

export function segmentAnswer(answer: string, granularity: TileGranularity): string[] {
  const trimmed = answer.trim()
  switch (granularity) {
    case 'word':
      return trimmed.split(/\s+/).filter(Boolean)
    case 'syllable':
    case 'letter':
      // Spaces are dropped; comparison is whitespace-insensitive so the
      // player never has to hunt for a space tile.
      return [...trimmed].filter((c) => c.trim().length > 0)
  }
}

export function joinerFor(granularity: TileGranularity): string {
  return granularity === 'word' ? ' ' : ''
}

function shuffle<T>(items: T[], rng: () => number): T[] {
  const out = [...items]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

/**
 * Builds the tile pool for one challenge: every piece of the correct
 * answer, plus decoys pulled from `decoySources` (the other answers in the
 * run, cut the same way). Falls back to fewer decoys — or none — when the
 * pool is too small to supply them, which still leaves a valid puzzle.
 */
export function buildTileChallenge(
  answer: string,
  kind: AnswerKind,
  decoySources: string[],
  rng: () => number = Math.random,
): TileChallenge {
  const granularity = granularityFor(answer, kind)
  const answerSegments = segmentAnswer(answer, granularity)

  // Candidate decoys: segments from other answers that the correct answer
  // doesn't already use, de-duplicated.
  const used = new Set(answerSegments)
  const candidates: string[] = []
  for (const source of decoySources) {
    if (!source || source.trim() === answer.trim()) continue
    for (const seg of segmentAnswer(source, granularity)) {
      if (used.has(seg) || candidates.includes(seg)) continue
      candidates.push(seg)
    }
  }

  const wanted = Math.min(
    tileBalance.maxDecoys,
    Math.max(tileBalance.minDecoys, Math.round(answerSegments.length * tileBalance.decoyRatio)),
  )
  const decoys = shuffle(candidates, rng).slice(0, wanted)

  const tiles = shuffle(
    [...answerSegments, ...decoys].map((text, i) => ({ id: `t${i}-${text}`, text })),
    rng,
  )

  return { granularity, joiner: joinerFor(granularity), tiles, answerLength: answerSegments.length }
}

/** The string the player has built so far, ready for answer checking. */
export function assembledText(picked: AnswerTile[], joiner: string): string {
  return picked.map((t) => t.text).join(joiner)
}
