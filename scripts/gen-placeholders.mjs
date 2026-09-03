// Fills in neutral placeholder PNG art for any asset slot the game
// references (src/config/assets.ts) that doesn't have a file yet. No
// external dependencies — encodes raw PNGs by hand (IHDR/IDAT/IEND) using
// Node's built-in zlib deflate.
//
// Only ever creates files that are missing — it never overwrites an
// existing public/assets/** file, so replacing a placeholder with real
// artwork is permanent: just commit the real PNG over the placeholder
// and this script (which reruns on every `npm install`) will leave it
// alone from then on.

import { deflateSync } from 'node:zlib'
import { writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUT_ROOT = join(__dirname, '..', 'public', 'assets')
const SIZE = 256

function crc32(buf) {
  let c
  const table = crc32.table || (crc32.table = (() => {
    const t = new Uint32Array(256)
    for (let n = 0; n < 256; n++) {
      c = n
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
      t[n] = c >>> 0
    }
    return t
  })())
  let crc = 0xffffffff
  for (let i = 0; i < buf.length; i++) crc = table[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8)
  return (crc ^ 0xffffffff) >>> 0
}

function chunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length, 0)
  const typeBuf = Buffer.from(type, 'ascii')
  const crcBuf = Buffer.alloc(4)
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0)
  return Buffer.concat([len, typeBuf, data, crcBuf])
}

/** pixelFn(x, y) -> [r,g,b,a] (0-255) */
function encodePNG(width, height, pixelFn) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])
  const ihdrData = Buffer.alloc(13)
  ihdrData.writeUInt32BE(width, 0)
  ihdrData.writeUInt32BE(height, 4)
  ihdrData[8] = 8 // bit depth
  ihdrData[9] = 6 // color type RGBA
  ihdrData[10] = 0
  ihdrData[11] = 0
  ihdrData[12] = 0
  const ihdr = chunk('IHDR', ihdrData)

  const raw = Buffer.alloc((width * 4 + 1) * height)
  let offset = 0
  for (let y = 0; y < height; y++) {
    raw[offset++] = 0 // no filter
    for (let x = 0; x < width; x++) {
      const [r, g, b, a] = pixelFn(x, y)
      raw[offset++] = r
      raw[offset++] = g
      raw[offset++] = b
      raw[offset++] = a
    }
  }
  const idat = chunk('IDAT', deflateSync(raw, { level: 9 }))
  const iend = chunk('IEND', Buffer.alloc(0))
  return Buffer.concat([sig, ihdr, idat, iend])
}

// ---- drawing helpers -------------------------------------------------

