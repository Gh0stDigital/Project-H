import { useState } from 'react'
import { getAsset, type AssetCategory } from '@/config/assets'

interface SceneBackdropProps {
  category: AssetCategory
  assetKey: string
  alt: string
}

/**
 * The dungeon backdrop, crossfaded when the area changes.
 *
 * Swapping an <img> src outright makes every move land as a hard cut, and
 * shows an empty frame while the next picture decodes — these backdrops are
 * large, so that gap is visible. This keeps the outgoing image on screen and
 * fades the incoming one in over it, but only once it has actually loaded,
 * so a slow decode delays the transition instead of flashing blank.
 */
export function SceneBackdrop({ category, assetKey, alt }: SceneBackdropProps) {
  const src = getAsset(category, assetKey)
  const [current, setCurrent] = useState(src)
  const [previous, setPrevious] = useState<string | null>(null)
  const [loaded, setLoaded] = useState(true)

  // Adjusted during render rather than in an effect, so the incoming layer
  // is committed already transparent. Starting it visible and fading after
  // an effect would show one frame of the new image at full opacity, which
  // is the hard cut this component exists to remove.
  if (src !== current) {
    setPrevious(current)
    setCurrent(src)
    setLoaded(false)
  }

  return (
    <>
      {previous && previous !== current && (
        <img src={previous} alt="" aria-hidden className="asset-img scene-layer is-out" draggable={false} />
      )}
      <img
        key={current}
        src={current}
        alt={alt}
        draggable={false}
        className={`asset-img scene-layer${loaded ? ' is-in' : ''}`}
        onLoad={() => setLoaded(true)}
        // Once the incoming layer is opaque the outgoing one is invisible
        // and only costs memory.
        onTransitionEnd={() => setPrevious(null)}
      />
    </>
  )
}
