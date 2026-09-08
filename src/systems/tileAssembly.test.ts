import { describe, it, expect } from 'vitest'
import { buildTileChallenge, granularityFor, segmentAnswer, assembledText } from './tileAssembly'
import { tileBalance } from '@/config/balance'

const seq = (vals: number[]) => { let i = 0; return () => vals[i++ % vals.length] }

describe('granularityFor', () => {
  it('always assembles Korean from syllables, whatever the mode', () => {
    expect(granularityFor('사과', 'korean', 'choice')).toBe('syllable')
    expect(granularityFor('사과', 'korean', 'spell')).toBe('syllable')
  })

  it('keeps an English answer whole in choice mode', () => {
    expect(granularityFor('apple', 'english', 'choice')).toBe('whole')
    expect(granularityFor('thank you', 'english', 'choice')).toBe('whole')
  })

  it('still spells out letter by letter in spell mode', () => {
    expect(granularityFor('apple', 'english', 'spell')).toBe('letter')
    expect(granularityFor('thank you', 'english', 'spell')).toBe('word')
  })

  it('defaults to choice, since spelling is the opt-in', () => {
    expect(granularityFor('apple', 'english')).toBe('whole')
  })
})

describe('segmentAnswer whole', () => {
  it('is one piece, spaces intact', () => {
    expect(segmentAnswer('thank you', 'whole')).toEqual(['thank you'])
  })

  it('yields nothing for an empty answer rather than a blank tile', () => {
    expect(segmentAnswer('   ', 'whole')).toEqual([])
  })
})

describe('buildTileChallenge in choice mode', () => {
  const pool = ['water', 'mountain', 'book', 'road', 'door', 'star']

  it('offers the answer as a single tile among whole decoys', () => {
    const b = buildTileChallenge('apple', 'english', pool, seq([0.1, 0.6, 0.3, 0.9, 0.45]), 'choice')
    expect(b.granularity).toBe('whole')
    expect(b.answerLength).toBe(1)
    expect(b.tiles.map((t) => t.text)).toContain('apple')
    for (const t of b.tiles) expect(t.text).not.toMatch(/^.$/)
  })

  it('offers the configured number of choices', () => {
    const b = buildTileChallenge('apple', 'english', pool, seq([0.2, 0.7, 0.4, 0.1]), 'choice')
    expect(b.tiles).toHaveLength(tileBalance.wholeAnswerChoices)
  })

  it('assembles back to exactly the answer', () => {
    const b = buildTileChallenge('thank you', 'english', pool, seq([0.3, 0.8]), 'choice')
    const correct = b.tiles.find((t) => t.text === 'thank you')!
    expect(assembledText([correct], b.joiner)).toBe('thank you')
  })

  it('never offers a decoy identical to the answer', () => {
    const b = buildTileChallenge('water', 'english', pool, seq([0.5, 0.2, 0.9, 0.1]), 'choice')
    expect(b.tiles.filter((t) => t.text === 'water')).toHaveLength(1)
  })

  it('still builds a usable board when there are no decoys to draw on', () => {
    // A run with one word must not produce an unanswerable prompt.
    const b = buildTileChallenge('apple', 'english', [], seq([0.5]), 'choice')
    expect(b.tiles.map((t) => t.text)).toEqual(['apple'])
    expect(b.answerLength).toBe(1)
  })

  it('leaves Korean prompts assembled from syllables', () => {
    const b = buildTileChallenge('사과', 'korean', ['물', '책'], seq([0.4, 0.7, 0.1]), 'choice')
    expect(b.granularity).toBe('syllable')
    expect(b.answerLength).toBe(2)
  })
})

describe('buildTileChallenge in spell mode', () => {
  it('behaves as it always did', () => {
    const b = buildTileChallenge('love', 'english', ['water', 'book'], seq([0.3, 0.6, 0.1, 0.8]), 'spell')
    expect(b.granularity).toBe('letter')
    expect(b.answerLength).toBe(4)
  })
})
