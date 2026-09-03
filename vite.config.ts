import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
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
