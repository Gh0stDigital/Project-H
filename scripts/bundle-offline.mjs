// Makes the built app genuinely openable offline, including straight from
// disk with no server at all.
//
// Why this exists: Vite emits the bundle as `<script type="module"
// crossorigin src="...">`. Module scripts are CORS-checked, and a page
// opened over file:// has a null origin, so the browser refuses to load
// them and the app never boots — a blank page with a CORS error in the
// console. Inlining the bundle as a plain <script> sidesteps the fetch
// entirely, so there is nothing left to block.
//
// Produces two things in dist/:
//   index.html          the app, code inlined, art as sibling files.
//                       Copy the whole dist folder anywhere and open it.
//   thoth-offline.html  the same app with every image inlined as a data
//                       URI too — one self-contained file, nothing beside
//                       it. Bigger, but it cannot lose its art.
//   sw.js               a service worker precaching everything above, so a
//                       *hosted* copy (or one added to a phone's home
//                       screen) also survives going offline. Irrelevant to
//                       the from-disk case, harmless there.

import { readFileSync, writeFileSync, rmSync, existsSync, readdirSync, statSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DIST = join(__dirname, '..', 'dist')

/**
 * Text inside a <script> block must not contain a literal `</script`, which
 * would close the block early.
 */
function escapeForInlineScript(code) {
  return code.replace(/<\/script/gi, '<\\/script')
}

/**
 * Replaces without interpreting `$&`, `$1` and friends in the replacement.
 * The bundle contains React's literal "$&/" — passed as a plain string it
 * would expand into the matched tag and corrupt the code.
 */
function replaceLiteral(haystack, pattern, replacement) {
  return haystack.replace(pattern, () => replacement)
}

function walk(dir) {
  const out = []
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) out.push(...walk(full))
    else out.push(full)
  }
  return out
}

const MIME = { '.png': 'image/png', '.svg': 'image/svg+xml', '.jpg': 'image/jpeg', '.webp': 'image/webp' }

function dataUri(file) {
  const ext = file.slice(file.lastIndexOf('.')).toLowerCase()
  const mime = MIME[ext] ?? 'application/octet-stream'
  return `data:${mime};base64,${readFileSync(file).toString('base64')}`
}

function kb(n) {
  return `${(n / 1024).toFixed(0)} kB`
}

// ---------------------------------------------------------------------------

if (!existsSync(DIST)) {
  console.error('bundle-offline: no dist/ — run the build first.')
  process.exit(1)
}

// Sits immediately before the inlined app script. The single-file build
// swaps it for the asset map, which must be defined before the app runs.
const APP_MARKER = '<!--thoth-app-->'

const htmlPath = join(DIST, 'index.html')
let html = readFileSync(htmlPath, 'utf8')

// --- Inline the JS bundle as a classic script ---------------------------

const scriptTag = /<script\b[^>]*\bsrc="\.\/([^"]+)"[^>]*><\/script>/
const scriptMatch = html.match(scriptTag)
if (!scriptMatch) {
  console.error('bundle-offline: could not find the bundle <script> in dist/index.html.')
  process.exit(1)
}
const jsPath = join(DIST, scriptMatch[1])
const js = readFileSync(jsPath, 'utf8')

// A module bundle would still carry import/export syntax that a classic
// script cannot parse — the vite config sets format: 'iife' to prevent it.
if (/^\s*(?:import|export)\s/m.test(js)) {
  console.error('bundle-offline: bundle still contains ESM syntax — check build.rollupOptions.output.format.')
  process.exit(1)
}

// Drop the original tag and re-add the code at the end of <body>. Vite's
// `type="module"` script was deferred and so ran after the document was
// parsed; a classic inline script runs the moment it is reached, and in
// <head> that is before #root exists (React error #299).
html = replaceLiteral(html, scriptTag, '')
html = replaceLiteral(
  html,
  '</body>',
  `  ${APP_MARKER}\n  <script>${escapeForInlineScript(js)}</script>\n  </body>`,
)

