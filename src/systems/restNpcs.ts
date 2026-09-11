import type { Spell } from '@/domain/spell'
import { hasSample } from '@/domain/spell'
import { npcBalance } from '@/config/dungeonEvents'


/**
 * Rest Area NPCs.
 *
 * Each one greets you with a sample sentence taken from your own vocabulary,
 * so the reward for writing good examples is hearing them back in the
 * dungeon. Talking is free and pays out once per person per Rest Area.
 *
 * Pure: the caller supplies the rng, so a run can be replayed exactly.
 */

export interface RestNpc {
  id: string
  name: string
  avatarKey: string
  /** The word whose example they speak, or null when none was available. */
  spellId: string | null
  line: string
  /** Empty when the entry has a sentence but no translation. */
  translation: string
  spoken: boolean
}

export interface NpcGift {
  money: number
  totemXp: number
  /** True when this gift should also roll an item drop. */
  item: boolean
}

const NAMES = [
  '하나', '지수', '민호', '유나', '다은', '소라',
  '태양', '보미', '경', '나리', '서준', '은비',
]

/**
 * Said when a word has no example sentence of its own.
 *
 * The point of these people is that they speak the player's vocabulary back
 * at them, and an entry written without an example used to drop them to
 * generic flavour instead — which, for anyone who has not filled in the
 * sample field, was every NPC in the game. So the word itself becomes the
 * line, and writing an example upgrades it rather than switching it on.
 */
const WORD_LINES = [
  (korean: string, english: string) => `"${korean}"… 그 말 아세요? "${english}"라는 뜻입니다.`,
  (korean: string, english: string) => `여기서는 "${korean}"을 자주 말합니다. "${english}" 말이에요.`,
  (korean: string, english: string) => `제가 아는 건 "${korean}" 하나뿐입니다. "${english}".`,
  (korean: string, english: string) => `"${korean}". 잊지 마세요 — "${english}".`,
]

/** Said only when the Compendium is genuinely empty. */
const FALLBACK_LINES = [
  '쉴 수 있을 때 쉬세요. 어둠은 쉬지 않으니까요.',
  '들려줄 이야기가 없네요. 단어를 좀 써 두면 생길지도 모르죠.',
  '지금은 여기도 조용하네요.',
]

function pick<T>(items: readonly T[], rng: () => number): T {
  return items[Math.floor(rng() * items.length) % items.length]
}

function intBetween(min: number, max: number, rng: () => number): number {
  return min + Math.floor(rng() * (max - min + 1))
}

/**
 * A word nobody in this room has used yet, or any word once they all have —
 * a Compendium of two entries should still fill a room of three.
 */
function pickUnused(pool: Spell[], used: Set<string>, rng: () => number): Spell | null {
  if (pool.length === 0) return null
  const fresh = pool.filter((sp) => !used.has(sp.id))
  return pick(fresh.length > 0 ? fresh : pool, rng)
}

/**
 * The people in one Rest Area, fixed for the run once generated.
 *
 * Everyone speaks from the player's own vocabulary: an example sentence
 * where the entry has one, and the word itself where it does not. Words are
 * drawn without repeats where the Compendium is big enough, so three people
 * in one room are three different lessons rather than the same one said
 * three times. Only a completely empty Compendium falls back to flavour.
 */
export function buildRestNpcs(spells: Spell[], portraits: readonly string[], rng: () => number): RestNpc[] {
  // Entries carrying an example come first — they are the better line, and
  // the reward for having written one.
  const withSample = spells.filter(hasSample)
  const withoutSample = spells.filter((sp) => !hasSample(sp))
  const count = intBetween(npcBalance.minCount, npcBalance.maxCount, rng)

  const usedNames = new Set<string>()
  const usedSpells = new Set<string>()
  const npcs: RestNpc[] = []

  for (let i = 0; i < count; i++) {
    // Names and portraits are drawn without repeats where possible, so three
    // people in one room are visibly three people.
    let name = pick(NAMES, rng)
    for (let tries = 0; usedNames.has(name) && tries < NAMES.length; tries++) {
      name = NAMES[(NAMES.indexOf(name) + 1) % NAMES.length]
    }
    usedNames.add(name)

    const spell = pickUnused(withSample, usedSpells, rng) ?? pickUnused(withoutSample, usedSpells, rng)
    if (spell) usedSpells.add(spell.id)
    const speaks = spell !== null && hasSample(spell)

    npcs.push({
      id: `npc-${i}-${Math.floor(rng() * 1e9).toString(36)}`,
      name,
      avatarKey: portraits.length > 0 ? portraits[(Math.floor(rng() * portraits.length) + i) % portraits.length] : '',
      spellId: spell?.id ?? null,
      line: speaks
        ? spell!.sampleSentence.trim()
        : spell
          ? pick(WORD_LINES, rng)(spell.korean, spell.english)
          : pick(FALLBACK_LINES, rng),
      translation: speaks ? spell!.sampleTranslation.trim() : '',
      spoken: false,
    })
  }

  return npcs
}

/**
 * What talking to someone yields. The conversation itself always pays a
 * little Totem XP; coin and items are the part that may not come.
 */
export function rollNpcGift(rng: () => number): NpcGift {
  const generous = rng() < npcBalance.giftChance
  return {
    money: generous ? intBetween(npcBalance.minMoney, npcBalance.maxMoney, rng) : 0,
    totemXp: npcBalance.totemXp,
    item: generous && rng() < npcBalance.itemChance,
  }
}

/** Marks one person as spoken to. Returns the list unchanged if unknown. */
export function markSpoken(npcs: RestNpc[], npcId: string): RestNpc[] {
  return npcs.map((n) => (n.id === npcId ? { ...n, spoken: true } : n))
}

export function findNpc(npcs: RestNpc[], npcId: string): RestNpc | undefined {
  return npcs.find((n) => n.id === npcId)
}
