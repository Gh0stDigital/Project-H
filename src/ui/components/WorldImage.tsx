import type { WorldPack } from '@/config/worldManifest'
import { worldAsset, type WorldFolder } from '@/systems/worldRegistry'

interface WorldImageProps {
  world: WorldPack | undefined
  folder: WorldFolder
  slot: string
  alt: string
  className?: string
}

/**
 * A picture from a world pack, addressed by slot.
 *
 * Renders nothing when the world has no such file rather than a broken
 * image: required slots are guaranteed by the pack format, so a miss here
 * only ever means an optional one, and an absent sprite reads better than a
 * torn icon.
 */
export function WorldImage({ world, folder, slot, alt, className }: WorldImageProps) {
  if (!world || !slot) return null
  const src = worldAsset(world, folder, slot)
  if (!src) return null
  return <img src={src} alt={alt} className={className ?? 'asset-img'} draggable={false} />
}
