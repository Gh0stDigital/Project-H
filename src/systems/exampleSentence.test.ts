import { describe, it, expect } from 'vitest'
import { BLANK, maskExample } from './exampleSentence'

describe('masking a word out of its own example', () => {
  it('hides the word', () => {
    expect(maskExample('물을 마셨습니다.', ['물'])).toEqual({ text: `${BLANK}을 마셨습니다.`, safe: true })
  })

  it('hides every occurrence', () => {
    const r = maskExample('물, 그리고 또 물.', ['물'])
    expect(r.text).toBe(`${BLANK}, 그리고 또 ${BLANK}.`)
    expect(r.safe).toBe(true)
  })

  it('reports unsafe when the word never appears', () => {
    // An attack prompt asks for the Korean word, so a sentence this could
    // not mask would be the answer printed under the question.
    const r = maskExample('아무 관계 없는 문장입니다.', ['물'])
    expect(r.safe).toBe(false)
  })

  it('masks the longer form first so no syllable is left stranded', () => {
    const r = maskExample('불꽃이 불보다 밝다.', ['불', '불꽃'])
    expect(r.text).toBe(`${BLANK}이 ${BLANK}보다 밝다.`)
  })

  it('collapses blanks that end up side by side', () => {
    const r = maskExample('물물 마시기', ['물'])
    expect(r.text).toBe(`${BLANK} 마시기`)
  })

  it('takes alternative spellings too', () => {
    const r = maskExample('Hello there, hello again.', ['hello'])
    expect(r.text).toBe(`${BLANK} there, ${BLANK} again.`)
  })

  it('is safe with regex characters in the word', () => {
    const r = maskExample('(물) 한 잔', ['(물)'])
    expect(r.text).toBe(`${BLANK} 한 잔`)
    expect(r.safe).toBe(true)
  })

  it('says nothing about an empty sentence', () => {
    expect(maskExample('   ', ['물'])).toEqual({ text: '', safe: false })
    expect(maskExample('물을 마셨습니다.', []).safe).toBe(false)
  })
})
