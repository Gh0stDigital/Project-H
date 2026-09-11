/**
 * Sound.
 *
 * Three problems make browser audio feel cursed, and each is designed out
 * here rather than worked around at the call site.
 *
 * 1. Latency. An <audio> element has a load pipeline and a play() that
 *    returns a promise, which puts 50-200 unpredictable milliseconds between
 *    a hit landing and the sound of it. So: decode once into an AudioBuffer,
 *    then start a fresh source node per play. That is sample-accurate, and a
 *    node is cheap enough to throw away every time — which is also what makes
 *    overlapping copies of one sound free, where an element could only ever
 *    play a sound once at a time.
 *
 * 2. Loading. Firing a cue whose buffer has not decoded yet is the other half
 *    of the same bug. Here it is simply silent: play() checks and returns.
 *    Nothing in this file throws, and nothing the game does is ever awaited on
 *    audio — a sound that is missing, slow or broken must never be able to
 *    interrupt a battle.
 *
 * 3. Autoplay. The context starts suspended and needs a real gesture; older
 *    iOS also wants a silent buffer played once before it will co-operate.
 *    unlock() does both, and music asked for before then is remembered and
 *    started when it lands, so the caller never has to know.
 *
 * And one that is specific to this game: it runs offline from file://, where
 * fetch() is blocked. The usual recipe — fetch the url, decode the response —
 * therefore works when hosted and is silent on the phone. Decoding straight
 * from base64 avoids the network layer entirely, so both builds take one path.
 */

import {
  ambientGain,
  audioPath,
  audioTiming,
  musicGain,
  sfxSpec,
  type AmbientCue,
  type AudioFolder,
  type MusicCue,
  type SfxCue,
} from '@/config/audio'

export interface AudioVolumes {
  music: number
  sfx: number
  muted: boolean
}

/** The slice of AudioContext this uses, so a test can supply its own. */
export type AudioContextLike = Pick<
  AudioContext,
  'createGain' | 'createBufferSource' | 'createBuffer' | 'decodeAudioData' | 'currentTime' | 'destination' | 'state' | 'resume'
>

interface Bed {
  source: AudioBufferSourceNode
  gain: GainNode
  cue: string
}

function inlined(): Record<string, string> | undefined {
  return (globalThis as { __THOTH_INLINE_ASSETS?: Record<string, string> }).__THOTH_INLINE_ASSETS
}

/**
 * base64 -> bytes, without going through fetch().
 *
 * This is the whole reason sound works from a file:// build: a data URI
 * handed to fetch() is a request, and requests from a null origin are
 * refused. Decoding the characters by hand is not.
 */
function bytesFromDataUri(uri: string): ArrayBuffer {
  const binary = atob(uri.slice(uri.indexOf(',') + 1))
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes.buffer
}

/**
 * Where a bed should loop, in seconds.
 *
 * mp3 carries encoder delay and padding — a few hundred samples of silence at
 * each end that are an artefact of the format, not the recording. Looping the
 * whole buffer therefore plays that silence every cycle, which on a 4.6-second
 * wind bed is an audible tick roughly every four seconds.
 *
 * So the loop points skip it. Only a little: the trim is capped, because past
 * that a quiet edge is the recording rather than the encoder, and cutting into
 * it would be worse than the tick.
 */
const LOOP_SILENCE = 0.0015 // about -56 dB
/**
 * An mp3's encoder delay is around 1100-2300 samples, so 50 ms covers it with
 * room to spare. It was 250 ms first, and that was wrong: the menu theme
 * fades in, so the trim ate a quarter-second of real music. Past this the
 * quiet is the recording and gets left alone.
 */
const MAX_TRIM_SECONDS = 0.05

export function loopPoints(buffer: AudioBuffer): { start: number; end: number } {
  const whole = { start: 0, end: buffer.duration }
  // Anything unexpected about the buffer costs the trim, not the sound.
  if (typeof buffer.getChannelData !== 'function') return whole
  const data = buffer.getChannelData(0)
  const rate = buffer.sampleRate
  if (!data?.length || !rate) return whole
  const limit = Math.floor(MAX_TRIM_SECONDS * rate)

  let first = 0
  while (first < limit && first < data.length && Math.abs(data[first]) < LOOP_SILENCE) first++

  let last = data.length - 1
  const floor = data.length - 1 - limit
  while (last > floor && last > first && Math.abs(data[last]) < LOOP_SILENCE) last--

  if (first >= last) return whole
  return { start: first / rate, end: (last + 1) / rate }
}

export class AudioEngine {
  private ctx: AudioContextLike | null = null
  private master: GainNode | null = null
  private musicBus: GainNode | null = null
  private ambientBus: GainNode | null = null
  private sfxBus: GainNode | null = null

