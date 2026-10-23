import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  AISensitiveWordDetector,
  DEFAULT_AI_SYSTEM_PROMPT,
  FilterSensitiveWord,
  type AIDetectResult,
} from '../src/index'

function customFilter(words: string[], noiseWords?: string) {
  return new FilterSensitiveWord({
    useDefaultWords: false,
    words,
    noiseWords,
  })
}

function jsonBlocks(text: string): unknown[] {
  return [...text.matchAll(/\{[^{}]*\}/g)].map((match) => JSON.parse(match[0]))
}

describe('FilterSensitiveWord', () => {
  it('hasSensitive matches case-insensitively and ignores empty input', () => {
    const filter = customFilter(['AbC'])

    assert.equal(filter.hasSensitive(''), false)
    assert.equal(filter.hasSensitive('zzz'), false)
    assert.equal(filter.hasSensitive('abc'), true)
    assert.equal(filter.hasSensitive('xABCy'), true)
  })

  it('filter replaces the longest match and leaves the rest', () => {
    const filter = customFilter(['ab', 'abcd'])

    assert.equal(filter.filter(''), '')
    assert.equal(filter.filter('zzzz'), 'zzzz')
    assert.equal(filter.filter('xxabcdyy'), 'xx****yy')
    assert.equal(filter.filter('ab', '#'), '##')
    assert.deepEqual(filter.findAll('xxabcdyy'), ['abcd'])
    assert.deepEqual(filter.findAll('nope'), [])
  })

  it('findAll reports the longest hit at each start and keeps original case', () => {
    const filter = customFilter(['aa', 'aaa', 'AbC'])

    assert.deepEqual(filter.findAll(''), [])
    assert.deepEqual(filter.findAll('aaaa'), ['aaa', 'aaa', 'aa'])
    assert.equal(filter.filter('aaaa'), '****')
    assert.deepEqual(filter.findAll('xABCy'), ['ABC'])
  })

  it('skips noise words while matching, replacing, and listing hits', () => {
    const filter = customFilter(['ab', 'cd'], ' *')

    assert.equal(filter.hasSensitive('a * b'), true)
    assert.equal(filter.filter('a * b'), '*****')
    assert.deepEqual(filter.findAll('a * b'), ['ab'])
    assert.equal(filter.filter('abXcd'), '**X**')
    assert.deepEqual(filter.findAll('a*b X c d'), ['ab', 'cd'])

    filter.setNoiseWords('')
    assert.equal(filter.hasSensitive('a * b'), false)
    assert.equal(filter.hasSensitive('ab'), true)
  })

  it('addWords and removeWords update the trie without dropping related words', () => {
    const filter = new FilterSensitiveWord({ useDefaultWords: false })

    assert.equal(filter.hasSensitive('foo'), false)
    filter.addWords(['foo', '', 'Bar', 'foobar'])
    assert.equal(filter.hasSensitive('FOO'), true)
    assert.equal(filter.hasSensitive('bar'), true)
    // 同一起点取最长词 foobar；后面的起点仍能命中 bar
    assert.deepEqual(filter.findAll('foobar'), ['foobar', 'bar'])

    filter.removeWords(['foo', 'missing'])
    assert.equal(filter.hasSensitive('foo'), false)
    assert.equal(filter.hasSensitive('foobar'), true)
    assert.equal(filter.hasSensitive('bar'), true)
    assert.deepEqual(filter.findAll('foobar'), ['foobar', 'bar'])

    filter.removeWords(['BAR'])
    assert.equal(filter.hasSensitive('bar'), false)
    assert.deepEqual(filter.findAll('foobar'), ['foobar'])

    const branched = customFilter(['ab', 'ac'])
    branched.removeWords(['ab'])
    assert.equal(branched.hasSensitive('ab'), false)
    assert.equal(branched.hasSensitive('ac'), true)

    const prefixed = customFilter(['ab', 'abcd'])
    prefixed.removeWords(['abcd'])
    assert.equal(prefixed.hasSensitive('ab'), true)
    assert.equal(prefixed.filter('abcd'), '**cd')
    assert.deepEqual(prefixed.findAll('abcd'), ['ab'])
  })

  it('does not load built-in categories when detectTypes is empty', () => {
    const filter = new FilterSensitiveWord({ detectTypes: [], words: ['abc'] })

    assert.equal(filter.hasSensitive('兼职'), false)
    assert.equal(filter.hasSensitive('abc'), true)
    assert.equal(new FilterSensitiveWord({ detectTypes: [] }).hasSensitive('兼职'), false)
  })

  it('strips noise inside words without collapsing a masked word into one character', () => {
    const filter = customFilter(['a*b', 'ab', 'q*', 'x'])

    assert.equal(filter.hasSensitive('ab'), true)
    assert.equal(filter.hasSensitive('a*b'), true)
    assert.deepEqual(filter.findAll('a*b'), ['ab'])
    assert.equal(filter.hasSensitive('q'), false)
    assert.equal(filter.hasSensitive('q*'), false)
    assert.equal(filter.hasSensitive('x'), true)

    filter.removeWords(['ab'])
    assert.equal(filter.hasSensitive('ab'), true)
    filter.removeWords(['A*B'])
    assert.equal(filter.hasSensitive('ab'), false)
    assert.equal(filter.hasSensitive('x'), true)
  })

  it('rebuilds the trie when the noise set changes', () => {
    const filter = customFilter(['a*b'])

    assert.equal(filter.hasSensitive('ab'), true)
    filter.setNoiseWords('')
    assert.equal(filter.hasSensitive('ab'), false)
    assert.equal(filter.hasSensitive('a*b'), true)
    assert.equal(filter.filter('a*b'), '***')

    const masked = customFilter(['q*'])
    assert.equal(masked.hasSensitive('q'), false)
    masked.setNoiseWords('')
    assert.equal(masked.hasSensitive('q*'), true)
    assert.equal(masked.hasSensitive('q'), false)
  })

  it('filters by code point so a non-BMP character keeps its place', () => {
    const filter = customFilter(['ab'])

    assert.equal(filter.hasSensitive('😀ab'), true)
    assert.equal(filter.filter('😀ab'), '😀**')
    assert.deepEqual(filter.findAll('😀ab'), ['ab'])

    const emoji = customFilter(['a😀b', 'İ'], '')
    assert.equal(emoji.hasSensitive('a😀b'), true)
    assert.equal(emoji.filter('a😀b'), '***')
    assert.deepEqual(emoji.findAll('xa😀by'), ['a😀b'])
    assert.equal(emoji.hasSensitive('İ'), true)
    assert.equal(emoji.filter('İ'), '*')
  })

  it('matches built-in phrases that contain separators and keeps one-character words', () => {
    const violence = new FilterSensitiveWord({ detectTypes: ['violence'] })
    assert.equal(violence.hasSensitive('转让 猎枪'), true)
    assert.equal(violence.hasSensitive('转让猎枪'), true)
    assert.deepEqual(violence.findAll('转让 猎枪'), ['转让猎枪'])

    const abuse = new FilterSensitiveWord({ detectTypes: ['abuse'] })
    assert.equal(abuse.hasSensitive('傻'), false)
    assert.equal(abuse.hasSensitive('傻×'), false)
    assert.equal(abuse.hasSensitive('傻逼'), true)
    assert.equal(abuse.hasSensitive('傻×逼'), true)
    assert.equal(abuse.hasSensitive('屌'), true)
  })

  it('loads the ads dictionary only when that detect type is enabled', () => {
    const ads = new FilterSensitiveWord({ detectTypes: ['ads'] })
    const custom = new FilterSensitiveWord({ useDefaultWords: false })

    const all = new FilterSensitiveWord()
    assert.equal(all.hasSensitive('这是正常文本'), false)

    assert.equal(ads.hasSensitive('这是兼职广告'), true)
    assert.equal(ads.hasSensitive('兼  职'), true)
    assert.equal(ads.filter('兼职'), '**')
    assert.deepEqual(ads.findAll('兼*职'), ['兼职'])
    assert.equal(custom.hasSensitive('这是兼职广告'), false)
  })
})

