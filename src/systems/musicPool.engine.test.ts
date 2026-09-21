import { describe, it, expect, beforeEach, vi } from 'vitest'
// Type-only, so it is erased and does not load the module before vi.mock
// has replaced the manifest underneath it.
import type { AudioContextLike } from './audioEngine'

/**
 * The engine's half of pooled music, against a manifest made here.
 *
 * Deliberately not the shipped one. `public/audio/music/dungeon/` is a
 * folder for whoever is making the game to fill, so its contents are the one
 * thing in the repo guaranteed to change — and a test that reads it fails
 * the moment someone adds or removes a track, which is not a bug in anything.
 */
vi.mock('@/config/audioManifest', () => ({
  audioManifest: { music: ['menu', 'dungeon', 'battle'], ambient: ['wind'], sfx: ['confirm'] },
  musicPools: { dungeon: ['dungeon/first', 'dungeon/second', 'dungeon/third'] },
  worldMusic: { cavern: ['dungeon/cavern-a', 'dungeon/cavern-b'] },
  audioFiles: {
    'audio/music/menu': 'menu.mp3',
    'audio/music/battle': 'battle.mp3',
    'audio/music/dungeon': 'dungeon.mp3',
    'audio/music/dungeon/first': 'dungeon/first.mp3',
    'audio/music/dungeon/second': 'dungeon/second.mp3',
    'audio/music/dungeon/third': 'dungeon/third.mp3',
    'audio/ambient/wind': 'wind.mp3',
    'audio/sfx/confirm': 'confirm.mp3',
    'worlds/cavern/music/dungeon/cavern-a': 'dungeon/cavern-a.mp3',
    'worlds/cavern/music/dungeon/cavern-b': 'dungeon/cavern-b.mp3',
  },
}))

const { AudioEngine } = await import('./audioEngine')
const { musicPool } = await import('@/config/audio')

function fakeContext(): AudioContextLike {
  const ctx = {
    currentTime: 0,
    state: 'running' as AudioContextState,
    destination: {},
    resume: () => Promise.resolve(),
    createBuffer: () => ({ duration: 0 }),
    createGain: () => ({
      gain: { value: 1, cancelScheduledValues() {}, setValueAtTime() {}, linearRampToValueAtTime() {} },
      connect() {}, disconnect() {},
    }),
    createBufferSource: () => ({
      buffer: null as unknown, loop: false, playbackRate: { value: 1 },
      loopStart: 0, loopEnd: 0, connect() {}, start() {}, stop() {},
    }),
    decodeAudioData: async () => ({
      duration: 1, sampleRate: 44100, length: 44100, numberOfChannels: 1,
      getChannelData: () => new Float32Array(44100).fill(0.4),
    }),
  }
  return ctx as unknown as AudioContextLike
}

/** Which files were asked for, in order. */
let asked: string[] = []
beforeEach(() => {
  asked = []
  const g = globalThis as { __THOTH_INLINE_ASSETS?: Record<string, string> }
  g.__THOTH_INLINE_ASSETS = new Proxy({}, {
    get: (_t, path) => {
      if (typeof path === 'string') asked.push(path)
      return 'data:audio/wav;base64,' + btoa(String(path))
    },
    has: () => true,
  })
})

const flush = () => new Promise((r) => setTimeout(r, 0))
const dungeonAsked = () => asked.filter((p) => p.startsWith('audio/music/dungeon/'))
const engineWith = (roll: () => number) => new AudioEngine(fakeContext, roll)

describe('which track a pooled slot resolves to', () => {
  it('offers the folder as the pool, and nothing for a slot without one', () => {
    expect(musicPool('dungeon')).toEqual(['dungeon/first', 'dungeon/second', 'dungeon/third'])
    expect(musicPool('battle')).toEqual([])
  })

  it("prefers a world's own set over the global folder", () => {
    // The world is the theme. A global track playing over it would undo the
    // reason for shipping one.
    expect(musicPool('dungeon', 'cavern')).toEqual(['dungeon/cavern-a', 'dungeon/cavern-b'])
    // A world with nothing of its own still gets the global set.
    expect(musicPool('dungeon', 'elsewhere')).toEqual(['dungeon/first', 'dungeon/second', 'dungeon/third'])
  })
})

describe('a music slot with a folder of alternates', () => {
  it('plays one of the alternates rather than the single file', async () => {
    const engine = engineWith(() => 0)
    engine.unlock()
    engine.setMusic('dungeon')
    await flush()
    expect(dungeonAsked()[0]).toBe('audio/music/dungeon/first.mp3')
    expect(asked).not.toContain('audio/music/dungeon.mp3')
  })

  it('keeps the same track for the whole run', async () => {
    // Coming back out of a battle asks for 'dungeon' again. Re-rolling there
    // would change the music several times a run, which is the thing this
    // whole arrangement exists to prevent.
    let n = 0
    const engine = engineWith(() => [0, 0.5, 0.9][n++ % 3])
    engine.unlock()
    engine.setMusic('dungeon')
    await flush()
    engine.setMusic('battle')
    await flush()
    engine.setMusic('dungeon')
    await flush()
    expect(new Set(dungeonAsked()).size).toBe(1)
  })

  it('picks again for the next run, and never the one just played', async () => {
    const engine = engineWith(() => 0)
    engine.unlock()
    engine.setMusic('dungeon')
    await flush()
    const first = dungeonAsked()[0]

    engine.newRun()
    engine.setMusic('menu')
    await flush()
    engine.setMusic('dungeon')
    await flush()
    const second = dungeonAsked().at(-1)
    expect(second).not.toBe(first)
  })

  it('leaves a slot with no folder on its single file', async () => {
    const engine = engineWith(() => 0.5)
    engine.unlock()
    engine.setMusic('battle')
    await flush()
    expect(asked).toContain('audio/music/battle.mp3')
  })

  it('re-picks from the world set when the run is in a world that has one', async () => {
    const engine = engineWith(() => 0)
    engine.unlock()
    engine.setWorld('cavern')
    engine.setMusic('dungeon')
    await flush()
    expect(asked.filter((f) => f.includes('/dungeon/')).at(-1)).toBe(
      'worlds/cavern/music/dungeon/cavern-a.mp3',
    )
  })
})
