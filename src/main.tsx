import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './ui/styles/global.css'
import { usePersistentStore } from './state/persistentStore'
import { useDungeonStore } from './state/dungeonStore'
import { useUiStore } from './state/uiStore'
import { registerOfflineCache } from './systems/offlineCache'

// Exposes the game's state stores for local debugging / QA scripting. This
// is an offline single-player prototype with no auth or remote data, so
// there's no security concern in always attaching this.
declare global {
  interface Window {
    __thoth?: {
      usePersistentStore: typeof usePersistentStore
      useDungeonStore: typeof useDungeonStore
      useUiStore: typeof useUiStore
    }
  }
}
window.__thoth = { usePersistentStore, useDungeonStore, useUiStore }

// Makes a hosted copy survive going offline. A no-op when the game is
// opened from disk, which needs no cache to begin with.
registerOfflineCache()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
