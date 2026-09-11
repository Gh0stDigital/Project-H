// Re-encodes the sound under public/audio so the offline build stays openable.
//
// Two jobs, and both are about the phone.
//
// Format. WebKit only learned to decode Ogg Vorbis in Safari 17.4, and every
// browser on iOS is WebKit — so an .ogg is silence on an older iPhone, with
// nothing in the console to say why. mp3 decodes everywhere there is Web
// Audio at all, which makes it the only format worth shipping here.
//
// Size. The single-file build inlines every sound as base64, so a minute of
// 256 kb/s stereo music costs about 2.5 MB of the file a phone has to parse
// before it can draw anything. Music arrived at 256-287 kb/s stereo, which is
// a bitrate for headphones and an album, not for a loop under a game on a
// phone speaker.
//
//   npm run optimize:audio                 re-encode anything above target
//   npm run optimize:audio -- --dry-run    report, write nothing
//   npm run optimize:audio -- --music 128  a different music bitrate
//
// Safe to run twice: a file already at or under its target is left alone.

import { execFileSync } from 'node:child_process'
import { readdirSync, renameSync, statSync, unlinkSync, existsSync, mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, extname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import ffmpeg from 'ffmpeg-static'

const __dirname = dirname(fileURLToPath(import.meta.url))
const AUDIO = join(__dirname, '..', 'public', 'audio')

const args = process.argv.slice(2)
const dryRun = args.includes('--dry-run')
const flag = (name, fallback) => {
  const i = args.indexOf(`--${name}`)
  return i >= 0 && args[i + 1] ? Number(args[i + 1]) : fallback
}

/**
 * Per folder: bitrate, channels, and sample rate.
 *
 * Music and ambience are beds — they sit under everything and are the whole
 * size problem, so they go to mono. Effects stay short enough not to matter
 * and keep more headroom, since a sting is the thing you actually hear.
 */
const TARGETS = {
  music: { kbps: flag('music', 112), mono: true, rate: 44100 },
  // Lower than it looks: these arrive as 64 kb/s stereo Vorbis, which is
  // more efficient than mp3 at that end, so matching its bitrate would make
  // the files bigger. 80 mono is about the same sound for about the same size.
  ambient: { kbps: flag('ambient', 80), mono: true, rate: 44100 },
  sfx: { kbps: flag('sfx', 128), mono: false, rate: 44100 },
}

const SOURCE = /\.(wav|ogg|m4a|webm|mp3|flac)$/i

function probe(file) {
  const out = execFileSync(ffmpeg, ['-hide_banner', '-i', file], { encoding: 'utf8', stdio: ['ignore', 'ignore', 'pipe'] })
  return out
}

function describe(file) {
  let info = ''
  try { info = probe(file) } catch (err) { info = String(err.stderr ?? '') }
  const bitrate = Number(/Audio:.*?, (\d+) kb\/s/.exec(info)?.[1] ?? 0)
  const seconds = (() => {
    const m = /Duration: (\d+):(\d+):([\d.]+)/.exec(info)
    return m ? Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3]) : 0
  })()
  const channels = /Audio:.*?, (mono|stereo)/.exec(info)?.[1] ?? 'stereo'
  return { bitrate, seconds, channels }
}

let converted = 0
let kept = 0
let before = 0
let after = 0
const notes = []

for (const folder of Object.keys(TARGETS)) {
  const dir = join(AUDIO, folder)
  if (!existsSync(dir)) continue
  const target = TARGETS[folder]

  for (const name of readdirSync(dir).sort()) {
    if (!SOURCE.test(name)) continue
    const file = join(dir, name)
    const size = statSync(file).size
    before += size

    const { bitrate, channels } = describe(file)
    const isMp3 = extname(name).toLowerCase() === '.mp3'
    const smallEnough = bitrate > 0 && bitrate <= target.kbps + 8
    const rightChannels = !target.mono || channels === 'mono'

    // Already an mp3 at or under target, in the right shape: leave it be.
    // Re-encoding lossy to lossy costs quality for nothing.
    if (isMp3 && smallEnough && rightChannels) {
      after += size
      kept++
      continue
    }

    const out = join(mkdtempSync(join(tmpdir(), 'thoth-audio-')), 'out.mp3')
    execFileSync(ffmpeg, [
      '-hide_banner', '-loglevel', 'error', '-y',
      '-i', file,
      '-map', '0:a:0',
      '-c:a', 'libmp3lame',
      '-b:a', `${target.kbps}k`,
      '-ar', String(target.rate),
      ...(target.mono ? ['-ac', '1'] : []),
      // No cover art or tags: this is a game asset, and every byte of it ends
      // up base64-encoded inside an HTML file.
      '-map_metadata', '-1',
      out,
    ])

    const newSize = statSync(out).size
    const final = join(dir, name.replace(/\.[^.]+$/, '.mp3'))
    notes.push(
      `  ${folder}/${name} ${bitrate ? `${bitrate}kb/s ${channels}` : ''} ` +
        `${(size / 1024).toFixed(0)}KB -> ${(newSize / 1024).toFixed(0)}KB` +
        (extname(name).toLowerCase() !== '.mp3' ? `  (${extname(name)} -> .mp3)` : ''),
    )
    after += newSize
    converted++
    if (dryRun) { unlinkSync(out); continue }
    if (final !== file) unlinkSync(file)
    renameSync(out, final)
  }
}

const mb = (n) => (n / 1048576).toFixed(1)
for (const n of notes) console.log(n)
console.log(
  `optimize-audio: ${converted} re-encoded, ${kept} already fine — ` +
    `${mb(before)} MB -> ${mb(after)} MB` +
    (before > 0 ? ` (${Math.round((100 * after) / before)}%)` : '') +
    (dryRun ? ' [dry run, nothing written]' : ''),
)
