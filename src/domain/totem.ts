/**
 * A Totem is the player's controllable dungeon character.
 */
export interface Totem {
  id: string
  name: string
  avatarKey: string
  /**
   * The player's own flavour text. Blank means the portrait's written lore
   * stands in — see config/totemLore.ts — so a Totem always has something
   * on its card, and a save from before descriptions existed simply has none
   * of its own.
   */
  description?: string

  level: number
  experience: number
  currentHp: number
  maxHp: number
  money: number

  /**
   * Run-level lives. A dungeon defeat costs exactly one; at 0 the Totem is
   * permanently destroyed and can never be selected again.
   */
  lifePoints: number
  maxLifePoints: number
  destroyed: boolean

  /** The currently equipped Spell Set (battle deck source), or null. */
  equippedSpellSetId: string | null

  stats: {
    dungeonsCompleted: number
    bossesDefeated: number
    dungeonsFailed: number
    totalDamageDealt: number
    totalDamageTaken: number
  }

  createdAt: string
}
