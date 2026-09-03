import type { Totem } from '@/domain/totem'
import { AssetImage } from './AssetImage'
import { Bar } from './Bar'

interface TotemPanelProps {
  totem: Totem
  effectText?: string
  /** Smaller footprint for screens tight on vertical space (e.g. Dungeon config). */
  compact?: boolean
}

export function TotemPanel({ totem, effectText, compact }: TotemPanelProps) {
  return (
    <div className={`totem-panel${compact ? ' compact' : ''}`}>
      <span className="totem-panel-tag">Your Totem</span>
      <AssetImage category="totems" assetKey={totem.avatarKey} alt={totem.name} className="avatar-img avatar-hero" />
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
