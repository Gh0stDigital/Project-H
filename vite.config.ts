import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'
// @ts-expect-error - plain .mjs build script, no types
import { generateAssetManifest, ASSETS_DIR } from './scripts/gen-asset-manifest.mjs'
// @ts-expect-error - plain .mjs build script, no types
import { generateWorldManifest, WORLDS_DIR } from './scripts/gen-world-manifest.mjs'

/**
 * Keeps src/config/assetManifest.ts in step with public/assets.
 *
 * A browser cannot list a directory, so the catalogue of available art has
 * to be baked in at build time. The failure mode that keeps biting is a
 * human one: art gets committed and the generated manifest does not, so the
 * new file exists on disk but the game never offers it. Running the
 * generator here means dropping a PNG in is the whole job — the dev server
 * picks it up live, and a build can never ship a stale list.
 */
function assetManifestPlugin(): Plugin {
  const regenerate = (reason: string) => {
    try {
      const result = generateAssetManifest()
      if (result.changed) {
        const totems = result.manifest.totems?.length ?? 0
        console.log(`[assets] manifest updated (${reason}): ${result.total} images, ${totems} totems`)
      }
      for (const w of result.warnings) console.warn(`[assets] ${w}`)

      // World packs are compiled the same way, and report what a
      // half-finished one is still missing rather than failing quietly.
      const worlds = generateWorldManifest()
      if (worlds.changed) {
        const playable = worlds.worlds.filter((w: { complete: boolean }) => w.complete)
        console.log(`[worlds] ${playable.length}/${worlds.worlds.length} playable (${reason})`)
        for (const w of worlds.worlds) {
          if (w.complete) continue
          console.warn(`[worlds] ${w.id} is not playable yet — missing:`)
          for (const m of w.missing) console.warn(`           ${m}`)
        }
      }
    } catch (err) {
      // Never take the dev server or the build down over this: the committed
      // manifest is still usable, it is just possibly behind.
      console.warn(`[assets] could not regenerate the manifest: ${String(err)}`)
    }
  }

  return {
    name: 'thoth-asset-manifest',
    // Covers `vite build`; buildStart also fires for the dev server.
    buildStart() {
      regenerate('startup')
    },
    configureServer(server) {
      // Watch the art folder itself. Vite watches source, not public/, so
      // without this a PNG added while the server is running is invisible
      // until a restart.
      server.watcher.add(ASSETS_DIR)
      server.watcher.add(WORLDS_DIR)
      for (const event of ['add', 'unlink'] as const) {
        server.watcher.on(event, (file: string) => {
          const watched = file.startsWith(ASSETS_DIR) || file.startsWith(WORLDS_DIR)
          if (watched && /\.(png|json)$/i.test(file)) {
            regenerate(`${event} ${path.basename(file)}`)
          }
        })
      }
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), assetManifestPlugin()],
  // Relative base so the built app can be opened straight from disk (file://)
  // with zero server and zero network requests — fully offline.
  base: './',
  build: {
    // An offline build can land on whatever browser the player has, with no
    // way to update it and no console to diagnose it — a syntax error the
    // engine can't parse is just a white screen. Target iOS 14 (2020) so the
    // bundle stays parseable well below any phone we expect to see.
    target: 'safari14',
    // A classic IIFE bundle, not an ES module. Module scripts are
    // CORS-checked, and a page opened from disk has a null origin, so a
    // `type="module"` build is blocked outright by the browser and the app
    // never boots. scripts/bundle-offline.mjs then inlines this bundle into
    // index.html as a plain <script>.
    rollupOptions: {
      output: {
        format: 'iife',
        inlineDynamicImports: true,
        entryFileNames: 'assets/[name]-[hash].js',
      },
    },
    // Nothing to preload once the bundle is inlined, and modulepreload
    // links would be CORS-blocked from disk too.
    modulePreload: false,
  },
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, 'src'),
    },
  },
})
