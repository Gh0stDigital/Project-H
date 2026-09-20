import { useState } from 'react'
import type { WorldPack } from '@/config/worldManifest'
import { worldAsset } from '@/systems/worldRegistry'

interface SceneBackdropProps {
  world: WorldPack | undefined
  /** Location slot within the world, e.g. 'corridor1'. */
  slot: string | null
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
/**
 * How much taller than the scene window an image has to be before it is
 * anchored low rather than centred, as a height-to-width ratio. The window
 * is 1 / 0.82, so anything at 0.95 or squarer is a tall shot.
 */
const TALL_RATIO = 0.95

/**
 * Where a tall backdrop sits inside the window.
 *
 * Dungeon art puts the floor at the bottom, so cropping a tall image about
 * its middle shows walls and ceiling and cuts away the part the player is
 * standing on. Not quite the very bottom: a little of what is overhead is
 * worth keeping.
 */
const TALL_ANCHOR = '50% 85%'

export function SceneBackdrop({ world, slot, alt }: SceneBackdropProps) {
  const src = (world && slot && worldAsset(world, 'locations', slot)) || null
  const [current, setCurrent] = useState(src ?? '')
  const [previous, setPrevious] = useState<string | null>(null)
  const [loaded, setLoaded] = useState(true)
  const [anchor, setAnchor] = useState<string | undefined>(undefined)

  // Adjusted during render rather than in an effect, so the incoming layer
  // is committed already transparent. Starting it visible and fading after
  // an effect would show one frame of the new image at full opacity, which
  // is the hard cut this component exists to remove.
  if (src && src !== current) {
    setPrevious(current)
    setCurrent(src)
    setLoaded(false)
    // Measured from the incoming image once it loads; until then, centred.
    setAnchor(undefined)
  }

  // Before a world resolves there is nothing to draw. Rendering an <img>
  // with an empty src would make the browser refetch the whole page.
  if (!current) return null

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
        style={anchor ? { objectPosition: anchor } : undefined}
        onLoad={(e) => {
          // The only place the image's real shape is known. A pack can ship
          // a backdrop at any aspect, so this is measured rather than
          // configured per world.
          const img = e.currentTarget
          const ratio = img.naturalWidth > 0 ? img.naturalHeight / img.naturalWidth : 0
          setAnchor(ratio >= TALL_RATIO ? TALL_ANCHOR : undefined)
          setLoaded(true)
        }}
        // Once the incoming layer is opaque the outgoing one is invisible
        // and only costs memory.
        onTransitionEnd={() => setPrevious(null)}
      />
    </>
  )
}
