import { useEffect } from 'react'
import { audio } from '@/systems/audioEngine'
import type { SfxCue } from '@/config/audio'

/**
 * A click on anything should make a noise.
 *
 * Delegated from the root rather than wired into each handler: every button in
 * the game gets feedback without thirty files learning about audio, and a
 * button added tomorrow is covered without anyone remembering to.
 *
 * Buttons that mean something other than "yes" say so in markup:
 *
 *   <button data-sfx="cancel">   a different cue
 *   <button data-sfx="none">     silent, for anything that has its own sound
 */
export function useUiSounds(): void {
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const el = (e.target as HTMLElement | null)?.closest<HTMLElement>('button, [role="button"]')
      if (!el || el.hasAttribute('disabled')) return
      const cue = (el.dataset.sfx ?? 'confirm') as SfxCue | 'none'
      if (cue === 'none') return
      audio.play(cue)
    }
    document.addEventListener('click', onClick, { capture: true })
    return () => document.removeEventListener('click', onClick, { capture: true })
  }, [])
}
