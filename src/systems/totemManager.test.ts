import { describe, it, expect } from 'vitest'
import { createTotem, STARTING_AVATAR } from './totemManager'
import { hasAsset } from '@/config/assets'

describe('who a new game starts you as', () => {
  it('raises the first Totem as the starting portrait', () => {
    expect(createTotem('토템').avatarKey).toBe(STARTING_AVATAR)
  })

  it('names art that is actually in the folder', () => {
    // The point of the constant. It used to be 'default', which no file
    // answers to, so the portrait came out of the flavour fallback — a hash
    // of the key against whatever happens to be in the folder. That landed
    // on a real face by arithmetic, and adding one file would have silently
    // changed who the game starts you as.
    expect(hasAsset('totems', STARTING_AVATAR)).toBe(true)
  })

  it('still lets the caller ask for someone else', () => {
    expect(createTotem('토템', 'TheExplorer').avatarKey).toBe('TheExplorer')
  })
})
