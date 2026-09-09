import { describe, it, expect } from 'vitest'
import { existsSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { artIn } from '../../scripts/artFiles.mjs'
import { WORLD_FOLDERS } from '../../scripts/worldSlots.mjs'
import { worldPacks } from './worldManifest'

const WORLDS = join(process.cwd(), 'public', 'worlds')
const folders = WORLD_FOLDERS as readonly ('locations' | 'events' | 'npcs' | 'enemies' | 'bosses')[]

const on = (id: string, folder: string) => artIn(join(WORLDS, id, folder))

/**
 * The manifest is generated but committed, so it can go stale when art is
 * added and the regenerated file is not committed with it. That has shipped
 * twice for the asset manifest; this is the same guard for worlds, which
 * carry far more files each.
 */
describe('the committed world manifest matches the art on disk', () => {
  const ids = existsSync(WORLDS)
    ? readdirSync(WORLDS).filter((d) => statSync(join(WORLDS, d)).isDirectory())
    : []

  it('lists every world folder', () => {
    expect(worldPacks.map((w) => w.id).sort()).toEqual([...ids].sort())
  })

  for (const id of ids) {
    it(`lists ${id}'s art, and nothing that is missing`, () => {
      const pack = worldPacks.find((w) => w.id === id)
      expect(pack, `${id} is on disk but not in the manifest`).toBeDefined()
      for (const folder of folders) {
        expect([...pack![folder]].sort()).toEqual(on(id, folder).map((a) => a.slot))
      }
    })

    it(`records the extension each of ${id}'s files is stored as`, () => {
      // worldAsset() builds its URL from this, so a wrong entry is art that
      // silently does not load.
      const pack = worldPacks.find((w) => w.id === id)!
      for (const folder of folders) {
        for (const art of on(id, folder)) {
          expect(pack.ext[`${folder}/${art.slot}`]).toBe(art.ext)
        }
      }
    })
  }
})
