import { describe, it, expect } from 'vitest'
import { readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { artIn } from '../../scripts/artFiles.mjs'
import { assetExt, assetManifest } from './assetManifest'

const ASSETS = join(process.cwd(), 'public', 'assets')

function onDisk(category: string): string[] {
  return artIn(join(ASSETS, category))
    .map((a) => a.slot)
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

  it('records the extension every key is actually stored as', () => {
    // The URL is built from this, so a stale entry is a missing image —
    // the failure mode the whole manifest exists to prevent.
    for (const category of categories) {
      for (const art of artIn(join(ASSETS, category))) {
        expect(assetExt[`${category}/${art.slot}`]).toBe(art.ext)
      }
    }
  })
})
