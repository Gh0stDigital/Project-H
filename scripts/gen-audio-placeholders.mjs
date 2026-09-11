// Writes a stand-in tone for any cue that has no file yet.
//
// Why bother: an audio pipeline that has never made a sound is impossible to
// debug. With a tone behind every cue the whole chain — unlock, decode,
// buses, overlap, crossfade, the volume sliders, playback from file:// — can
// be heard and verified before a single real file exists, and when the real
// audio arrives a fault is the file rather than the plumbing.
//
// These are deliberately plain: a shaped tone, not an attempt at sound
// design. They are WAV because that needs no encoder, and small (16 kHz mono)
// because they are temporary. Real audio should arrive compressed — see the
// README — and dropping it in replaces the tone permanently, since this never
// overwrites a file that already exists.
//
// Runs via `npm install`'s postinstall hook, or `npm run gen:assets`.

import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { artPath, AUDIO_EXTENSIONS } from './artFiles.mjs'
import { AUDIO_FOLDERS, SLOTS_BY_FOLDER } from './audioSlots.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUT_ROOT = join(__dirname, '..', 'public', 'audio')
const RATE = 16000

// --- WAV ------------------------------------------------------------------

/** 16-bit mono PCM, which is the one audio container worth hand-rolling. */
function wav(samples) {
  const data = Buffer.alloc(samples.length * 2)
  for (let i = 0; i < samples.length; i++) {
    const clamped = Math.max(-1, Math.min(1, samples[i]))
    data.writeInt16LE(Math.round(clamped * 32767), i * 2)
  }
  const header = Buffer.alloc(44)
  header.write('RIFF', 0)
  header.writeUInt32LE(36 + data.length, 4)
  header.write('WAVE', 8)
  header.write('fmt ', 12)
  header.writeUInt32LE(16, 16)
  header.writeUInt16LE(1, 20) // PCM
  header.writeUInt16LE(1, 22) // mono
  header.writeUInt32LE(RATE, 24)
  header.writeUInt32LE(RATE * 2, 28)
  header.writeUInt16LE(2, 32)
  header.writeUInt16LE(16, 34)
  header.write('data', 36)
  header.writeUInt32LE(data.length, 40)
  return Buffer.concat([header, data])
}

// --- A very small synth ---------------------------------------------------

const TAU = Math.PI * 2
let seed = 1
/** Deterministic noise, so a rebuild does not churn every file. */
const rand = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff) * 2 - 1

const shapes = {
  sine: (p) => Math.sin(TAU * p),
  square: (p) => (p % 1 < 0.5 ? 1 : -1),
  saw: (p) => 2 * (p % 1) - 1,
  tri: (p) => 4 * Math.abs((p % 1) - 0.5) - 1,
  noise: () => rand(),
}

/**
 * One shaped tone. `from`/`to` sweep the pitch, `curve` shapes the decay, and
 * `wobble` adds vibrato — between them that is enough character to tell the
 * cues apart by ear, which is all these need to do.
 */
function tone({ from, to = from, seconds, shape = 'sine', curve = 3, gain = 0.5, wobble = 0, attack = 0.005 }) {
  const n = Math.floor(RATE * seconds)
  const out = new Float32Array(n)
  let phase = 0
  for (let i = 0; i < n; i++) {
    const t = i / n
    const freq = from + (to - from) * t + (wobble ? Math.sin(TAU * 6 * (i / RATE)) * wobble : 0)
    phase += freq / RATE
    const rise = Math.min(1, i / RATE / attack)
    out[i] = shapes[shape](phase) * Math.pow(1 - t, curve) * rise * gain
  }
  return out
}

const mix = (...layers) => {
  const n = Math.max(...layers.map((l) => l.length))
  const out = new Float32Array(n)
  for (const l of layers) for (let i = 0; i < l.length; i++) out[i] += l[i]
  return out
}

const after = (seconds, samples) => {
  const pad = new Float32Array(Math.floor(RATE * seconds))
  const out = new Float32Array(pad.length + samples.length)
  out.set(samples, pad.length)
  return out
}

