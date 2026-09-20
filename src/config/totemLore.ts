/**
 * Who each Totem is.
 *
 * A Totem was a portrait, a level and a bar; this is the rest of the card —
 * the line that says what kind of thing it is, and the paragraph that says
 * why you would take it into a dungeon. Keyed by portrait, because the
 * portrait is the character: raising a Totem from `Dolbae` should get you
 * Dolbae, not a blank.
 *
 * Portraits that have no entry still get a card. The fallback reads as a
 * Totem nobody has written up yet rather than as an error, and the player
 * can write their own over the top of it either way.
 */

export interface TotemLore {
  /** The bracketed line under the name: what it is. */
  kind: string
  /** Flavour text. */
  description: string
}

const lore: Record<string, TotemLore> = {
  dolbae: {
    kind: '수호석 / 파수꾼',
    description:
      '길가에 천 년을 서 있던 돌입니다. 오가는 이들의 말을 하나도 잊지 않았고, 이제 그 말을 빌려 싸웁니다.',
  },
  silverfinal: {
    kind: '기사 / 맹세',
    description:
      '은빛 갑옷 아래 얼굴을 본 사람은 없습니다. 맹세한 말은 반드시 지키기에, 틀린 말은 그의 검을 무디게 합니다.',
  },
  magic_parasite_zoah: {
    kind: '기생체 / 변이',
    description:
      '숙주의 기억을 먹고 자랍니다. 삼킨 단어가 많을수록 몸이 커지고, 잊은 단어만큼 작아집니다.',
  },
  parasite_hunter_yaharl: {
    kind: '사냥꾼 / 추적',
    description:
      '정원을 태우고 살아남은 단 한 사람. 이름을 정확히 부르는 것만이 그것들을 붙잡아 둔다는 걸 알고 있습니다.',
  },
}

/** Matched the way portraits are matched everywhere else: loosely. */
function normalize(key: string): string {
  return key.toLowerCase().replace(/[^a-z0-9]/g, '')
}

const byKey = new Map(Object.entries(lore).map(([key, value]) => [normalize(key), value]))

const unwritten: TotemLore = {
  kind: '토템 / 미기록',
  description: '아직 아무도 이 토템의 이야기를 적어 두지 않았습니다. 던전에서 직접 쓰게 될 것입니다.',
}

export function loreFor(avatarKey: string): TotemLore {
  return byKey.get(normalize(avatarKey)) ?? unwritten
}
