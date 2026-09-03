import { create } from 'zustand'
import type { Spell } from '@/domain/spell'
import type { SpellSet } from '@/domain/spellSet'
import type { Totem } from '@/domain/totem'
import type { GameSettings } from '@/domain/settings'
import { defaultSettings } from '@/domain/settings'
import type { InventoryEntry, ItemId } from '@/domain/item'
import { itemBalance } from '@/config/items'
import { addItem, consumeItem } from '@/systems/inventory'
import type { DungeonTierId } from '@/config/balance'
import { PersistenceService, localStorageAdapter } from '@/systems/persistence'
import { addSpell, editSpell, deleteSpell, type SpellEditInput, markEquipped } from '@/systems/spellCompendium'
import type { NewSpellInput } from '@/systems/spellFactory'
import {
  createSpellSet,
  renameSpellSet,
  addSpellToSet,
  removeSpellFromSet,
  deleteSpellSet,
  pruneSpellFromAllSets,
} from '@/systems/spellSetManager'
import { createTotem, equipSpellSet, isUsable } from '@/systems/totemManager'
import { migrateSpells } from '@/systems/spellMigration'
import { totemBalance } from '@/config/balance'
import { hasAsset } from '@/config/assets'

export interface DungeonSelectionDraft {
  totemSpellSetId: string | null
  dungeonSpellSetId: string | null
  tierId: DungeonTierId
}

export interface PersistedData {
  spells: Spell[]
  spellSets: SpellSet[]
  totems: Totem[]
  activeTotemId: string | null
  settings: GameSettings
  lastDungeonSelection: DungeonSelectionDraft
  inventory: InventoryEntry[]
}

const persistence = new PersistenceService<PersistedData>(localStorageAdapter)

function defaultData(): PersistedData {
  const totem = createTotem('Totem')
  return {
    spells: [],
    spellSets: [],
    totems: [totem],
    activeTotemId: totem.id,
    settings: defaultSettings,
    lastDungeonSelection: { totemSpellSetId: null, dungeonSpellSetId: null, tierId: 'tier10' },
    inventory: itemBalance.startingInventory.map((e) => ({ ...e })),
  }
}

function loadInitial(): PersistedData {
  const saved = persistence.load()
  if (!saved) return defaultData()
  // Shallow-merge with defaults so new fields introduced later don't break old saves.
  const defaults = defaultData()
  return {
    // Entries saved before word types and structured definitions existed
    // are filled in with safe defaults rather than dropped.
    spells: migrateSpells(saved.spells ?? defaults.spells),
    spellSets: saved.spellSets ?? defaults.spellSets,
    totems: (saved.totems && saved.totems.length > 0 ? saved.totems : defaults.totems).map((t) => ({
      ...t,
      // A saved portrait is kept as-is. An unknown key (art removed or
      // renamed since the save) falls back rather than breaking the load —
      // getAsset() would show the placeholder anyway, so normalise it here
      // and keep the stored value honest.
      avatarKey: hasAsset('totems', t.avatarKey) ? t.avatarKey : 'default',
      // Life Points were added after some saves were written — give older
      // Totems a full set rather than a destroyed one.
      lifePoints: t.lifePoints ?? totemBalance.startingLifePoints,
      maxLifePoints: t.maxLifePoints ?? totemBalance.startingLifePoints,
      destroyed: t.destroyed ?? false,
      stats: { ...t.stats, dungeonsFailed: t.stats?.dungeonsFailed ?? 0 },
    })),
    activeTotemId: saved.activeTotemId ?? defaults.activeTotemId,
    settings: { ...defaults.settings, ...saved.settings },
    lastDungeonSelection: { ...defaults.lastDungeonSelection, ...saved.lastDungeonSelection },
    inventory: saved.inventory ?? defaults.inventory,
  }
}

export interface PersistentStore extends PersistedData {
  createSpell(input: NewSpellInput): Spell
  /** Creates many Spells in one update (used by batch import). */
  bulkCreateSpells(inputs: NewSpellInput[]): Spell[]
  editSpell(id: string, patch: SpellEditInput): void
  deleteSpell(id: string): void
  replaceSpells(updater: (spells: Spell[]) => Spell[]): void

  createSpellSet(name: string, spellIds?: string[]): SpellSet
  renameSpellSet(id: string, name: string): void
  addSpellToSet(setId: string, spellId: string): void
  removeSpellFromSet(setId: string, spellId: string): void
  deleteSpellSet(id: string): void

