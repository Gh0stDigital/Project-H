import { describe, it, expect, beforeEach } from 'vitest'
import { AudioEngine, loopPoints, type AudioContextLike } from './audioEngine'

/**
 * A stand-in for AudioContext. Web Audio cannot run under the test runner, and
 * the things worth testing here are not the sound — they are the rules that
 * keep a missing or slow file from breaking the game.
 */
function fakeContext() {
  const started: { buffer: unknown; loop: boolean; rate: number; loopStart: number; loopEnd: number }[] = []
  const stopped: number[] = []
  const ctx = {
    currentTime: 0,
    state: 'running' as AudioContextState,
    destination: { name: 'destination' },
    resume: () => { ctx.state = 'running'; return Promise.resolve() },
    createBuffer: () => ({ duration: 0 }),
    createGain: () => ({
      gain: {
        value: 1,
        cancelScheduledValues() {},
        setValueAtTime() {},
        linearRampToValueAtTime(v: number) { this.value = v },
      },
      connect() {},
      disconnect() {},
    }),
    createBufferSource: () => {
      const node = {
        buffer: null as unknown,
        loop: false,
        playbackRate: { value: 1 },
        connect() {},
        loopStart: 0,
        loopEnd: 0,
        start() { started.push({ buffer: node.buffer, loop: node.loop, rate: node.playbackRate.value, loopStart: node.loopStart, loopEnd: node.loopEnd }) },
        stop() { stopped.push(started.length) },
      }
      return node
    },
    // A decoded buffer the engine can actually inspect: the loop trimming
    // reads its samples, so a double without them tests nothing.
    decodeAudioData: async () => ({
      duration: 1,
      sampleRate: 44100,
      length: 44100,
      numberOfChannels: 1,
      getChannelData: () => new Float32Array(44100).fill(0.4),
    }),
  }
  // The double implements what the engine touches, not all of GainNode and
  // friends, so it is asserted into place once here rather than at every use.
  /** Moves the context clock on, for the rules that depend on elapsed time. */
  const tick = (seconds: number) => { ctx.currentTime += seconds }
  /** What the OS does when the app goes to the home screen. */
  const suspend = () => { ctx.state = 'suspended' }
  return { ctx: ctx as unknown as AudioContextLike, started, stopped, tick, suspend }
}

// Decoding reads from the inlined map, so the test needs no network and no
// files — the same path the offline build takes.
function inlineEverything() {
  const g = globalThis as { __THOTH_INLINE_ASSETS?: Record<string, string> }
  // The bytes of each cue are its own path, so a double decoder can tell
  // which cue it has been handed — which is how the ordering test below
  // holds one decode open without holding them all.
  g.__THOTH_INLINE_ASSETS = new Proxy({}, {
    get: (_t, path) => 'data:audio/wav;base64,' + btoa(String(path)),
    has: () => true,
  })
}

const flush = () => new Promise((r) => setTimeout(r, 0))

