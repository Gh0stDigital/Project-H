import { useEffect } from 'react'
import { audio } from '@/systems/audioEngine'
import { usePersistentStore } from '@/state/persistentStore'
import { allSfx } from '@/config/audio'

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
    // Autoplay rules mean the first real gesture is the only chance to start
    // an audio context. Several event names because a tap is a pointerdown on
    // most things and a touchend on some older iOS.
    const events = ['pointerdown', 'touchend', 'keydown'] as const
    const start = () => {
      audio.unlock()
      // Warm every one-shot now. They are small, and a cue that decodes on
      // first use is a cue that is silent the first time you need it.
      void audio.preload(allSfx)
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
