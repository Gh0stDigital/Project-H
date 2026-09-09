// Types for artFiles.mjs, which the manifest guard tests import directly so
// they compare the committed manifests against the same view of the folder
// the generators use.

export declare const ART_EXTENSIONS: readonly string[]
export declare function isArtFile(file: string): boolean
export declare function artIn(dir: string): { slot: string; ext: string }[]
export declare function extTable(
  entries: readonly { slot: string; ext: string }[],
  prefix?: string,
): Record<string, string>
export declare function artPath(dir: string, slot: string): string | null
