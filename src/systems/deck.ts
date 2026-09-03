import type { DeckState } from '@/domain/battle'

/**
 * Battle deck system. Knows nothing about vocabulary — it only orders a
 * list of Spell IDs and rotates them as cards are used. Spell state
 * (level/charge/etc.) lives entirely in the Compendium and is looked up by
 * ID wherever the deck is rendered.
 */

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export function buildDeck(spellIds: string[], shuffled = true): DeckState {
  return { order: shuffled ? shuffle(spellIds) : [...spellIds] }
}

/** The currently selectable cards (front of the deck). */
export function visibleCards(deck: DeckState, count: number): string[] {
  return deck.order.slice(0, Math.min(count, deck.order.length))
}

/** Moves a used card to the bottom of the deck, preserving relative order of the rest. */
export function playCard(deck: DeckState, spellId: string): DeckState {
  const idx = deck.order.indexOf(spellId)
  if (idx === -1) return deck
  const order = [...deck.order]
  const [used] = order.splice(idx, 1)
  order.push(used)
  return { order }
}

export function isDeckEmpty(deck: DeckState): boolean {
  return deck.order.length === 0
}
