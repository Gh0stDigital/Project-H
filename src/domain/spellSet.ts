/**
 * A Spell Set is a named, ordered collection of Spell references. Sets never
 * duplicate Spell data — they hold only IDs, resolved against the Spell
 * Compendium at read time.
 */
export interface SpellSet {
  id: string
  name: string
  spellIds: string[]
  createdAt: string
  modifiedAt: string
}