  private buffers = new Map<string, AudioBuffer>()
  private loading = new Map<string, Promise<AudioBuffer | null>>()
  private lastPlayed = new Map<string, number>()

  private music: Bed | null = null
  private beds = new Map<string, Bed>()
  /** Asked for before the first gesture; started the moment there is one. */
  private pending: { music: MusicCue | null; ambient: AmbientCue[]; worldId: string | null } | null = null
  private worldId: string | null = null
  private volumes: AudioVolumes = { music: 0.7, sfx: 0.9, muted: false }
  private duckUntil = 0

  private makeContext: () => AudioContextLike
  private random: () => number

  constructor(makeContext: () => AudioContextLike = () => new AudioContext(), random: () => number = Math.random) {
    this.makeContext = makeContext
    this.random = random
  }

  get unlocked(): boolean {
    return this.ctx !== null && this.ctx.state === 'running'
  }

  /**
   * Call from a real user gesture. Safe to call repeatedly; the work happens
   * once. Everything else in this class is a no-op until it has run.
   */
  unlock(): void {
    if (!this.ctx) {
      try {
        this.ctx = this.makeContext()
      } catch {
        return // No Web Audio: the game is simply silent.
      }
      this.buildBuses()
      // Safari otherwise routes through the ringer, where the hardware mute
      // switch silences a game that the player explicitly started.
      const session = (navigator as { audioSession?: { type: string } }).audioSession
      if (session) session.type = 'playback'
    }
    void this.ctx.resume?.()
    // Older iOS needs to have actually played something before it believes
    // the gesture happened.
    try {
      const blip = this.ctx.createBuffer(1, 1, 22050)
      const source = this.ctx.createBufferSource()
      source.buffer = blip
      source.connect(this.ctx.destination)
      source.start(0)
    } catch {
      // Not fatal: resume() alone is enough on everything newer.
    }
    const queued = this.pending
    this.pending = null
    if (queued) {
      this.worldId = queued.worldId
      this.setMusic(queued.music)
      this.setAmbience(queued.ambient)
    }
  }

  private buildBuses(): void {
    const ctx = this.ctx!
    this.master = ctx.createGain()
    this.master.connect(ctx.destination as AudioNode)
    this.musicBus = ctx.createGain()
    this.ambientBus = ctx.createGain()
    this.sfxBus = ctx.createGain()
    // Ambience hangs off the music bus: it is background, and the player has
    // one slider for background and one for the game making noises at them.
    this.musicBus.connect(this.master)
    this.ambientBus.connect(this.musicBus)
    this.sfxBus.connect(this.master)
    this.applyVolumes()
  }

  setVolumes(v: AudioVolumes): void {
    this.volumes = v
    this.applyVolumes()
  }

  private applyVolumes(): void {
    if (!this.master) return
    this.master.gain.value = this.volumes.muted ? 0 : 1
    this.musicBus!.gain.value = this.volumes.music
    this.sfxBus!.gain.value = this.volumes.sfx
  }

  /** Warms the cues that have to be instant. Safe to call more than once. */
  async preload(cues: readonly SfxCue[]): Promise<void> {
    await Promise.all(cues.map((c) => this.buffer('sfx', c)))
  }

  private async buffer(folder: AudioFolder, cue: string): Promise<AudioBuffer | null> {
    const path = audioPath(folder, cue, this.worldId)
    if (!path || !this.ctx) return null
    const cached = this.buffers.get(path)
    if (cached) return cached
    const inFlight = this.loading.get(path)
    if (inFlight) return inFlight

    const work = (async () => {
      try {
        const uri = inlined()?.[path]
        const bytes = uri
          ? bytesFromDataUri(uri)
          : await (await fetch(path)).arrayBuffer()
        const decoded = await this.ctx!.decodeAudioData(bytes)
        this.buffers.set(path, decoded)
        return decoded
      } catch {
        // A cue that will not decode stays silent for the session rather than
        // retrying on every play.
        this.buffers.delete(path)
        return null
      } finally {
        this.loading.delete(path)
      }
    })()
    this.loading.set(path, work)
    return work
  }

  /** Fire and forget. Never throws, never awaits, silent if not ready. */
  play(cue: SfxCue): void {
    if (!this.ctx || !this.sfxBus || this.volumes.muted) return
    const spec = sfxSpec(cue)
    const now = this.ctx.currentTime
    const last = this.lastPlayed.get(cue)
    if (last !== undefined && now - last < spec.minInterval) return

    const path = audioPath('sfx', cue, this.worldId)
    if (!path) return
    const buf = this.buffers.get(path)
    if (!buf) {
      // Not decoded yet: start it for next time and stay quiet for this one.
      void this.buffer('sfx', cue)
      return
    }
    this.lastPlayed.set(cue, now)

    const source = this.ctx.createBufferSource()
    source.buffer = buf
    if (spec.detune) source.playbackRate.value = 1 + (this.random() - 0.5) * spec.detune
    const gain = this.ctx.createGain()
    gain.gain.value = spec.gain
    source.connect(gain)
    gain.connect(this.sfxBus)
    source.start()
  }

