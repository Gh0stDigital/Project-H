/**
 * Offline persistence — storage abstraction.
 *
 * Gameplay code never touches `localStorage` directly. It goes through the
 * `StorageAdapter` interface below, so the backing store can later be
 * swapped or supplemented (e.g. IndexedDB, a native bridge) without
 * touching any system or UI code.
 */

export interface StorageAdapter {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}

/** Default adapter: browser localStorage. */
export const localStorageAdapter: StorageAdapter = {
  getItem(key) {
    try {
      return window.localStorage.getItem(key)
    } catch {
      return null
    }
  },
  setItem(key, value) {
    try {
      window.localStorage.setItem(key, value)
    } catch {
      // Storage full or unavailable (e.g. private mode) — fail silently,
      // the game simply won't persist this write.
    }
  },
  removeItem(key) {
    try {
      window.localStorage.removeItem(key)
    } catch {
      // ignore
    }
  },
}

/** In-memory adapter, useful for tests or as a fallback. */
export function createMemoryAdapter(): StorageAdapter {
  const store = new Map<string, string>()
  return {
    getItem: (key) => store.get(key) ?? null,
    setItem: (key, value) => void store.set(key, value),
    removeItem: (key) => void store.delete(key),
  }
}

const SCHEMA_VERSION = 1
const STORAGE_KEY = 'thoth.save.v1'

export interface SaveEnvelope<T> {
  version: number
  savedAt: string
  data: T
}

export class PersistenceService<T> {
  private adapter: StorageAdapter
  private key: string
  private version: number

  constructor(adapter: StorageAdapter, key: string = STORAGE_KEY, version: number = SCHEMA_VERSION) {
    this.adapter = adapter
    this.key = key
    this.version = version
  }

  load(): T | null {
    const raw = this.adapter.getItem(this.key)
    if (!raw) return null
    try {
      const parsed = JSON.parse(raw) as SaveEnvelope<T>
      if (!parsed || typeof parsed !== 'object') return null
      // No migrations yet — a version mismatch just means "no compatible save".
      if (parsed.version !== this.version) return null
      return parsed.data
    } catch {
      return null
    }
  }

  save(data: T): void {
    const envelope: SaveEnvelope<T> = {
      version: this.version,
      savedAt: new Date().toISOString(),
      data,
    }
    this.adapter.setItem(this.key, JSON.stringify(envelope))
  }

  clear(): void {
    this.adapter.removeItem(this.key)
  }
}
