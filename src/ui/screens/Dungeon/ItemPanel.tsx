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
    <SlidePanel title="Items" onClose={onClose}>
      {stacks.length === 0 ? (
        <div className="empty-state">
          <span className="glyph">🎒</span>
          <p>Your pack is empty. Open treasure chests to find items.</p>
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
                  Use
                </button>
              </div>
            )
          })}
        </div>
      )}
    </SlidePanel>
  )
}
