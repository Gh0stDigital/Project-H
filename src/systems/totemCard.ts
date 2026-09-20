import type { Spell } from '@/domain/spell'
import type { SpellSet } from '@/domain/spellSet'
import type { Totem } from '@/domain/totem'
import { type Element, elementFor } from '@/config/wordTypes'
import { loreFor } from '@/config/totemLore'
import { resolvedKey } from '@/config/assets'
import { damageForSpell } from './spellProgression'

/**
 * A Totem as a monster card.
 *
 * Every number here is one the game already plays with rather than a stat
 * invented for the card: the attack is what the equipped deck actually hits
 * for, the defence is the HP it actually has, and the attribute is the
 * element its own words lean towards. A card that shows made-up numbers is
 * decoration; this one is a readout.
 *
 * Pure: no React, no store.
 */

/** Yu-Gi-Oh tops out at twelve stars and so does the row of them. */
export const MAX_STARS = 12

export interface TotemCardData {
  name: string
  kind: string
  description: string
  level: number
  /** Stars to draw; the level is printed as well once it passes the cap. */
  stars: number
  /** Total damage the equipped deck deals at its current charge. */
  attack: number
  defense: number
  /** The element the equipped words lean towards, or null with no deck. */
  element: Element | null
  /** Words in the equipped set. */
  deckSize: number
}

function dominantElement(spells: Spell[]): Element | null {
  if (spells.length === 0) return null
  const tally = new Map<Element, number>()
  for (const spell of spells) {
    const element = elementFor(spell.wordType)
    tally.set(element, (tally.get(element) ?? 0) + 1)
  }
  // Ties go to the element that appears first in the deck, which keeps the
  // attribute steady instead of flipping as words are added and removed.
  let best: Element | null = null
  let bestCount = 0
  for (const spell of spells) {
    const element = elementFor(spell.wordType)
    const count = tally.get(element) ?? 0
    if (count > bestCount) {
      best = element
      bestCount = count
    }
  }
  return best
}

export function equippedSpells(totem: Totem, spells: Spell[], sets: SpellSet[]): Spell[] {
  const set = sets.find((s) => s.id === totem.equippedSpellSetId)
  if (!set) return []
  return set.spellIds
    .map((id) => spells.find((sp) => sp.id === id))
    .filter((sp): sp is Spell => !!sp)
}

export function totemCard(totem: Totem, spells: Spell[], sets: SpellSet[]): TotemCardData {
  const deck = equippedSpells(totem, spells, sets)
  // Through the same resolution the portrait itself goes through, so the
  // words on the card belong to the face on it.
  const lore = loreFor(resolvedKey('totems', totem.avatarKey))
  return {
    name: totem.name,
    kind: lore.kind,
    // A description written on this Totem wins over the portrait's, so a
    // player who names their own character can describe them too.
    description: totem.description?.trim() || lore.description,
    level: totem.level,
    stars: Math.max(1, Math.min(MAX_STARS, totem.level)),
    attack: deck.reduce((sum, spell) => sum + damageForSpell(spell), 0),
    defense: totem.maxHp,
    element: dominantElement(deck),
    deckSize: deck.length,
  }
}
