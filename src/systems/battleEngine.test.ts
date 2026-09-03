import { describe, expect, it } from 'vitest'
import { attackCardClue, defenseDamage } from './battleEngine'

describe('attack card clue', () => {
  it('shows the first and last letter, capitalised', () => {
    expect(attackCardClue('Anxiety')).toBe('AY')
    expect(attackCardClue('deliver')).toBe('DR')
    expect(attackCardClue('love')).toBe('LE')
  })

  it('uses only the first word of a multi-word meaning', () => {
    expect(attackCardClue('thank you')).toBe('TK')
    expect(attackCardClue('to deliver')).toBe('TO')
  })

  it('handles very short and empty meanings without crashing', () => {
    expect(attackCardClue('go')).toBe('GO')
    expect(attackCardClue('a')).toBe('A')
    expect(attackCardClue('')).toBe('??')
    expect(attackCardClue('   ')).toBe('??')
  })

  it('never renders the whole word for anything longer than two letters', () => {
    for (const word of ['Anxiety', 'school', 'water', 'consideration']) {
      expect(attackCardClue(word).length).toBe(2)
      expect(attackCardClue(word).toLowerCase()).not.toBe(word.toLowerCase())
    }
  })
})

describe('defense damage scaling', () => {
  it('runs from full damage at none correct to the reduced floor at all correct', () => {
    expect(defenseDamage(100, 0, 1)).toBe(100)
    expect(defenseDamage(100, 1, 1)).toBe(15)
    expect(defenseDamage(100, 1, 2)).toBeGreaterThan(defenseDamage(100, 2, 2))
  })
})