/** Loops need to end where they began, so fade both edges into each other. */
function seamless(samples, fade = 0.25) {
  const f = Math.floor(RATE * fade)
  const out = Float32Array.from(samples)
  for (let i = 0; i < f; i++) {
    const k = i / f
    out[i] *= k
    out[out.length - 1 - i] *= k
  }
  return out
}

/** A slow chord bed: enough to tell one theme from another, and nothing more. */
function bed({ notes, seconds, shape = 'tri', gain = 0.12 }) {
  const n = Math.floor(RATE * seconds)
  const out = new Float32Array(n)
  notes.forEach((freq, voice) => {
    let phase = 0
    for (let i = 0; i < n; i++) {
      const swell = 0.6 + 0.4 * Math.sin(TAU * (i / RATE) * (0.12 + voice * 0.03))
      phase += freq / RATE
      out[i] += shapes[shape](phase) * swell * gain
    }
  })
  return seamless(out)
}

/** Scales a buffer to a known peak. The low pass below costs most of the
    signal's amplitude, by a factor that depends on its cutoff — without this
    a gentler filter simply comes out inaudible. */
function normalise(samples, peak) {
  let max = 0
  for (const v of samples) max = Math.max(max, Math.abs(v))
  if (max === 0) return samples
  const k = peak / max
  const out = new Float32Array(samples.length)
  for (let i = 0; i < samples.length; i++) out[i] = samples[i] * k
  return out
}

function hiss({ seconds, gain = 0.05, cutoff = 0.02, pulse = 0 }) {
  const n = Math.floor(RATE * seconds)
  const out = new Float32Array(n)
  let last = 0
  for (let i = 0; i < n; i++) {
    last += (rand() - last) * cutoff // one-pole low pass: wind, not static
    const swell = pulse ? 0.5 + 0.5 * Math.sin(TAU * (i / RATE) * pulse) : 1
    out[i] = last * swell
  }
  return seamless(normalise(out, gain))
}

// --- The cues -------------------------------------------------------------

const music = {
  menu: () => bed({ notes: [196, 262, 330], seconds: 8 }),
  dungeon: () => bed({ notes: [147, 196, 233], seconds: 8, shape: 'sine' }),
  battle: () => bed({ notes: [165, 247, 330], seconds: 6, shape: 'saw', gain: 0.09 }),
  boss: () => bed({ notes: [110, 146, 208], seconds: 6, shape: 'saw', gain: 0.1 }),
  rest: () => bed({ notes: [220, 277, 330], seconds: 8, gain: 0.1 }),
  results: () => bed({ notes: [262, 330, 392], seconds: 6 }),
}

const ambient = {
  wind: () => hiss({ seconds: 6, gain: 0.3, cutoff: 0.008, pulse: 0.17 }),
  drip: () =>
    seamless(
      mix(
        ...[0.4, 1.9, 3.3, 4.8].map((at) =>
          after(at, tone({ from: 900, to: 480, seconds: 0.16, curve: 6, gain: 0.25 })),
        ),
        new Float32Array(Math.floor(RATE * 6)),
      ),
    ),
  night: () => mix(hiss({ seconds: 6, gain: 0.16, cutoff: 0.05 }), bed({ notes: [98, 147], seconds: 6, gain: 0.05 })),
}

