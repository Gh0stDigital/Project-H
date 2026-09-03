import { useUiStore } from '@/state/uiStore'
import { usePersistentStore } from '@/state/persistentStore'
import { AssetImage } from '@/ui/components/AssetImage'
import { Bar } from '@/ui/components/Bar'
import { totemBalance } from '@/config/balance'

const menuItems = [
  { screen: 'compendium' as const, icon: '📖', label: 'Load Spells / Compendium', desc: 'Create, edit, and organize Spell Words and Spell Sets.' },
  { screen: 'totem' as const, icon: '🗿', label: 'Totem', desc: 'View your Totem and equip a Spell Set for battle.' },
  { screen: 'dungeon' as const, icon: '🗝️', label: 'Dungeon', desc: 'Configure a dungeon and start exploring.' },
  { screen: 'records' as const, icon: '📊', label: 'Records', desc: 'Review every Spell Word and its study statistics.' },
]

export function MainMenuScreen() {
  const goTo = useUiStore((s) => s.goTo)
  const totem = usePersistentStore((s) => s.totems.find((t) => t.id === s.activeTotemId))
  const spellCount = usePersistentStore((s) => s.spells.length)

  return (
    <div className="screen">
      <div className="menu-title">
        <span className="glyph">🔮</span>
        <h1>Thoth</h1>
        <p className="muted">A language-study dungeon crawler</p>
      </div>

      {totem && (
        <button className="totem-banner" onClick={() => goTo('totem')}>
          <span className="totem-banner-tag">Your Totem</span>
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
              💰 {totem.money} · {spellCount} Spells known
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
      <p className="faint" style={{ textAlign: 'center' }}>
        Fully offline · progress saved on this device
      </p>
    </div>
  )
}