function hexToRgb(hex) {
  const n = parseInt(hex.replace('#', ''), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

function mix(a, b, t) {
  return a.map((v, i) => Math.round(v + (b[i] - v) * t))
}

/**
 * Renders a soft vignette background with a centered geometric glyph so
 * every placeholder is instantly distinguishable by category/variant even
 * without text.
 */
function drawPlaceholder({ bg, accent, shape }) {
  const bgRgb = hexToRgb(bg)
  const accentRgb = hexToRgb(accent)
  const cx = SIZE / 2
  const cy = SIZE / 2
  const r = SIZE * 0.32

  return encodePNG(SIZE, SIZE, (x, y) => {
    const dx = x - cx
    const dy = y - cy
    const dist = Math.sqrt(dx * dx + dy * dy)
    // vignette: darker toward edges
    const vignette = Math.min(1, dist / (SIZE * 0.75))
    const base = mix(bgRgb, [0, 0, 0], vignette * 0.35)

    let inShape = false
    switch (shape) {
      case 'circle':
        inShape = dist < r
        break
      case 'square': {
        inShape = Math.abs(dx) < r * 0.85 && Math.abs(dy) < r * 0.85
        break
      }
      case 'diamond':
        inShape = Math.abs(dx) + Math.abs(dy) < r * 1.1
        break
      case 'triangle': {
        const h = r * 1.3
        const ny = dy + r * 0.6
        inShape = ny > -h * 0.15 && ny < h && Math.abs(dx) < (h - ny) * 0.6 + 2
        break
      }
      case 'chest': {
        const w = r * 1.25
        const h = r * 0.95
        const body = Math.abs(dx) < w && dy > -h * 0.1 && dy < h
        const lid = Math.abs(dx) < w && dy > -h * 0.75 && dy < -h * 0.1
        const band = Math.abs(dx) < r * 0.14
        inShape = (body || lid) && !(band && dy > -h * 0.75 && dy < h * 0.2 && Math.abs(dx) > r * 0.02)
        break
      }
      case 'card': {
        const w = r * 0.95
        const h = r * 1.35
        inShape = Math.abs(dx) < w && Math.abs(dy) < h
        break
      }
      case 'skull': {
        const headR = r * 0.85
        const inHead = dist < headR && dy < headR * 0.35
        const jaw = Math.abs(dx) < headR * 0.6 && dy >= headR * 0.15 && dy < headR * 0.75
        const eyeL = Math.hypot(dx + headR * 0.35, dy - headR * 0.05) < headR * 0.22
        const eyeR = Math.hypot(dx - headR * 0.35, dy - headR * 0.05) < headR * 0.22
        inShape = (inHead || jaw) && !eyeL && !eyeR
        break
      }
      case 'bolt': {
        // simple lightning-bolt-ish zigzag using two triangles
        const t1 = dx * 0.6 + dy * 0.3 > -r * 0.2 && dx * 0.6 + dy * 0.3 < r * 0.5 && dy < r * 0.2 && dy > -r
        const t2 = -dx * 0.6 + dy * 0.3 > -r * 0.5 && -dx * 0.6 + dy * 0.3 < r * 0.2 && dy > -r * 0.2 && dy < r
        inShape = t1 || t2
        break
      }
      default:
        inShape = dist < r
    }

    if (inShape) {
      const shade = mix(accentRgb, [255, 255, 255], Math.max(0, 0.25 - dist / SIZE))
      return [shade[0], shade[1], shade[2], 255]
    }
    // subtle border ring
    if (dist > SIZE * 0.47 && dist < SIZE * 0.49) {
      return [accentRgb[0], accentRgb[1], accentRgb[2], 120]
    }
    return [base[0], base[1], base[2], 255]
  })
}

// ---- desired asset slots ---------------------------------------------
//
// This is the list of art the game wants to exist, used only to fill gaps.
// It is NOT the registry: src/config/assets.ts is generated by scanning the
// folder (scripts/gen-asset-manifest.mjs), so a file added here — or dropped
// in by hand — is picked up either way.

const manifest = {
  locations: {
    palette: { bg: '#1b2a2f', accent: '#4fb0a5' },
    items: {
      default: 'square',
      forest: 'triangle',
      cave: 'diamond',
      ruins: 'square',
    },
  },
  events: {
    palette: { bg: '#2a2440', accent: '#a58bd8' },
    items: {
      default: 'circle',
      empty: 'circle',
      branch: 'diamond',
      discovery: 'card',
      special: 'bolt',
      bossroom: 'skull',
    },
  },
  traps: {
    palette: { bg: '#3a1f1f', accent: '#e0654f' },
    items: {
      default: 'bolt',
      sprung: 'triangle',
    },
  },
  treasure: {
    palette: { bg: '#3a2f14', accent: '#e8c04a' },
    items: {
      default: 'chest',
      locked: 'chest',
      open: 'chest',
      shrine: 'diamond',
      rest: 'circle',
    },
  },
  totems: {
    palette: { bg: '#1f2a3a', accent: '#5fa8e0' },
    items: {
      default: 'circle',
      totem_ember: 'circle',
      totem_tide: 'circle',
      totem_stone: 'circle',
      totem_silverKnight: 'circle',
    },
  },
  enemies: {
    palette: { bg: '#251b2e', accent: '#c15fd0' },
    items: {
      default: 'skull',
      slime: 'circle',
      goblin: 'triangle',
      wraith: 'diamond',
    },
  },
  bosses: {
    palette: { bg: '#2e1414', accent: '#f2453f' },
    items: {
      default: 'skull',
      guardian: 'skull',
    },
  },
  battlebg: {
    palette: { bg: '#101820', accent: '#334455' },
    items: {
      default: 'square',
      cave: 'diamond',
      ruins: 'square',
      boss: 'skull',
    },
  },
  spells: {
    palette: { bg: '#1a1a2e', accent: '#f2c14e' },
    items: {
      default: 'card',
      fire: 'card',
      water: 'card',
      earth: 'card',
      wind: 'card',
      arcane: 'card',
    },
  },
}

// slightly vary accent per key so flavor variants are visually distinct
const accentShift = {
  forest: '#5fbf6a', cave: '#7d8fa0', ruins: '#c2a05a',
  empty: '#8c7fd8', branch: '#a58bd8', discovery: '#d8b98b', special: '#e05fd0', bossroom: '#f24545',
  sprung: '#e0654f',
  locked: '#e8c04a', open: '#9adb6b', shrine: '#7fd8c8', rest: '#7fb8d8',
  totem_ember: '#e0774f', totem_tide: '#4fb6e0', totem_stone: '#9a9a7f',
  slime: '#6bdb8f', goblin: '#8fdb6b', wraith: '#9f8fe0',
  guardian: '#f2453f',
  cave2: '#334455', boss: '#f2453f',
  fire: '#f2653f', water: '#4f9ef2', earth: '#8f6f3f', wind: '#bfe0f2', arcane: '#c15fe0',
}

let generated = 0
let skipped = 0
for (const [category, def] of Object.entries(manifest)) {
  const dir = join(OUT_ROOT, category)
  mkdirSync(dir, { recursive: true })
  for (const [key, shape] of Object.entries(def.items)) {
    const target = join(dir, `${key}.png`)
    // Never clobber real artwork someone has dropped in to replace a
    // placeholder — only fill in files that don't exist yet.
    if (existsSync(target)) {
      skipped++
      continue
    }
    const accent = accentShift[key] || def.palette.accent
    const png = drawPlaceholder({ bg: def.palette.bg, accent, shape })
    writeFileSync(target, png)
    generated++
  }
}

console.log(
  `Generated ${generated} placeholder PNG(s) under ${OUT_ROOT}` +
    (skipped > 0 ? ` (${skipped} already present — left untouched)` : ''),
)
