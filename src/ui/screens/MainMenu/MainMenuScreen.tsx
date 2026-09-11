import { useUiStore } from '@/state/uiStore'
import { findNewContent, hasNewContent } from '@/systems/newContent'
import { allWorlds } from '@/systems/worldRegistry'
import { assetKeys } from '@/config/assets'
import { nameFromSlot } from '@/systems/worldRegistry'
import { usePersistentStore } from '@/state/persistentStore'
import { AssetImage } from '@/ui/components/AssetImage'
import { Bar } from '@/ui/components/Bar'
import { totemBalance } from '@/config/balance'
import { AudioSettings } from '@/ui/components/AudioSettings'

const menuItems = [
  { screen: 'compendium' as const, icon: '📖', label: '주문 불러오기 / 도감', desc: '주문 단어와 주문 세트를 만들고 정리합니다.' },
  { screen: 'totem' as const, icon: '🗿', label: '토템', desc: '토템을 확인하고 전투용 주문 세트를 장착합니다.' },
  { screen: 'dungeon' as const, icon: '🗝️', label: '던전', desc: '던전을 설정하고 탐험을 시작합니다.' },
  { screen: 'records' as const, icon: '📊', label: '기록', desc: '모든 주문 단어와 학습 통계를 살펴봅니다.' },
]

export function MainMenuScreen() {
  const goTo = useUiStore((s) => s.goTo)
  const totem = usePersistentStore((s) => s.totems.find((t) => t.id === s.activeTotemId))
  const seenContent = usePersistentStore((s) => s.seenContent)
  const acknowledgeNewContent = usePersistentStore((s) => s.acknowledgeNewContent)

  // What has appeared since the player last looked. The build already knows
  // the full catalogue; this is only about what they have been told.
  const fresh = findNewContent(allWorlds, assetKeys('totems'), seenContent)
  const spellCount = usePersistentStore((s) => s.spells.length)

  return (
    <div className="screen">
      {hasNewContent(fresh) && (
        <button className="new-content-notice" onClick={acknowledgeNewContent}>
          <span className="new-content-title">✦ 새로운 내용이 추가되었습니다</span>
          {fresh.worlds.length > 0 && (
            <span className="new-content-line">새 세계 · {fresh.worlds.map((w) => w.name).join(', ')}</span>
          )}
          {fresh.totems.length > 0 && (
            <span className="new-content-line">새 토템 · {fresh.totems.map(nameFromSlot).join(', ')}</span>
          )}
          <span className="faint new-content-dismiss">눌러서 확인</span>
        </button>
      )}

      <div className="menu-title">
        <span className="glyph">🔮</span>
        <h1>Project H</h1>
        <p className="muted">언어 학습 던전 크롤러</p>
      </div>

      {totem && (
        <button className="totem-banner" onClick={() => goTo('totem')}>
          <span className="totem-banner-tag">내 토템</span>
          <AssetImage
            category="totems"
            assetKey={totem.avatarKey}
            alt={totem.name}
            className="avatar-img avatar-hero"
          />
          <div className="totem-banner-body">
            <div className="name-row">
              <span className="name">{totem.name}</span>
              <span className="muted">Lv {totem.level}</span>
            </div>
            <div className="hp-row">
              <span>❤️ {totem.currentHp}/{totem.maxHp}</span>
              <div style={{ flex: 1 }}>
                <Bar value={totem.currentHp} max={totem.maxHp} kind="hp" thin />
              </div>
            </div>
            <div className="hp-row">
              <span>✨ {totem.experience}/{totemBalance.xpToNextLevel(totem.level)}</span>
              <div style={{ flex: 1 }}>
                <Bar value={totem.experience} max={totemBalance.xpToNextLevel(totem.level)} kind="xp" thin />
              </div>
            </div>
            <div className="totem-banner-foot faint">
              💰 {totem.money} · 아는 주문 {spellCount}개
            </div>
          </div>
        </button>
      )}

      <div className="menu-list">
        {menuItems.map((item) => (
          <button key={item.screen} className="menu-item" onClick={() => goTo(item.screen)}>
            <span className="icon">{item.icon}</span>
            <div>
              <div className="label">{item.label}</div>
              <div className="desc">{item.desc}</div>
            </div>
          </button>
        ))}
      </div>

      <div style={{ flex: 1 }} />
      <AudioSettings />
      <p className="faint" style={{ textAlign: 'center' }}>
        완전 오프라인 · 진행 상황은 이 기기에 저장됩니다
      </p>
    </div>
  )
}
