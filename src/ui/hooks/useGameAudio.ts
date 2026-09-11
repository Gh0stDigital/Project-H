import { useEffect } from 'react'
import { audio } from '@/systems/audioEngine'
import { usePersistentStore } from '@/state/persistentStore'
import { allSfx, allAmbient } from '@/config/audio'

/**
 * Connects the engine to the page: one gesture to unlock it, the player's
 * volumes kept in sync, and everything quiet while the app is in the
 * background.
 *
 * Mounted once, at the root. Nothing here is awaited — if any of it fails the
 * game carries on without sound.
 */
export function useGameAudio(): void {
  const musicVolume = usePersistentStore((s) => s.settings.musicVolume)
  const sfxVolume = usePersistentStore((s) => s.settings.sfxVolume)
  const muted = usePersistentStore((s) => s.settings.muted)

  useEffect(() => {
    // Decode now, at load, rather than on the gesture. A context may be built
    // before any interaction — it starts suspended — and a suspended context
    // still decodes. Doing it here is what stops the menu theme arriving a
    // second late, since the gesture then only has to resume.
    void audio.warm('menu', allSfx, allAmbient)

    // Autoplay rules still mean the first real gesture is the only thing that
    // can start playback. Several event names because a tap is a pointerdown
    // on most things and a touchend on some older iOS.
    const events = ['pointerdown', 'touchend', 'keydown'] as const
    const start = () => {
      audio.unlock()
      for (const e of events) window.removeEventListener(e, start)
    }
    for (const e of events) window.addEventListener(e, start, { passive: true })
    return () => { for (const e of events) window.removeEventListener(e, start) }
  }, [])

  useEffect(() => {
    audio.setVolumes({ music: musicVolume, sfx: sfxVolume, muted })
  }, [musicVolume, sfxVolume, muted])

  useEffect(() => {
    // A phone that locks mid-run should not keep playing in a pocket.
    const onHide = () => { if (document.hidden) audio.setVolumes({ music: 0, sfx: 0, muted: true }) 
      else audio.setVolumes({ music: musicVolume, sfx: sfxVolume, muted }) }
    document.addEventListener('visibilitychange', onHide)
    return () => document.removeEventListener('visibilitychange', onHide)
  }, [musicVolume, sfxVolume, muted])
}
