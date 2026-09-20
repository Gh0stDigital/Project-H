import { useEffect } from 'react'
import { audio } from '@/systems/audioEngine'
import { usePersistentStore } from '@/state/persistentStore'
import { allSfx, allAmbient } from '@/config/audio'

/**
 * Connects the engine to the page: gestures to unlock it, the player's
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
    //
    // The listener stays for the life of the app rather than removing itself
    // after the first one. A context does not only start suspended — the OS
    // suspends it every time the player leaves the app — so "unlock once and
    // we are done" was only true until the first phone call. Keeping it costs
    // nothing: on a running context resume() returns having done nothing, and
    // it means any tap anywhere is a second chance to get the sound back.
    const events = ['pointerdown', 'touchend', 'keydown'] as const
    // unlock() rather than resume(): this *is* the gesture, and on the very
    // first one it is the only thing allowed to start anything.
    const wake = () => { audio.unlock() }
    for (const e of events) window.addEventListener(e, wake, { passive: true })
    return () => { for (const e of events) window.removeEventListener(e, wake) }
  }, [])

  useEffect(() => {
    audio.setVolumes({ music: musicVolume, sfx: sfxVolume, muted })
  }, [musicVolume, sfxVolume, muted])

  useEffect(() => {
    /**
     * Leaving the app, and coming back.
     *
     * Going away is easy: drop the gain so nothing plays in a pocket. Coming
     * back is where this was broken — it restored the gain and stopped there,
     * while the OS had suspended the context in the meantime. Turning up the
     * volume of a context that is not running is silence, which is exactly
     * what players reported. Hence the resume, and hence restoring the levels
     * after it rather than before.
     *
     * pageshow and focus as well as visibilitychange: an iOS app coming back
     * from the back/forward cache gets those, and not always the other one.
     */
    const restore = () => {
      void audio.resume().then(() => audio.setVolumes({ music: musicVolume, sfx: sfxVolume, muted }))
    }
    const onVisibility = () => {
      if (document.hidden) audio.setVolumes({ music: 0, sfx: 0, muted: true })
      else restore()
    }
    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('pageshow', restore)
    window.addEventListener('focus', restore)
    return () => {
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('pageshow', restore)
      window.removeEventListener('focus', restore)
    }
  }, [musicVolume, sfxVolume, muted])
}
