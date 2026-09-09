// Types for artFiles.mjs, which the manifest guard tests import directly so
// they compare the committed manifests against the same view of the folder
// the generators use.

export interface ArtFile {
  /** Canonical slot name — the capitalisation the game addresses it by. */
  slot: string
  /** The file on disk, which may be cased or extended differently. */
  file: string
  ext: string
}

export interface ArtCollision {
  slot: string
  used: string
  ignored: string
}

export type ArtFolder = ArtFile[] & { collisions: ArtCollision[] }

export declare const ART_EXTENSIONS: readonly string[]
export declare function isArtFile(file: string): boolean
export declare function artIn(dir: string, canonical?: readonly string[]): ArtFolder
export declare function fileTable(entries: readonly ArtFile[], prefix?: string): Record<string, string>
export declare function artPath(dir: string, slot: string): string | null
