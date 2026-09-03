import { getAsset, type AssetCategory } from '@/config/assets'

interface AssetImageProps {
  category: AssetCategory
  assetKey?: string | null
  alt: string
  className?: string
}

/** Renders a local placeholder-or-final PNG for a given asset slot. */
export function AssetImage({ category, assetKey, alt, className }: AssetImageProps) {
  const src = getAsset(category, assetKey)
  return <img src={src} alt={alt} className={className ?? 'asset-img'} draggable={false} />
}
