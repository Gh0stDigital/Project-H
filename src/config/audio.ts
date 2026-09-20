/**
 * What each cue sounds like in the mix: how loud, which bus, and how often it
 * is allowed to fire.
 *
 * Separate from the manifest on purpose. The manifest says what files exist;
 * this says how they behave, and is the file to edit when something is too
 * loud or too eager — not the audio itself.
 */

import { audioManifest, audioFiles, worldMusic } from './audioManifest'

export type MusicCue = (typeof audioManifest.music)[number]
export type AmbientCue = (typeof audioManifest.ambient)[number]
export type SfxCue = (typeof audioManifest.sfx)[number]
export type AudioFolder = 'music' | 'ambient' | 'sfx'

export interface SfxSpec {
  /** Level relative to the sfx bus. */
  gain: number
  /**
   * Shortest gap between two plays of this cue, in seconds. A battle can
   * resolve several hits in one frame, and the same sample started five times
   * on the same millisecond is one loud click rather than five hits.
   */
  minInterval: number
  /**
   * Playback-rate spread on repeats. A little is the difference between a
   * sound repeating and a sound machine-gunning.
   */
  detune: number
}

const defaults: SfxSpec = { gain: 0.9, minInterval: 0.04, detune: 0.06 }

/** Only the cues that want something other than the default appear here. */
const sfxOverrides: Partial<Record<SfxCue, Partial<SfxSpec>>> = {
  damage: { gain: 1, minInterval: 0.06, detune: 0.1 },
  playerAttack: { detune: 0.09 },
  enemyAttack: { detune: 0.09 },
  // Stings: one at a time, and never pitch-shifted — they are punctuation.
  victory: { gain: 1, minInterval: 1.2, detune: 0 },
  defeat: { gain: 1, minInterval: 1.2, detune: 0 },
  levelUp: { gain: 1, minInterval: 1, detune: 0 },
  discovery: { minInterval: 0.5, detune: 0 },
  bossDoor: { gain: 1, minInterval: 0.8, detune: 0 },
  battleStart: { gain: 1, minInterval: 0.8, detune: 0 },
  // The quietest file in the pack by average level — a sparse, reverby
  // sting whose peak is as high as everything else but whose body is not.
  shrine: { gain: 1, minInterval: 0.8, detune: 0 },
  // The opening. Both are stings: one at a time, never pitch-shifted, and
  // pulled down a little — they peak within half a decibel of full scale,
  // where `confirm`, the click the player will hear all day, peaks at -7,
  // so at the default gain they would arrive noticeably louder than the
  // game that follows them.
  gameStart: { gain: 0.78, minInterval: 1, detune: 0 },
  gameChoice: { gain: 0.8, minInterval: 0.5, detune: 0 },
  // Fired on nearly every tap, so they sit back in the mix.
  confirm: { gain: 0.55, minInterval: 0.05 },
  cancel: { gain: 0.55, minInterval: 0.05 },
  move: { gain: 0.78 },
  npcTalk: { gain: 0.6, detune: 0.12 },
  diceRoll: { gain: 0.7, minInterval: 0.3, detune: 0 },
  correct: { gain: 0.95, minInterval: 0.15, detune: 0.03 },
  wrong: { gain: 0.85, minInterval: 0.15, detune: 0.03 },
}

export function sfxSpec(cue: SfxCue): SfxSpec {
  return { ...defaults, ...sfxOverrides[cue] }
}

/** Per-track level, so a boss theme does not arrive twice as loud as a menu. */
export const musicGain: Partial<Record<MusicCue, number>> = {
  battle: 0.9,
  boss: 0.95,
}

export const ambientGain: Partial<Record<AmbientCue, number>> = {
  wind: 0.55,
  drip: 0.4,
  night: 0.5,
}

/**
 * The whole ambience bus, under the music.
 *
 * Two beds run at once — a corridor is wind *and* dripping water — so their
 * levels add, and at full bus gain the weather was sitting on top of the
 * track instead of behind it. This is the one knob to turn when ambience is
 * too loud; the per-cue gains above are for balancing the beds against each
 * other.
 */
export const ambientBusGain = 0.3

export const audioTiming = {
  /** Music crossfade. Long enough not to cut, short enough not to smear. */
  musicFadeSeconds: 0.45,
  /** Ambience fades slower — it is weather, not a transition. */
  ambientFadeSeconds: 1.2,
  /** How far the beds duck under a sting or a battle start. */
  duckTo: 0.35,
  duckSeconds: 0.25,
  duckHoldSeconds: 0.9,
}

/** Where a cue's file lives, as a path from public/. */
export function audioPath(folder: AudioFolder, cue: string, worldId?: string | null): string | null {
  if (folder === 'music' && worldId && worldMusic[worldId]?.includes(cue)) {
    return audioFiles[`worlds/${worldId}/music/${cue}`] ? `worlds/${worldId}/music/${audioFiles[`worlds/${worldId}/music/${cue}`]}` : null
  }
  const file = audioFiles[`audio/${folder}/${cue}`]
  return file ? `audio/${folder}/${file}` : null
}

export const allSfx = audioManifest.sfx
export const allMusic = audioManifest.music
export const allAmbient = audioManifest.ambient