describe('DEFAULT_AI_SYSTEM_PROMPT', () => {
  it('embeds parseable JSON examples whose matchedWords are arrays', () => {
    const blocks = jsonBlocks(DEFAULT_AI_SYSTEM_PROMPT)

    assert.equal(blocks.length, 2)
    for (const block of blocks) {
      assert.ok(block && typeof block === 'object')
      const matchedWords = (block as { matchedWords?: unknown }).matchedWords
      assert.ok(Array.isArray(matchedWords))
    }

    const [hit, clean] = blocks as Array<{
      isSensitive: boolean
      categories: string[]
      matchedWords: string[]
      riskLevel: string
    }>
    assert.equal(hit.isSensitive, true)
    assert.deepEqual(hit.categories, ['ads', 'abuse'])
    assert.deepEqual(hit.matchedWords, ['命中的具体词汇1', '命中的具体词汇2'])
    assert.equal(hit.riskLevel, 'medium')
    assert.equal(clean.isSensitive, false)
    assert.deepEqual(clean.matchedWords, [])
    assert.deepEqual(clean.categories, [])
  })
})

describe('AISensitiveWordDetector', () => {
  it('requires apiKey or customFetch', () => {
    assert.throws(() => new AISensitiveWordDetector({}), /apiKey|customFetch/)
  })

  it('returns an empty result without calling fetch when text is empty', async () => {
    let calls = 0
    const ai = new AISensitiveWordDetector({
      customFetch: {
        fetch: async () => {
          calls += 1
          return ''
        },
      },
    })

    const result = await ai.detect('')
    assert.equal(calls, 0)
    assert.deepEqual(result, {
      isSensitive: false,
      categories: [],
      matchedWords: [],
      riskLevel: 'low',
      reason: '输入文本为空',
      confidence: 1,
    })
  })

  it('parses matchedWords from an array, a fenced payload, and the legacy string form', async () => {
    const payloads = [
      JSON.stringify({
        isSensitive: true,
        categories: ['ads', 'not-a-category'],
        matchedWords: ['词汇1', '词汇2'],
        riskLevel: 'high',
        reason: '命中',
        confidence: 1.4,
      }),
      '```json\n{"isSensitive":true,"categories":["abuse"],"matchedWords":["词"],"riskLevel":"low","reason":"","confidence":-1}\n```',
      {
        choices: [
          {
            message: {
              content: JSON.stringify({
                isSensitive: true,
                categories: ['porn'],
                matchedWords: '"甲", "乙"',
                riskLevel: 'medium',
                reason: '历史格式',
                confidence: 0.5,
              }),
            },
          },
        ],
      },
    ]

    const results: AIDetectResult[] = []
    for (const payload of payloads) {
      const ai = new AISensitiveWordDetector({
        customFetch: {
          fetch: async () => payload,
        },
      })
      results.push((await ai.detect('待检测')) as AIDetectResult)
    }

    assert.deepEqual(results[0].matchedWords, ['词汇1', '词汇2'])
    assert.deepEqual(results[0].categories, ['ads'])
    assert.equal(results[0].confidence, 1)
    assert.equal(results[0].riskLevel, 'high')

    assert.deepEqual(results[1].matchedWords, ['词'])
    assert.deepEqual(results[1].categories, ['abuse'])
    assert.equal(results[1].confidence, 0)

    assert.deepEqual(results[2].matchedWords, ['甲', '乙'])
    assert.equal(results[2].reason, '历史格式')
  })

  it('parses string booleans, a braced reason, and numeric strings', async () => {
    const ai = new AISensitiveWordDetector({
      customFetch: {
        fetch: async () =>
          '说明 {"isSensitive":"false","categories":[],"matchedWords":[],"riskLevel":"LOW","reason":"因为 } 在字符串里","confidence":"0.25"} 尾部 }',
      },
    })

    const result = (await ai.detect('待检测')) as AIDetectResult
    assert.equal(result.isSensitive, false)
    assert.equal(result.riskLevel, 'low')
    assert.equal(result.reason, '因为 } 在字符串里')
    assert.equal(result.confidence, 0.25)
  })

  it('reads array content from a direct chat completion and strips a trailing baseURL slash', async () => {
    const original = globalThis.fetch
    const calls: string[] = []
    globalThis.fetch = (async (input: RequestInfo | URL) => {
      calls.push(String(input))
      const body = JSON.stringify({
        isSensitive: true,
        categories: ['ads'],
        matchedWords: ['词'],
        riskLevel: 'high',
        reason: '分段',
        confidence: 2,
      })
      return new Response(
        JSON.stringify({
          choices: [{ message: { content: [{ type: 'text', text: body }] } }],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      )
    }) as typeof fetch

    try {
      const ai = new AISensitiveWordDetector({
        apiKey: 'sk-test',
        baseURL: 'https://example.test/v1/',
      })
      const result = (await ai.detect('hello')) as AIDetectResult
      assert.equal(calls[0], 'https://example.test/v1/chat/completions')
      assert.equal(result.isSensitive, true)
      assert.deepEqual(result.matchedWords, ['词'])
      assert.equal(result.confidence, 1)
    } finally {
      globalThis.fetch = original
    }
  })

  it('returns the raw response when a custom system prompt is set', async () => {
    const raw = { ok: true }
    const ai = new AISensitiveWordDetector({
      systemPrompt: '自定义',
      customFetch: {
        fetch: async () => raw,
      },
    })

    assert.equal(await ai.detect('文本'), raw)
  })
})