describe('audio engine', () => {
  beforeEach(inlineEverything)

  it('is silent, not broken, before anything has unlocked it', () => {
    const engine = new AudioEngine((): AudioContextLike => { throw new Error('no context before a gesture') })
    expect(() => engine.play('confirm')).not.toThrow()
    expect(() => engine.setMusic('menu')).not.toThrow()
    expect(engine.unlocked).toBe(false)
  })

  // ---- Getting the sound back -------------------------------------------
  //
  // Two suspends, two different right answers. Never having had a gesture
  // means the bed may never have made a sound and has to be started again;
  // coming back from the home screen means it was playing and should carry
  // on from where it was. Both used to end in silence.

  it('starts a bed that was set up before there was ever a gesture', async () => {
    const { ctx, started, suspend } = fakeContext()
    suspend() // No gesture yet: the context has never run.
    const engine = new AudioEngine(() => ctx)
    await engine.warm('menu', [])
    engine.setMusic('menu')
    await flush()
    const cold = started.length
    expect(cold).toBeGreaterThan(0) // A source was issued, on a dead context.

    engine.unlock() // The player taps.
    await flush()
    await flush()
    // Started again on the now-running context, rather than trusting a source
    // that was issued while it was suspended. Chromium honours those; Safari
    // does not, and the result there was a game that opened in silence.
    expect(started.length).toBeGreaterThan(cold + 1) // +blip +restart
  })

  it('does nothing on a resume before the first gesture', async () => {
    // Focus and visibility events call resume() too, and neither is a
    // gesture. Starting the music because a window was focused is both
    // against the autoplay rules and wrong for an untapped title screen.
    const { ctx, started, suspend } = fakeContext()
    suspend()
    const engine = new AudioEngine(() => ctx)
    await engine.warm('menu', [])
    engine.setMusic('menu')
    await flush()
    const before = started.length

    await engine.resume()
    await flush()
    expect(started.length).toBe(before)
    expect(engine.unlocked).toBe(false)
  })

  it('leaves a bed that was already playing alone when the app comes back', async () => {
    const { ctx, started, suspend } = fakeContext()
    const engine = new AudioEngine(() => ctx)
    engine.unlock() // Running before the music starts: the bed is warm.
    await flush()
    await engine.warm('menu', [])
    engine.setMusic('menu')
    await flush()
    const playing = started.length

    suspend() // The phone goes to the home screen.
    await engine.resume()
    await flush()
    // Nothing restarted: the track picks up where the interruption left it,
    // instead of jumping back to the top every time the player takes a call.
    expect(started.length).toBe(playing)
  })

  it('is running again after a resume', async () => {
    const { ctx, suspend } = fakeContext()
    const engine = new AudioEngine(() => ctx)
    engine.unlock()
    await flush()
    suspend()
    expect(engine.unlocked).toBe(false)
    await engine.resume()
    expect(engine.unlocked).toBe(true)
  })

  it('survives a resume on a browser with no audio at all', async () => {
    const engine = new AudioEngine((): AudioContextLike => { throw new Error('unsupported') })
    engine.unlock()
    await expect(engine.resume()).resolves.toBeUndefined()
  })

  it('decodes effects without waiting for the music to finish', async () => {
    // The menu theme is minutes long and the effects are fractions of a
    // second. Awaiting the track first held every effect behind it: measured
    // from a cold load, nothing was decoded for 2.3s and then all 26 arrived
    // at once, so a player who tapped inside that window heard silence.
    const { ctx, started } = fakeContext()
    let releaseMusic = () => {}
    const musicHeld = new Promise<void>((r) => { releaseMusic = r })
    const base = ctx as unknown as { decodeAudioData: (b: ArrayBuffer) => Promise<unknown> }
    const slow = {
      ...(ctx as unknown as Record<string, unknown>),
      // Only the music decode is held open. If warm() waits on it, the
      // effect never decodes and the tap below is silent.
      decodeAudioData: async (bytes: ArrayBuffer) => {
        if (new TextDecoder().decode(bytes).includes('/music/')) await musicHeld
        return base.decodeAudioData(bytes)
      },
    } as unknown as AudioContextLike

    const engine = new AudioEngine(() => slow)
    const warming = engine.warm('menu', ['confirm'])
    await flush()

    engine.unlock()
    engine.play('confirm')
    // One blip from unlock() and one effect: the effect was ready while the
    // music was still decoding. Serialised, this is the blip alone.
    expect(started.length).toBe(2)

    releaseMusic()
    await warming
  })

  it('survives a browser with no Web Audio at all', () => {
    const engine = new AudioEngine((): AudioContextLike => { throw new Error('unsupported') })
    expect(() => engine.unlock()).not.toThrow()
    expect(() => engine.play('damage')).not.toThrow()
    expect(engine.unlocked).toBe(false)
  })

  it('stays silent for a cue whose buffer has not decoded yet', () => {
    const { ctx, started } = fakeContext()
    const engine = new AudioEngine(() => ctx)
    engine.unlock()
    engine.play('damage')
    // The blip from unlock(), and nothing else: the cue was not ready.
    expect(started).toHaveLength(1)
  })

  it('plays once the buffer is in, and overlaps happily', async () => {
    const { ctx, started, tick } = fakeContext()
    const engine = new AudioEngine(() => ctx, () => 0.5)
    engine.unlock()
    await engine.preload(['damage'])
    engine.play('damage')
    tick(1)
    engine.play('damage')
    expect(started).toHaveLength(3) // unlock blip + two hits
  })

  it('refuses to restack the same cue inside its minimum interval', async () => {
    const { ctx, started } = fakeContext()
    const engine = new AudioEngine(() => ctx, () => 0.5)
    engine.unlock()
    await engine.preload(['damage'])
    const before = started.length
    for (let i = 0; i < 8; i++) engine.play('damage') // same instant
    expect(started.length - before).toBe(1)
  })

  it('spreads the pitch of repeats so they do not machine-gun', async () => {
    const { ctx, started } = fakeContext()
    const engine = new AudioEngine(() => ctx, () => 1)
    engine.unlock()
    await engine.preload(['damage'])
    engine.play('damage')
    expect(started.at(-1)!.rate).toBeGreaterThan(1)
  })

  it('leaves punctuation cues at their written pitch', async () => {
    const { ctx, started } = fakeContext()
    const engine = new AudioEngine(() => ctx, () => 1)
    engine.unlock()
    await engine.preload(['victory'])
    engine.play('victory')
    expect(started.at(-1)!.rate).toBe(1)
  })

  it('remembers music asked for before the gesture and starts it after', async () => {
    const { ctx, started } = fakeContext()
    const engine = new AudioEngine(() => ctx)
    engine.setMusic('menu')      // no context yet
    expect(started).toHaveLength(0)
    engine.unlock()
    await flush()
    expect(started.some((s) => s.loop)).toBe(true)
  })

  it('loops beds and does not loop one-shots', async () => {
    const { ctx, started } = fakeContext()
    const engine = new AudioEngine(() => ctx)
    engine.unlock()
    engine.setAmbience(['wind'])
    await flush()
    await engine.preload(['confirm'])
    engine.play('confirm')
    expect(started.filter((s) => s.loop)).toHaveLength(1)
    expect(started.at(-1)!.loop).toBe(false)
  })

  it('starts one bed per cue even when asked twice while decoding', async () => {
    const { ctx, started } = fakeContext()
    const engine = new AudioEngine(() => ctx)
    engine.unlock()
    engine.setAmbience(['wind'])
    engine.setAmbience(['wind'])
    await flush()
    expect(started.filter((s) => s.loop)).toHaveLength(1)
  })

  it('gives a bed real loop points rather than looping the raw buffer', async () => {
    const { ctx, started } = fakeContext()
    const engine = new AudioEngine(() => ctx)
    engine.unlock()
    engine.setAmbience(['wind'])
    await flush()
    const bed = started.find((s) => s.loop)!
    expect(bed.loopEnd).toBeGreaterThan(0)
    expect(bed.loopEnd).toBeLessThanOrEqual(1)
  })

  it('makes no sound at all when muted', async () => {
    const { ctx, started } = fakeContext()
    const engine = new AudioEngine(() => ctx)
    engine.unlock()
    await engine.preload(['confirm'])
    engine.setVolumes({ music: 1, sfx: 1, muted: true })
    const before = started.length
    engine.play('confirm')
    expect(started.length).toBe(before)
  })
})

