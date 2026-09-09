import { describe, it, expect } from 'vitest'
import { existsSync, mkdirSync, mkdtempSync, readdirSync, statSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { artIn, artPath } from '../../scripts/artFiles.mjs'
import { WORLD_FOLDERS, REQUIRED_EVENTS, REQUIRED_LOCATIONS, OPTIONAL_LOCATIONS } from '../../scripts/worldSlots.mjs'
import { worldPacks } from './worldManifest'

const WORLDS = join(process.cwd(), 'public', 'worlds')
const folders = WORLD_FOLDERS as readonly ('locations' | 'events' | 'npcs' | 'enemies' | 'bosses')[]

const canonical: Record<string, readonly string[]> = {
  locations: [...REQUIRED_LOCATIONS, ...OPTIONAL_LOCATIONS],
  events: REQUIRED_EVENTS,
}
const on = (id: string, folder: string) => artIn(join(WORLDS, id, folder), canonical[folder] ?? [])

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
        // Both sides sorted the same way: slot names are compared as a set,
        // and the two sources order them differently on their own.
        const listed = [...pack![folder]].sort()
        const disk = on(id, folder)
          .map((a: { slot: string }) => a.slot)
          .sort()
        expect(listed, `${id}/${folder}`).toEqual(disk)
      }
    })

    it(`records the file each of ${id}'s slots is stored as`, () => {
      // worldAsset() builds its URL from this, so a wrong entry is art that
      // silently does not load — and on a case-sensitive host, a slot whose
      // file is capitalised differently is exactly that.
      const pack = worldPacks.find((w) => w.id === id)!
      for (const folder of folders) {
        for (const art of on(id, folder) as { slot: string; file: string }[]) {
          expect(pack.files[`${folder}/${art.slot}`]).toBe(art.file)
          expect(existsSync(join(WORLDS, id, folder, art.file))).toBe(true)
        }
      }
    })
  }
})

describe('slot names ignore the capitalisation of the file', () => {
  function fixture(names: string[]): string {
    const dir = mkdtempSync(join(tmpdir(), 'thoth-art-'))
    mkdirSync(dir, { recursive: true })
    for (const n of names) writeFileSync(join(dir, n), '')
    return dir
  }

  it('fills a required slot from a differently-cased file', () => {
    // Real case: a world shipped events/Key.png, the slot is `key`, and the
    // placeholder generator filled `key` with a grey square beside it.
    const dir = fixture(['Key.png', 'bossDoor.png'])
    const art = artIn(dir, REQUIRED_EVENTS) as { slot: string; file: string }[]
    expect(art.map((a) => a.slot).sort()).toEqual(['bossDoor', 'key'])
    expect(art.find((a) => a.slot === 'key')!.file).toBe('Key.png')
  })

  it('finds that file when asked for the slot, so no placeholder is written', () => {
    const dir = fixture(['Key.png'])
    expect(artPath(dir, 'key')).toBe(join(dir, 'Key.png'))
    expect(artPath(dir, 'trap1')).toBeNull()
  })

  it('leaves free-form folders alone — a filename there is the name', () => {
    const dir = fixture(['Man-Eater.png', 'Armatick.png'])
    const art = artIn(dir) as { slot: string }[]
    expect(art.map((a) => a.slot).sort()).toEqual(['Armatick', 'Man-Eater'])
  })

  it('picks one file per slot and reports the one it ignored', () => {
    const dir = fixture(['Key.webp', 'key.png'])
    const art = artIn(dir, REQUIRED_EVENTS) as { slot: string; file: string }[] & {
      collisions: { slot: string; used: string; ignored: string }[]
    }
    expect(art).toHaveLength(1)
    expect(art[0].file).toBe('Key.webp')
    expect(art.collisions).toEqual([{ slot: 'key', used: 'Key.webp', ignored: 'key.png' }])
  })
})
