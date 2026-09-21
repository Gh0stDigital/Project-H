/**
 * Choosing which track plays, when a slot has more than one.
 *
 * Kept here, away from the audio engine, because the interesting part is a
 * decision and not a sound: which of these, given what played last. The
 * engine asks once when a run begins and holds the answer for the rest of
 * it.
 */

/**
 * One track from the pool.
 *
 * `avoid` is what played last time. With more than one track to choose
 * from it is excluded, so two runs in a row never open on the same theme —
 * which is the whole reason for having a pool, and the thing a plain random
 * pick gets wrong often enough to notice: with three tracks, one run in
 * three repeats.
 *
 * With a single track, `avoid` is ignored rather than leaving the run
 * silent: one track is still that slot's music.
 */
export function pickTrack(
  pool: readonly string[],
  random: () => number,
  avoid?: string | null,
): string | null {
  if (pool.length === 0) return null
  if (pool.length === 1) return pool[0]
  const choices = pool.filter((track) => track !== avoid)
  // Every track was excluded, which can only mean the pool is one track
  // repeated; fall back to the whole thing rather than returning nothing.
  const from = choices.length > 0 ? choices : pool
  const index = Math.min(from.length - 1, Math.floor(random() * from.length))
  return from[index]
}
