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

/** Said when the player has no sample sentences to draw on yet. */
const FALLBACK_LINES = [
  '쉴 수 있을 때 쉬세요. 어둠은 쉬지 않으니까요.',
  '들려줄 이야기가 없네요. 예문을 좀 써 두면 생길지도 모르죠.',
  '지금은 여기도 조용하네요.',
]

function pick<T>(items: readonly T[], rng: () => number): T {
  return items[Math.floor(rng() * items.length) % items.length]
}

function intBetween(min: number, max: number, rng: () => number): number {
  return min + Math.floor(rng() * (max - min + 1))
}

/**
 * The people in one Rest Area, fixed for the run once generated.
 *
 * Only words that actually carry an example are eligible — an NPC with
 * nothing to say would be worse than no NPC. Where the player has written
 * none at all, they fall back to flavour rather than vanishing, so the Rest
 * Area does not look broken on a fresh Compendium.
 */
export function buildRestNpcs(spells: Spell[], portraits: readonly string[], rng: () => number): RestNpc[] {
  const speakable = spells.filter(hasSample)
  const count = intBetween(npcBalance.minCount, npcBalance.maxCount, rng)

  const usedNames = new Set<string>()
  const npcs: RestNpc[] = []

  for (let i = 0; i < count; i++) {
    // Names and portraits are drawn without repeats where possible, so three
    // people in one room are visibly three people.
    let name = pick(NAMES, rng)
    for (let tries = 0; usedNames.has(name) && tries < NAMES.length; tries++) {
      name = NAMES[(NAMES.indexOf(name) + 1) % NAMES.length]
    }
    usedNames.add(name)

    const spell = speakable.length > 0 ? pick(speakable, rng) : null
    npcs.push({
      id: `npc-${i}-${Math.floor(rng() * 1e9).toString(36)}`,
      name,
      avatarKey: portraits.length > 0 ? portraits[(Math.floor(rng() * portraits.length) + i) % portraits.length] : '',
      spellId: spell?.id ?? null,
      line: spell ? spell.sampleSentence.trim() : pick(FALLBACK_LINES, rng),
      translation: spell ? spell.sampleTranslation.trim() : '',
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
