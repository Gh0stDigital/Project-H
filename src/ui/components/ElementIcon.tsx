import type { ElementDef } from '@/config/wordTypes'
import { getAsset, hasAsset } from '@/config/assets'

interface ElementIconProps {
  element: ElementDef
  /** Rendered edge length in px. */
  size?: number
  className?: string
}

/**
 * An element, as its own icon.
 *
 * The game had two sets of these: the painted seals in public/assets/spells
 * on the cards, and an emoji beside every word everywhere else. One element,
 * two faces. This is the single one — the painted icon where the folder has
 * it, and the emoji where it does not.
 *
 * The fallback matters: `lightning` and `metal` have no art yet, and beside
 * a word an icon is a label rather than decoration, so borrowing another
 * element's seal the way a card face does would be a lie. The emoji is
 * honest until the art arrives, at which point every one of these upgrades
 * on its own.
 */
export function ElementIcon({ element, size = 15, className }: ElementIconProps) {
  const painted = hasAsset('spells', element.id)
  if (!painted) {
    return (
      <span className={`element-icon-emoji${className ? ` ${className}` : ''}`} title={element.label}>
        {element.icon}
      </span>
    )
  }
  return (
    <img
      src={getAsset('spells', element.id)}
      alt=""
      title={element.label}
      width={size}
      height={size}
      className={`element-icon-img${className ? ` ${className}` : ''}`}
      style={{ width: size, height: size }}
      draggable={false}
    />
  )
}
