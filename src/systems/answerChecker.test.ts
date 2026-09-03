import { describe, expect, it } from 'vitest'
import { checkAnswer, normalize } from './answerChecker'

const eng = (submitted: string, ...acceptable: string[]) => checkAnswer(submitted, acceptable, 'english')
const kor = (submitted: string, ...acceptable: string[]) => checkAnswer(submitted, acceptable, 'korean')

describe('answer normalization', () => {
  it('ignores capitalization for English', () => {
    expect(eng('To Deliver', 'to deliver')).toBe(true)
    expect(eng('HELLO', 'hello')).toBe(true)
  })

  it('ignores leading and trailing spaces', () => {
    expect(eng('   hello   ', 'hello')).toBe(true)
    expect(kor('  학교  ', '학교')).toBe(true)
  })

  it('ignores repeated spaces', () => {
    expect(eng('thank    you', 'thank you')).toBe(true)
    expect(eng('thank you', 'thank    you')).toBe(true)
  })

  it('ignores basic punctuation on either side', () => {
    expect(eng('hello!', 'hello')).toBe(true)
    expect(eng('hello', 'hello.')).toBe(true)
    expect(eng('for no reason...', 'for no reason')).toBe(true)
    expect(eng("don't worry", 'dont worry')).toBe(true)
    expect(kor('괜히 걱정했어요.', '괜히 걱정했어요')).toBe(true)
  })

  it('treats a leading "to" as optional on English verbs, in both directions', () => {
    expect(eng('deliver', 'to deliver')).toBe(true)
    expect(eng('to deliver', 'deliver')).toBe(true)
    expect(eng('To Convey', 'to convey')).toBe(true)
  })

  it('only strips a standalone leading "to"', () => {
    // "tomato" must not become "mato" and match something else.
    expect(eng('tomato', 'mato')).toBe(false)
    expect(eng('together', 'gether')).toBe(false)
  })

  it('does not strip "to" from Korean answers', () => {
    expect(kor('to 학교', '학교')).toBe(false)
  })

  it('still accepts a tile-assembled answer with no spaces', () => {
    // Syllable tiles carry no spaces, so this is what the board produces.
    expect(kor('안녕히가세요', '안녕히 가세요')).toBe(true)
    expect(eng('thankyou', 'thank you')).toBe(true)
  })

  it('normalize() is idempotent', () => {
    const once = normalize('  To   Deliver!  ', 'english')
    expect(normalize(once, 'english')).toBe(once)
    expect(once).toBe('to deliver')
  })
})

describe('answer strictness', () => {
  it('rejects an empty submission', () => {
    expect(eng('', 'hello')).toBe(false)
    expect(eng('   ', 'hello')).toBe(false)
    expect(eng('...', 'hello')).toBe(false)
  })

  it('rejects when there are no acceptable answers', () => {
    expect(eng('hello')).toBe(false)
    expect(eng('hello', '', '  ')).toBe(false)
  })

  it('does not accept a loose paraphrase', () => {
    // Nothing here does semantic matching — only the stored answers count.
    expect(eng('to hand over', 'to deliver', 'to convey')).toBe(false)
    expect(eng('school building', 'school')).toBe(false)
    expect(eng('deliverance', 'to deliver')).toBe(false)
  })

  it('accepts any populated definition, and ignores blank ones', () => {
    const definitions = ['to deliver', 'to convey', 'to pass along']
    for (const d of definitions) expect(eng(d, ...definitions)).toBe(true)
    // A blank optional definition must never become a matchable answer.
    expect(eng('', 'review', '', '')).toBe(false)
    expect(eng('review', 'review', '', '')).toBe(true)
  })
})
