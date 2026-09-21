import { describe, it, expect } from 'vitest'
import { BLANK, maskExample, spellForms } from './exampleSentence'

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

describe('which spellings to look for', () => {
  const entry = (over: Partial<Parameters<typeof spellForms>[0]> = {}) => ({
    korean: '먹다',
    altKorean: [],
    derivedVerb: '',
    presentForm: '',
    pastForm: '',
    futureForm: '',
    ...over,
  })

  it('offers the stem of a dictionary form', () => {
    // The reason examples were not showing. Korean sentences contain 먹어요
    // and 먹습니다, never 먹다, so matching only the entry meant matching
    // nothing — and an unmatched sentence is a hidden sentence.
    expect(spellForms(entry())).toContain('먹')
  })

  it('finds the word in a conjugated sentence', () => {
    const r = maskExample('밥을 먹습니다.', spellForms(entry()))
    expect(r.safe).toBe(true)
    expect(r.text).toBe(`밥을 ${BLANK}습니다.`)
  })

  it('prefers a stored conjugation over the stem', () => {
    // Longest first, so the whole conjugation is taken out rather than its
    // first syllable, which would leave the ending stranded beside a blank.
    const r = maskExample('밥을 먹어요.', spellForms(entry({ presentForm: '먹어요' })))
    expect(r.text).toBe(`밥을 ${BLANK}.`)
  })

  it('gathers every spelling the entry stores', () => {
    const forms = spellForms(
      entry({ altKorean: ['잡수시다'], pastForm: '먹었어요', futureForm: '먹을 거예요' }),
    )
    for (const f of ['먹다', '잡수시다', '먹었어요', '먹을 거예요']) expect(forms).toContain(f)
  })

  it('does not offer a stem that would match half the sentence', () => {
    // 다 alone, from a one-character entry, would blank every sentence
    // ending in it.
    expect(spellForms(entry({ korean: '다' }))).not.toContain('')
    expect(spellForms(entry({ korean: '다' }))).toEqual(['다'])
  })

  it('still cannot find a word that contraction swallowed', () => {
    // 크다 becomes 큽니다 and no prefix of the entry survives. Hiding the
    // sentence is right here: the alternative is printing the answer.
    const r = maskExample('집이 아주 큽니다.', spellForms(entry({ korean: '크다' })))
    expect(r.safe).toBe(false)
  })
})
