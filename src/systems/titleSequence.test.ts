import { describe, expect, it } from 'vitest'
import {
  nextTitlePhase,
  titleHasArrived,
  titleIsShowing,
  titlePhaseMs,
  titleTimings,
  type TitlePhase,
} from './titleSequence'

describe('title sequence', () => {
  it('runs the beats in order and stops at the end', () => {
    const seen: TitlePhase[] = ['cover']
    for (let i = 0; i < 10 && seen[seen.length - 1] !== 'done'; i++) {
      seen.push(nextTitlePhase(seen[seen.length - 1]))
    }
    expect(seen).toEqual([
      'cover',
      'igniting',
      'flash',
      'awaken',
      'fading',
      'loading',
      'revealing',
      'done',
    ])
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
    for (const phase of ['igniting', 'flash', 'awaken', 'fading', 'revealing'] as const) {
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
    expect(titleIsShowing('revealing')).toBe(true)
    expect(titleIsShowing('done')).toBe(false)
  })

  it('counts as arrived only once the menu is on show', () => {
    // What decides when the music may start. Anything earlier is still the
    // opening, and the theme would play over the book and the flash.
    for (const phase of ['cover', 'igniting', 'flash', 'awaken', 'fading', 'loading'] as const) {
      expect(titleHasArrived(phase)).toBe(false)
    }
    expect(titleHasArrived('revealing')).toBe(true)
    expect(titleHasArrived('done')).toBe(true)
  })

  it('takes longer to arrive at the menu than it did to go dark', () => {
    // Going out is punctuation; arriving somewhere is not, and a menu that
    // snaps in undoes the pause that was just bought.
    expect(titleTimings.revealing).toBeGreaterThan(titleTimings.fading)
  })
})
