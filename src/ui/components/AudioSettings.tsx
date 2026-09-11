import { usePersistentStore } from '@/state/persistentStore'

/** Volume and mute. Lives in the same panel wherever settings are shown. */
export function AudioSettings() {
  const settings = usePersistentStore((s) => s.settings)
  const updateSettings = usePersistentStore((s) => s.updateSettings)

  return (
    <div className="audio-settings">
      <div className="field">
        <label htmlFor="music-volume">음악 · 분위기</label>
        <input
          id="music-volume"
          type="range"
          min={0}
          max={100}
          value={Math.round(settings.musicVolume * 100)}
          onChange={(e) => updateSettings({ musicVolume: Number(e.target.value) / 100 })}
        />
      </div>
      <div className="field">
        <label htmlFor="sfx-volume">효과음</label>
        <input
          id="sfx-volume"
          type="range"
          min={0}
          max={100}
          value={Math.round(settings.sfxVolume * 100)}
          onChange={(e) => updateSettings({ sfxVolume: Number(e.target.value) / 100 })}
        />
      </div>
      <button
        className="btn btn-ghost btn-block"
        data-sfx="none"
        onClick={() => updateSettings({ muted: !settings.muted })}
      >
        {settings.muted ? '🔇 소리 켜기' : '🔊 소리 끄기'}
      </button>
    </div>
  )
}