  /** Raises a new Totem — its own character, not a reskin of the current one. */
  createTotem(name: string, avatarKey?: string): Totem
  /** Swaps a Totem's portrait to any art the totems registry offers. */
  setTotemAvatar(totemId: string, avatarKey: string): void
  /** Totems that can still enter a dungeon (not destroyed). */
  usableTotems(): Totem[]
  setActiveTotem(id: string): void
  equipTotemSpellSet(totemId: string, spellSetId: string | null): void
  replaceTotem(id: string, updater: (t: Totem) => Totem): void

  updateSettings(patch: Partial<GameSettings>): void
  setLastDungeonSelection(sel: DungeonSelectionDraft): void

  grantItem(itemId: ItemId, quantity?: number): void
  consumeItem(itemId: ItemId): void
}

export const usePersistentStore = create<PersistentStore>()((set, get) => ({
  ...loadInitial(),

  createSpell(input) {
    let created: Spell | undefined
    set((state) => {
      const spells = addSpell(state.spells, input)
      created = spells[spells.length - 1]
      return { spells }
    })
    return created!
  },
  bulkCreateSpells(inputs) {
    let created: Spell[] = []
    set((state) => {
      let spells = state.spells
      for (const input of inputs) spells = addSpell(spells, input)
      created = spells.slice(spells.length - inputs.length)
      return { spells }
    })
    return created
  },
  editSpell(id, patch) {
    set((state) => ({ spells: editSpell(state.spells, id, patch) }))
  },
  deleteSpell(id) {
    set((state) => ({
      spells: deleteSpell(state.spells, id),
      spellSets: pruneSpellFromAllSets(state.spellSets, id),
    }))
  },
  replaceSpells(updater) {
    set((state) => ({ spells: updater(state.spells) }))
  },

  createSpellSet(name, spellIds = []) {
    let created: SpellSet | undefined
    set((state) => {
      const sets = createSpellSet(state.spellSets, name, spellIds)
      created = sets[sets.length - 1]
      return { spellSets: sets }
    })
    return created!
  },
  renameSpellSet(id, name) {
    set((state) => ({ spellSets: renameSpellSet(state.spellSets, id, name) }))
  },
  addSpellToSet(setId, spellId) {
    set((state) => ({ spellSets: addSpellToSet(state.spellSets, setId, spellId) }))
  },
  removeSpellFromSet(setId, spellId) {
    set((state) => ({ spellSets: removeSpellFromSet(state.spellSets, setId, spellId) }))
  },
  deleteSpellSet(id) {
    set((state) => ({
      spellSets: deleteSpellSet(state.spellSets, id),
      totems: state.totems.map((t) => (t.equippedSpellSetId === id ? { ...t, equippedSpellSetId: null } : t)),
    }))
  },

  createTotem(name, avatarKey) {
    const totem = createTotem(name, avatarKey && hasAsset('totems', avatarKey) ? avatarKey : 'default')
    // A newly raised Totem becomes the active one — otherwise a player
    // whose only Totem was destroyed would still have no one to play as.
    set((state) => ({ totems: [...state.totems, totem], activeTotemId: totem.id }))
    return totem
  },
  setTotemAvatar(totemId, avatarKey) {
    if (!hasAsset('totems', avatarKey)) return
    set((state) => ({
      totems: state.totems.map((t) => (t.id === totemId ? { ...t, avatarKey } : t)),
    }))
  },
  usableTotems() {
    return get().totems.filter(isUsable)
  },
  setActiveTotem(id) {
    // A destroyed Totem can never be selected again.
    const target = get().totems.find((t) => t.id === id)
    if (!target || !isUsable(target)) return
    set({ activeTotemId: id })
  },
  equipTotemSpellSet(totemId, spellSetId) {
    set((state) => ({
      totems: state.totems.map((t) => (t.id === totemId ? equipSpellSet(t, spellSetId) : t)),
      spells: spellSetId ? markEquipped(state.spells, get().spellSets.find((s) => s.id === spellSetId)?.spellIds ?? []) : state.spells,
    }))
  },
  replaceTotem(id, updater) {
    set((state) => ({ totems: state.totems.map((t) => (t.id === id ? updater(t) : t)) }))
  },

  updateSettings(patch) {
    set((state) => ({ settings: { ...state.settings, ...patch } }))
  },
  setLastDungeonSelection(sel) {
    set({ lastDungeonSelection: sel })
  },

  grantItem(itemId, quantity = 1) {
    set((state) => ({ inventory: addItem(state.inventory, itemId, quantity) }))
  },
  consumeItem(itemId) {
    set((state) => ({ inventory: consumeItem(state.inventory, itemId) }))
  },
}))

// Persist on every change. Simple + adequate for prototype scale.
usePersistentStore.subscribe((state) => {
  const { spells, spellSets, totems, activeTotemId, settings, lastDungeonSelection, inventory } = state
  persistence.save({ spells, spellSets, totems, activeTotemId, settings, lastDungeonSelection, inventory })
})
