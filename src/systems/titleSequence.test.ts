import { describe, expect, it } from 'vitest'
import { nextTitlePhase, titleIsShowing, titlePhaseMs, type TitlePhase } from './titleSequence'

describe('title sequence', () => {
  it('runs the beats in order and stops at the end', () => {
    const seen: TitlePhase[] = ['cover']
    for (let i = 0; i < 10 && seen[seen.length - 1] !== 'done'; i++) {
      seen.push(nextTitlePhase(seen[seen.length - 1]))
    }
    expect(seen).toEqual(['cover', 'igniting', 'flash', 'awaken', 'loading', 'done'])
  })

  it('cannot walk past the end', () => {
    expect(nextTitlePhase('done')).toBe('done')
  })

  it('leaves the two beats that wait on something else untimed', () => {
    // The tap, and the art finishing its decode. A duration here would run
    // the sequence on without either of them.
    expect(titlePhaseMs('cover')).toBeNull()
    expect(titlePhaseMs('loading')).toBeNull()
  })

  it('gives every self-timed beat a duration', () => {
    for (const phase of ['igniting', 'flash', 'awaken'] as const) {
      expect(titlePhaseMs(phase)).toBeGreaterThan(0)
    }
  })

  it('holds the white for less time than the shot it reveals', () => {
    // A white screen that outstays the impact reads as a broken load.
    expect(titlePhaseMs('flash')!).toBeLessThan(titlePhaseMs('awaken')!)
  })

  it('covers the game until it is done', () => {
    expect(titleIsShowing('cover')).toBe(true)
    expect(titleIsShowing('loading')).toBe(true)
    expect(titleIsShowing('done')).toBe(false)
  })
})