const sfx = {
  damage: () => mix(tone({ from: 220, to: 60, seconds: 0.22, shape: 'square', curve: 4 }), tone({ from: 0, seconds: 0.12, shape: 'noise', gain: 0.35 })),
  playerAttack: () => tone({ from: 640, to: 240, seconds: 0.18, shape: 'saw', curve: 3 }),
  enemyAttack: () => tone({ from: 300, to: 110, seconds: 0.24, shape: 'square', curve: 3 }),
  battleStart: () => mix(tone({ from: 300, to: 600, seconds: 0.45, shape: 'saw', curve: 1.4 }), after(0.2, tone({ from: 600, seconds: 0.3, curve: 2 }))),
  enemyAppear: () => tone({ from: 140, to: 420, seconds: 0.4, shape: 'tri', curve: 1.6, wobble: 12 }),
  victory: () => mix(...[523, 659, 784, 1047].map((f, i) => after(i * 0.11, tone({ from: f, seconds: 0.4, curve: 2.2 })))),
  defeat: () => mix(...[392, 330, 262, 196].map((f, i) => after(i * 0.14, tone({ from: f, seconds: 0.5, shape: 'tri', curve: 2 })))),
  correct: () => mix(tone({ from: 784, seconds: 0.14, curve: 3 }), after(0.09, tone({ from: 1175, seconds: 0.22, curve: 3 }))),
  wrong: () => tone({ from: 200, to: 150, seconds: 0.3, shape: 'square', curve: 2.5, gain: 0.4 }),
  trapTrigger: () => mix(tone({ from: 0, seconds: 0.3, shape: 'noise', gain: 0.4 }), tone({ from: 500, to: 80, seconds: 0.3, shape: 'saw' })),
  chestOpen: () => mix(tone({ from: 300, to: 900, seconds: 0.3, shape: 'tri', curve: 2 }), after(0.18, tone({ from: 1200, seconds: 0.3, curve: 3 }))),
  discovery: () => mix(...[659, 880, 1319].map((f, i) => after(i * 0.1, tone({ from: f, seconds: 0.45, curve: 2.4 })))),
  shrine: () => mix(tone({ from: 880, seconds: 1.1, curve: 1.2, gain: 0.3, wobble: 4 }), tone({ from: 1320, seconds: 1.1, curve: 1.6, gain: 0.18 })),
  bossDoor: () => mix(tone({ from: 90, to: 55, seconds: 0.9, shape: 'saw', curve: 1.4, gain: 0.45 }), tone({ from: 0, seconds: 0.5, shape: 'noise', gain: 0.2 })),
  reward: () => mix(...[1047, 1319].map((f, i) => after(i * 0.07, tone({ from: f, seconds: 0.25, curve: 3.2 })))),
  npcTalk: () => mix(...[0, 1, 2].map((i) => after(i * 0.07, tone({ from: 420 + i * 40, seconds: 0.08, shape: 'square', curve: 2, gain: 0.25 })))),
  move: () => tone({ from: 0, seconds: 0.18, shape: 'noise', gain: 0.18, curve: 2 }),
  diceRoll: () => mix(...[0, 0.08, 0.15, 0.21].map((at) => after(at, tone({ from: 0, seconds: 0.05, shape: 'noise', gain: 0.3, curve: 1.5 })))),
  confirm: () => tone({ from: 523, to: 784, seconds: 0.16, curve: 3 }),
  cancel: () => tone({ from: 440, to: 294, seconds: 0.16, shape: 'tri', curve: 3 }),
  itemUse: () => mix(tone({ from: 600, to: 1000, seconds: 0.22, shape: 'tri', curve: 2.4 }), after(0.1, tone({ from: 1400, seconds: 0.2, curve: 3 }))),
  levelUp: () => mix(...[523, 659, 784, 1047, 1319].map((f, i) => after(i * 0.09, tone({ from: f, seconds: 0.5, curve: 2 })))),
}

const synths = { music, ambient, sfx }

let generated = 0
let skipped = 0

for (const folder of AUDIO_FOLDERS) {
  const dir = join(OUT_ROOT, folder)
  mkdirSync(dir, { recursive: true })
  for (const slot of SLOTS_BY_FOLDER[folder]) {
    // Never clobber real audio someone has dropped in, in any format.
    if (artPath(dir, slot, AUDIO_EXTENSIONS)) { skipped++; continue }
    const make = synths[folder][slot]
    if (!make) continue
    writeFileSync(join(dir, `${slot}.wav`), wav(make()))
    generated++
  }
}

console.log(
  `gen-audio-placeholders: ${generated} stand-in tone(s) written under public/audio` +
    (skipped ? ` (${skipped} already present — left untouched)` : ''),
)
