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

export function registerOfflineCache(): void {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return
  // file:// and any other non-http scheme: nothing to cache, nothing to do.
  if (!location.protocol.startsWith('http')) return
  // sw.js is emitted by the build, so it does not exist under `vite dev`.
  // Asking for it there gets index.html back and the browser logs a MIME
  // type error that has nothing to do with the app.
  if (!import.meta.env.PROD) return

  window.addEventListener('load', () => {
    // A failure here must never take the game down with it — the app works
    // perfectly well uncached, it just won't survive going offline.
    navigator.serviceWorker.register(SERVICE_WORKER_URL).catch(() => {})
  })
}
