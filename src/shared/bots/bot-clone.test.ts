import { describe, expect, it } from 'vitest'
import { cloneName, soulForName } from './bot-clone'

describe('soulForName', () => {
  it('renames the first heading and ends with one line break', () => {
    expect(
      soulForName('# Scout\r\nWatches releases.\r\n\r\n## Never\r\n- Merge.\r\n\r\n', 'Harbor')
    ).toBe('# Harbor\nWatches releases.\n\n## Never\n- Merge.\n')
  })

  it('drops front matter before looking for the heading', () => {
    expect(soulForName('---\nname: scout\ntags: [a]\n---\n\n# Scout\nWatches.', 'Harbor')).toBe(
      '# Harbor\nWatches.\n'
    )
  })

  it('puts the name in front when no heading opens the soul', () => {
    expect(soulForName('\n\nWatches releases.\n## How I work\n', 'Harbor')).toBe(
      '# Harbor\n\nWatches releases.\n## How I work\n'
    )
    // A level-one heading after the first five lines that have text is not the title.
    expect(soulForName('a\nb\nc\nd\ne\n# Late\n', 'Harbor')).toBe(
      '# Harbor\n\na\nb\nc\nd\ne\n# Late\n'
    )
  })
})

describe('cloneName', () => {
  it('counts up a name that ends in digits', () => {
    expect(cloneName('Architect#1', ['Architect#1'])).toBe('Architect#2')
    expect(cloneName('Bot 9', ['Bot 9'])).toBe('Bot 10')
  })

  it('numbers any other name from 2, past the names in use in any case', () => {
    expect(cloneName('Scout', ['Scout'])).toBe('Scout 2')
    expect(cloneName('Scout', ['Scout', 'scout 2'])).toBe('Scout 3')
  })

  it('cuts the stem so the name stays within 64 characters', () => {
    const long = 'H'.repeat(64)
    expect(cloneName(long, [long])).toBe(`${'H'.repeat(62)} 2`)
    expect(cloneName(`${'H'.repeat(63)}9`, [])).toBe(`${'H'.repeat(62)}10`)
  })
})
