/**
 * Service-worker registration.
 *
 * This only matters when the game is served over http(s) — a hosted copy,
 * or one added to a phone's home screen. There the browser fetches the page
 * from the network every time, so without a cache "open it offline" simply
 * fails. The worker precaches the whole app on first visit and serves it
 * from the cache afterwards, so later launches never touch the network.
 *
 * Opened straight from disk (file://) there is nothing to register: no
 * network is involved in the first place, service workers are not available
 * on that scheme, and calling register() would only throw.
 */

const SERVICE_WORKER_URL = './sw.js'

/**
 * Guards the one reload below. A worker taking control must refresh the page
 * exactly once; without this, a browser that fires controllerchange again
 * would put the app into a reload loop.
 */
let reloading = false

export function registerOfflineCache(): void {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return
  // file:// and any other non-http scheme: nothing to cache, nothing to do.
  if (!location.protocol.startsWith('http')) return
  // sw.js is emitted by the build, so it does not exist under `vite dev`.
  // Asking for it there gets index.html back and the browser logs a MIME
  // type error that has nothing to do with the app.
  if (!import.meta.env.PROD) return

  // Captured before registering, since register() can hand control over.
  const controllerAtStartup = navigator.serviceWorker.controller !== null

  // The cache is deliberately cache-first, so a newly deployed build is not
  // what the player sees on the visit that downloads it — the page has
  // already rendered from the old cache by the time the new worker installs.
  // Left alone that reads exactly like "I deployed and nothing changed", and
  // on a copy that is rarely reloaded the old version can persist for a long
  // time. Reloading once when the new worker takes over closes that gap.
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    // Nothing was controlling the page before, so this is the very first
    // install rather than an update: the page is already the current build
    // and reloading would be pointless churn.
    if (!controllerAtStartup) return
    if (reloading) return
    reloading = true
    window.location.reload()
  })


  window.addEventListener('load', () => {
    // A failure here must never take the game down with it — the app works
    // perfectly well uncached, it just won't survive going offline.
    navigator.serviceWorker
      .register(SERVICE_WORKER_URL)
      .then((registration) => {
        // Ask explicitly rather than waiting for the browser's own schedule,
        // which can be up to a day, so a tab left open still picks up a new
        // build when it is next opened.
        registration.update().catch(() => {})
      })
      .catch(() => {})
  })
}
