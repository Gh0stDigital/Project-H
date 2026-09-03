import type { Totem } from '@/domain/totem'
import { AssetImage } from './AssetImage'
import { Bar } from './Bar'
import { useDamageFlash } from '@/ui/hooks/useDamageFlash'

interface TotemPanelProps {
  totem: Totem
  effectText?: string
  /** Smaller footprint for screens tight on vertical space (e.g. Dungeon config). */
  compact?: boolean
}

export function TotemPanel({ totem, effectText, compact }: TotemPanelProps) {
  // Watching HP here covers every way the player can be hurt, in the dungeon
  // and in battle alike, since this panel is on screen for both.
  const hit = useDamageFlash(totem.currentHp)

  return (
    <div className={`totem-panel${compact ? ' compact' : ''}${hit ? ' is-hit' : ''}`}>
      <span className="totem-panel-tag">Your Totem</span>
      <AssetImage
        category="totems"
        assetKey={totem.avatarKey}
        alt={totem.name}
        className={`avatar-img avatar-hero${hit ? ' is-hit' : ''}`}
      />
      <div className="stats">
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
          <span>💰 {totem.money}</span>
          {effectText && <span className="faint">{effectText}</span>}
        </div>
      </div>
    </div>
  )
}
