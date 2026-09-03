import { create } from 'zustand'

export type Screen = 'menu' | 'compendium' | 'totem' | 'dungeon' | 'records'

interface UiStore {
  screen: Screen
  goTo(screen: Screen): void
}

export const useUiStore = create<UiStore>()((set) => ({
  screen: 'menu',
  goTo: (screen) => set({ screen }),
}))