// Any stylesheet link would be CORS-blocked from disk exactly like the
// script. The iife build folds CSS into the bundle, so this is a guard
// rather than an expected case.
const styleTag = /<link\b[^>]*rel="stylesheet"[^>]*href="\.\/([^"]+)"[^>]*>/
const styleMatch = html.match(styleTag)
if (styleMatch) {
  const css = readFileSync(join(DIST, styleMatch[1]), 'utf8')
  html = replaceLiteral(html, styleTag, `<style>${css}</style>`)
  rmSync(join(DIST, styleMatch[1]), { force: true })
}

writeFileSync(htmlPath, replaceLiteral(html, APP_MARKER, ''))
rmSync(jsPath, { force: true })
console.log(`bundle-offline: dist/index.html is self-contained code (${kb(Buffer.byteLength(html))})`)

// --- Single-file variant, art and all -----------------------------------

const assetsRoot = join(DIST, 'assets')
const inline = {}
if (existsSync(assetsRoot)) {
  for (const file of walk(assetsRoot)) {
    // Keyed by the path the app builds at runtime (config/assets.ts).
    inline[relative(DIST, file).split('\\').join('/')] = dataUri(file)
  }
}

// The favicon is referenced by href and would 404 on its own.
const faviconPath = join(DIST, 'favicon.svg')
let single = html
if (existsSync(faviconPath)) {
  single = replaceLiteral(single, 'href="./favicon.svg"', `href="${dataUri(faviconPath)}"`)
}

// Must be defined before the app script runs, so it goes immediately
// ahead of it rather than at the top of the document.
const mapScript = `<script>window.__THOTH_INLINE_ASSETS=${JSON.stringify(inline)}</script>`
single = replaceLiteral(single, APP_MARKER, mapScript)

// Nothing sits beside this file, so a manifest link would only ever be a
// failed request.
single = replaceLiteral(single, /<link\b[^>]*rel="manifest"[^>]*>\s*/, '')

const singlePath = join(DIST, 'thoth-offline.html')
writeFileSync(singlePath, single)
console.log(
  `bundle-offline: dist/thoth-offline.html is one self-contained file ` +
    `(${kb(Buffer.byteLength(single))}, ${Object.keys(inline).length} images inlined)`,
)

// --- Service worker, for the hosted / installed case --------------------

// Opened from disk there is no network to fall back on, so none of this
// applies. Served over http(s) the browser refetches the page on every
// launch, and without a cache "open it offline" just fails — so precache
// the whole app on first visit and serve from the cache from then on.

// Everything a cold, offline launch needs. Hashed into the cache name so a
// new build supersedes the old cache instead of serving stale code forever.
const precache = [
  './',
  './index.html',
  './favicon.svg',
  './manifest.webmanifest',
  ...(existsSync(assetsRoot) ? walk(assetsRoot).map((f) => `./${relative(DIST, f).split('\\').join('/')}`) : []),
]

const version = createHash('sha256')
  .update(html)
  .update(precache.join('\n'))
  .digest('hex')
  .slice(0, 12)

const sw = `// Generated by scripts/bundle-offline.mjs — do not edit by hand.
const CACHE = 'thoth-${version}'
const PRECACHE = ${JSON.stringify(precache, null, 2)}

self.addEventListener('install', (event) => {
  // Precache everything, then take over immediately rather than waiting for
  // every tab to close — the player should not have to relaunch twice.
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', (event) => {
  // Drop caches from previous builds so old code cannot resurface.
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  const request = event.request
  if (request.method !== 'GET') return

  // Cache-first: this game has no server and no live data, so a cache hit
  // is always correct and always the fastest answer.
  event.respondWith(
    caches.match(request, { ignoreSearch: true }).then((hit) => {
      if (hit) return hit
      return fetch(request)
        .then((response) => {
          // Squirrel away anything new we successfully fetched.
          if (response.ok && response.type === 'basic') {
            const copy = response.clone()
            caches.open(CACHE).then((cache) => cache.put(request, copy))
          }
          return response
        })
        .catch(() => {
          // Offline and not cached. For a navigation that means the player
          // launched the app — hand back the shell rather than a browser
          // error page.
          if (request.mode === 'navigate') return caches.match('./index.html')
          return Response.error()
        })
    }),
  )
})
`

writeFileSync(join(DIST, 'sw.js'), sw)
console.log(`bundle-offline: dist/sw.js precaches ${precache.length} files (cache thoth-${version})`)