  /** Dips the beds so a sting lands clear, then brings them back. */
  duck(): void {
    if (!this.ctx || !this.musicBus) return
    const now = this.ctx.currentTime
    const { duckTo, duckSeconds, duckHoldSeconds } = audioTiming
    this.duckUntil = now + duckSeconds + duckHoldSeconds
    const g = this.musicBus.gain
    g.cancelScheduledValues?.(now)
    g.setValueAtTime?.(g.value, now)
    g.linearRampToValueAtTime?.(this.volumes.music * duckTo, now + duckSeconds)
    g.linearRampToValueAtTime?.(this.volumes.music, this.duckUntil)
  }

  /** Which world's music to prefer. Changing it re-resolves the current track. */
  setWorld(worldId: string | null): void {
    if (this.worldId === worldId) return
    this.worldId = worldId
    const playing = this.music?.cue as MusicCue | undefined
    if (playing) {
      const current = this.music
      this.music = null
      this.fadeOut(current)
      this.setMusic(playing)
    }
  }

  setMusic(cue: MusicCue | null): void {
    if (!this.ctx) {
      this.pending = { music: cue, ambient: this.pending?.ambient ?? [], worldId: this.worldId }
      return
    }
    if (this.music?.cue === cue) return
    const outgoing = this.music
    this.music = null
    if (outgoing) this.fadeOut(outgoing)
    if (!cue) return

    void this.buffer('music', cue).then((buf) => {
      // Another track may have been asked for while this one decoded.
      if (!buf || !this.ctx || this.music) return
      this.music = this.startBed(buf, cue, this.musicBus!, musicGain[cue] ?? 1, audioTiming.musicFadeSeconds)
    })
  }

  /** The beds that should be playing now. Anything not listed fades out. */
  setAmbience(cues: readonly AmbientCue[]): void {
    if (!this.ctx) {
      this.pending = { music: this.pending?.music ?? null, ambient: [...cues], worldId: this.worldId }
      return
    }
    for (const [cue, bed] of this.beds) {
      if (!cues.includes(cue as AmbientCue)) {
        this.beds.delete(cue)
        this.fadeOut(bed, audioTiming.ambientFadeSeconds)
      }
    }
    for (const cue of cues) {
      if (this.beds.has(cue)) continue
      // Claim the slot now: decoding is async and this could be called again
      // before it finishes, which would otherwise start the bed twice.
      this.beds.set(cue, null as unknown as Bed)
      void this.buffer('ambient', cue).then((buf) => {
        if (!buf || !this.ctx || this.beds.get(cue)) return
        this.beds.set(
          cue,
          this.startBed(buf, cue, this.ambientBus!, ambientGain[cue] ?? 1, audioTiming.ambientFadeSeconds),
        )
      })
    }
  }

  private startBed(buf: AudioBuffer, cue: string, bus: GainNode, target: number, fade: number): Bed {
    const ctx = this.ctx!
    const source = ctx.createBufferSource()
    source.buffer = buf
    source.loop = true
    // Skip the encoder's padding, and begin where the loop begins so the
    // first cycle sounds like every one after it.
    const { start, end } = loopPoints(buf)
    source.loopStart = start
    source.loopEnd = end
    const gain = ctx.createGain()
    gain.gain.value = 0
    gain.gain.linearRampToValueAtTime?.(target, ctx.currentTime + fade)
    source.connect(gain)
    gain.connect(bus)
    source.start(0, start)
    return { source, gain, cue }
  }

  private fadeOut(bed: Bed | null, fade = audioTiming.musicFadeSeconds): void {
    if (!bed || !this.ctx) return
    const end = this.ctx.currentTime + fade
    bed.gain.gain.cancelScheduledValues?.(this.ctx.currentTime)
    bed.gain.gain.setValueAtTime?.(bed.gain.gain.value, this.ctx.currentTime)
    bed.gain.gain.linearRampToValueAtTime?.(0, end)
    try {
      bed.source.stop(end)
    } catch {
      // Already stopped; nothing to do.
    }
  }

  /** Everything quiet, for leaving a run or backgrounding the app. */
  stopAll(): void {
    this.fadeOut(this.music)
    this.music = null
    for (const [, bed] of this.beds) this.fadeOut(bed, audioTiming.ambientFadeSeconds)
    this.beds.clear()
  }
}

/** The one the game uses. */
export const audio = new AudioEngine()
