import type { Spell } from '@/domain/spell'
import { spellBalance, rewardBalance } from '@/config/balance'

export interface LevelUpResult {
  spell: Spell
  leveledUp: boolean
  fromLevel: number
  toLevel: number
}

/**
 * Grants experience to a Spell, applying level-ups (and the level's higher
 * max charge) as needed. Pure — returns a new Spell, never mutates.
 */
export function addExperience(spell: Spell, amount: number): LevelUpResult {
  if (amount <= 0) return { spell, leveledUp: false, fromLevel: spell.level, toLevel: spell.level }

  let level = spell.level
  let experience = spell.experience + amount
  const fromLevel = level

  while (level < spellBalance.maxLevel && experience >= spellBalance.xpToNextLevel(level)) {
    experience -= spellBalance.xpToNextLevel(level)
    level += 1
  }
  if (level >= spellBalance.maxLevel) {
    level = spellBalance.maxLevel
    experience = Math.min(experience, spellBalance.xpToNextLevel(level - 1))
  }

  const newMax = spellBalance.maxCharge(level)
  const next: Spell = {
    ...spell,
    level,
    experience,
    maxCharge: newMax,
    charge: Math.min(spell.charge, newMax),
  }
  return { spell: next, leveledUp: level > fromLevel, fromLevel, toLevel: level }
}

/** Adjusts charge by a delta, clamped to [0, maxCharge]. */
export function applyChargeDelta(spell: Spell, delta: number): Spell {
  const charge = Math.max(0, Math.min(spell.maxCharge, spell.charge + delta))
  return { ...spell, charge }
}

/** Damage a Spell would deal right now, given its level + current charge. */
export function damageForSpell(spell: Spell): number {
  const base = spellBalance.baseDamage(spell.level)
  const mult = spellBalance.chargeDamageMultiplier(spell.charge, spell.maxCharge)
  return Math.round(base * mult)
}

/** True when a Spell is at maximum charge (bonus rewards apply). */
export function isFullyCharged(spell: Spell): boolean {
  return spell.maxCharge > 0 && spell.charge >= spell.maxCharge
}

/** Money reward for a successful action involving this Spell. */
export function moneyReward(spell: Spell, base: number = rewardBalance.baseMoney): number {
  const bonus = isFullyCharged(spell) ? rewardBalance.fullChargeMoneyBonus : 1
  return Math.round(base * bonus)
}

export function xpToNext(spell: Spell): number {
  return spellBalance.xpToNextLevel(spell.level)
}
