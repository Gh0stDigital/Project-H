import { describe, it, expect } from 'vitest'
import { readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { assetManifest } from './assetManifest'

const ASSETS = join(process.cwd(), 'public', 'assets')

function onDisk(category: string): string[] {
  return readdirSync(join(ASSETS, category))
    .filter((f) => f.toLowerCase().endsWith('.png'))
    .map((f) => f.slice(0, -4))
    .sort()
}

/**
 * The manifest is generated, but it is also committed — so it can go stale
 * when art is added and the regenerated file is not committed with it. That
 * exact mismatch has shipped twice: a portrait sitting in the folder that
 * the game never offered. This is the guard.
 */
describe('the committed manifest matches the art on disk', () => {
  const categories = readdirSync(ASSETS).filter((d) => statSync(join(ASSETS, d)).isDirectory())

  it('covers every category that has art', () => {
    for (const category of categories) {
      if (onDisk(category).length === 0) continue
      expect(Object.keys(assetManifest)).toContain(category)
    }
  })

  for (const category of categories) {
    if (onDisk(category).length === 0) continue
    it(`lists every ${category} file, and nothing that is missing`, () => {
      const listed = [...((assetManifest as Record<string, readonly string[]>)[category] ?? [])].sort()
      expect(listed).toEqual(onDisk(category))
    })
  }

  it('offers the totems that exist, including newly added ones', () => {
    // Named explicitly: totems are the category people add to most often.
    expect([...assetManifest.totems].sort()).toEqual(onDisk('totems'))
  })
})
