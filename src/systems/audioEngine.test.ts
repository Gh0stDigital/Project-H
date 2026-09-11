import { describe, it, expect, beforeEach } from 'vitest'
import { AudioEngine, type AudioContextLike } from './audioEngine'

/**
 * A stand-in for AudioContext. Web Audio cannot run under the test runner, and
 * the things worth testing here are not the sound — they are the rules that
 * keep a missing or slow file from breaking the game.
 */
function fakeContext() {
  const started: { buffer: unknown; loop: boolean; rate: number }[] = []
  const ctx = {
    currentTime: 0,
    state: 'running' as AudioContextState,
    destination: { name: 'destination' },
    resume: () => Promise.resolve(),
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
        start() { started.push({ buffer: node.buffer, loop: node.loop, rate: node.playbackRate.value }) },
        stop() {},
      }
      return node
    },
    decodeAudioData: async () => ({ duration: 1 }),
  }
  // The double implements what the engine touches, not all of GainNode and
  // friends, so it is asserted into place once here rather than at every use.
  /** Moves the context clock on, for the rules that depend on elapsed time. */
  const tick = (seconds: number) => { ctx.currentTime += seconds }
  return { ctx: ctx as unknown as AudioContextLike, started, tick }
}

// Decoding reads from the inlined map, so the test needs no network and no
// files — the same path the offline build takes.
function inlineEverything() {
  const g = globalThis as { __THOTH_INLINE_ASSETS?: Record<string, string> }
  g.__THOTH_INLINE_ASSETS = new Proxy({}, { get: () => 'data:audio/wav;base64,AAAA', has: () => true })
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
