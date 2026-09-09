
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
  /** Slot inside the world's events/ folder. */
  imageSlot: string
  /** Whether resolving this event runs a vocabulary prompt. */
  hasChallenge: boolean
  challengeContext: ChallengeContext
}

export const eventDefinitions: Record<DungeonEventType, EventDefinition> = {
  treasure: {
    type: 'treasure',
    title: '잠긴 보물',
    bodyText: [
      '튼튼한 상자가 돌무더기에 반쯤 파묻혀 있습니다.',
      '자물쇠는 낡았지만 아직 단단합니다. 단어를 말해 열어 보세요.',
    ],
    imageSlot: 'treasureLocked',
    hasChallenge: true,
    challengeContext: 'treasure',
  },
  trap: {
    type: 'trap',
    title: '함정이다!',
    bodyText: ['발밑에서 딸깍 소리가 납니다.', '장치가 다 감기기 전에 뜻을 떠올리세요!'],
    imageSlot: 'trap1',
    hasChallenge: true,
    challengeContext: 'trap',
  },
  magic_room: {
    type: 'magic_room',
    title: '봉인된 마법의 방',
    bodyText: [
      '겹겹이 새겨진 문양의 문이 길을 막고 있습니다.',
      '한 단어가 문을 붙잡고 있습니다. 한 글자씩 밝혀내면 열립니다.',
    ],
    imageSlot: 'shrineDoor',
    hasChallenge: false,
    challengeContext: 'event',
  },
  rest: {
    type: 'rest',
    title: '쉼터',
    bodyText: ['조용하고 마른, 안전한 구석입니다.', '상처를 돌볼 수 있는 곳입니다. 물론 값을 치러야 하지만요.'],
    imageSlot: 'rest',
    hasChallenge: false,
    challengeContext: 'event',
  },
  battle: {
    type: 'battle',
    title: '몬스터 조우!',
    bodyText: ['적대적인 생물이 길을 막아섭니다!', '전투를 준비하세요.'],
    imageSlot: 'trap1',
    hasChallenge: false,
    challengeContext: 'event',
  },
  direction: {
    type: 'direction',
    title: '갈림길',
    bodyText: ['앞에서 길이 갈라집니다.', '어느 쪽이든 기회가 있고, 그만한 위험도 있습니다.'],
    imageSlot: 'roadSign',
    hasChallenge: false,
    challengeContext: 'event',
  },
  boss_door: {
    type: 'boss_door',
    title: '보스의 문',
    bodyText: [
      '거대한 검은 돌문이 길을 가득 메우고 있습니다.',
      '한가운데에 열쇠 구멍 하나가 있습니다. 돌아올 길을 표시해 둡니다.',
    ],
    imageSlot: 'bossDoor',
    hasChallenge: false,
    challengeContext: 'event',
  },
  key_room: {
    type: 'key_room',
    title: '열쇠의 방',
    bodyText: [
      '이 던전이 가르치려던 모든 단어를 마주했습니다.',
      '소박한 돌 받침 위에 묵직한 쇠 열쇠가 놓여 있습니다.',
    ],
    imageSlot: 'key',
    hasChallenge: false,
    challengeContext: 'event',
  },
}

/** Flavor for the mimic reveal, shown before the fight starts. */
export const mimicRevealText = [
  '뚜껑이 흔들리더니, 이빨을 드러낸 아가리로 갈라집니다.',
  '애초에 상자가 아니었습니다. 기다리고 있었을 뿐입니다.',
]
