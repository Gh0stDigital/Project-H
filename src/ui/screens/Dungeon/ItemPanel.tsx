import type { InventoryEntry } from '@/domain/item'
import { getItemDef } from '@/config/items'
import { SlidePanel } from '@/ui/components/SlidePanel'

interface ItemPanelProps {
  inventory: InventoryEntry[]
  onUse: (itemId: InventoryEntry['itemId']) => void
  onClose: () => void
}

export function ItemPanel({ inventory, onUse, onClose }: ItemPanelProps) {
  const stacks = inventory.filter((e) => e.quantity > 0)

  return (
    <SlidePanel title="아이템" onClose={onClose}>
      {stacks.length === 0 ? (
        <div className="empty-state">
          <span className="glyph">🎒</span>
          <p>가방이 비었습니다. 보물 상자를 열어 아이템을 찾으세요.</p>
        </div>
      ) : (
        <div className="list">
          {stacks.map((entry) => {
            const def = getItemDef(entry.itemId)
            return (
              <div key={entry.itemId} className="item-row">
                <span className="item-icon">{def.icon}</span>
                <div className="item-body">
                  <div className="item-name">
                    {def.name} <span className="faint">×{entry.quantity}</span>
                  </div>
                  <div className="faint">{def.description}</div>
                </div>
                <button className="btn btn-primary btn-sm" onClick={() => onUse(entry.itemId)}>
                  사용
                </button>
              </div>
            )
          })}
        </div>
      )}
    </SlidePanel>
  )
}
