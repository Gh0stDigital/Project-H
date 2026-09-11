// Types for gen-audio-manifest.mjs, imported by vite.config.ts so the build
// and the dev server regenerate the sound catalogue the same way they do art.

export declare const AUDIO_DIR: string

export declare function generateAudioManifest(): {
  changed: boolean
  total: number
  /** Cue names with no file behind them. Silent, not broken. */
  missing: string[]
  cues: Record<string, string[]>
  worldMusic: Record<string, string[]>
  source: string
}
