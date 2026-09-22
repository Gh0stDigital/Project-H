import { describe, expect, it } from 'vitest'
import {
  nextTitlePhase,
  titleFill,
  titleHasArrived,
  titleIsWaiting,
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
      'choosing',
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

  it('leaves the beats that wait on something else untimed', () => {
    // The tap, the choice of game, and the art finishing its decode. A
    // duration on any of them would run the sequence on without it.
    expect(titlePhaseMs('cover')).toBeNull()
    expect(titlePhaseMs('choosing')).toBeNull()
    expect(titlePhaseMs('loading')).toBeNull()
  })

  it('knows which beats are waiting on the player', () => {
    expect(titleIsWaiting('cover')).toBe(true)
    expect(titleIsWaiting('choosing')).toBe(true)
    for (const phase of ['igniting', 'flash', 'awaken', 'fading', 'loading', 'revealing', 'done'] as const) {
      expect(titleIsWaiting(phase)).toBe(false)
    }
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
    for (const phase of ['cover', 'choosing', 'igniting', 'flash', 'awaken', 'fading', 'loading'] as const) {
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

/**
 * How far each still is pushed past its natural size.
 *
 * These decide how much room is left for the binding around them, so the
 * screen and the frame read the same two numbers. A test rather than a
 * comment because nothing else fails when one of them is wrong — the picture
 * simply sits badly, which is the kind of thing that ships.
 */
describe('how far the stills are pushed', () => {
  it('pushes both plates past their natural size', () => {
    // Shown whole, either one reaches less than half a phone's height.
    expect(titleFill.cover).toBeGreaterThan(1)
    expect(titleFill.awaken).toBeGreaterThan(1)
  })

  it('leaves room for the binding on a phone', () => {
    // A 430x932 viewport, which is what the game is laid out for. The cover
    // is square and the second plate is 4:5, so those are the heights they
    // paint at — both have to stop short of the screen or there is nothing
    // for the boards to occupy and they end up laid over the picture.
    const width = 430
    const height = 932
    expect(width * titleFill.cover * 1).toBeLessThan(height)
    expect(width * titleFill.awaken * (1402 / 1122)).toBeLessThan(height)
  })

  it('pushes the square plate harder than the tall one', () => {
    // The cover is square, so at a shared number it reads as much the
    // smaller of the two.
    expect(titleFill.cover).toBeGreaterThan(titleFill.awaken)
  })
})