describe('loop points', () => {
  const make = (samples: number[], rate = 44100): AudioBuffer =>
    ({ getChannelData: () => Float32Array.from(samples), sampleRate: rate, duration: samples.length / rate }) as unknown as AudioBuffer

  it('skips the silence an mp3 encoder adds at each end', () => {
    const pad = new Array(200).fill(0) // ~4.5ms, the shape of encoder delay
    const body = new Array(1000).fill(0.5)
    const { start, end } = loopPoints(make([...pad, ...body, ...pad]))
    expect(start).toBeCloseTo(200 / 44100, 5)
    expect(end).toBeCloseTo(1200 / 44100, 5)
  })

  it('loops the whole buffer when there is nothing to trim', () => {
    const { start, end } = loopPoints(make(new Array(500).fill(0.4)))
    expect(start).toBe(0)
    expect(end).toBeCloseTo(500 / 44100, 5)
  })

  it('refuses to eat a fade-in', () => {
    // Half a second of near-silence is the recording, not the encoder — the
    // menu theme fades in, and an earlier cap cut a quarter-second off it.
    const quiet = new Array(22050).fill(0)
    const { start } = loopPoints(make([...quiet, ...new Array(1000).fill(0.5)]))
    expect(start).toBeLessThanOrEqual(0.05)
  })

  it('does not divide by zero on a silent buffer', () => {
    const { start, end } = loopPoints(make(new Array(1000).fill(0)))
    expect(start).toBe(0)
    expect(end).toBeGreaterThan(0)
  })
})
