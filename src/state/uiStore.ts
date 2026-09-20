import { create } from 'zustand'

export type Screen = 'menu' | 'compendium' | 'totem' | 'dungeon' | 'records'

interface UiStore {
  screen: Screen
  goTo(screen: Screen): void
  /**
   * True until the opening has handed over to the menu.
   *
   * The title sequence plays *over* a mounted app, so `screen` is already
   * 'menu' while the book is still shut — which means anything that keys off
   * the screen alone thinks the player has arrived when they have not. The
   * soundtrack is the one that cares: the menu theme would otherwise be
   * playing under the cover, the flash and the loading bar.
   */
  opening: boolean
  arrive(): void
}

export const useUiStore = create<UiStore>()((set) => ({
  screen: 'menu',
  goTo: (screen) => set({ screen }),
  opening: true,
  arrive: () => set({ opening: false }),
}))
