import defaultWords from './words'
import adWords from './words/ads'
import politicsWords from './words/politics'
import pornWords from './words/porn'
import violenceWords from './words/violence'
import cultWords from './words/cult'
import abuseWords from './words/abuse'

export { AISensitiveWordDetector, DEFAULT_AI_SYSTEM_PROMPT } from './ai'
export type { AIDetectResult, AIClientConfig, CustomFetch } from './ai'

/** 默认干扰词字符集，包含空白字符、标点符号、特殊符号等 */
const defaultNoiseWords = ' \t\r\n~!@#$%^&*()_+-=【】、{}|;\':"，。、《》？αβγδεζηθικλμνξοπρστυφχψωΑΒΓΔΕΖΗΘΙΚΛΜΝΞΟΠΡΣΤΥΦΧΨΩ。，、；：？！…—·ˉ¨‘’“”々～‖∶＂＇｀｜〃〔〕〈〉《》「」『』．〖〗【】（）［］｛｝ⅠⅡⅢⅣⅤⅥⅦⅧⅨⅩⅪⅫ⒈⒉⒊⒋⒌⒍⒎⒏⒐⒑⒒⒓⒔⒕⒖⒗⒘⒙⒚⒛㈠㈡㈢㈣㈤㈥㈦㈧㈨㈩①②③④⑤⑥⑦⑧⑨⑩⑴⑵⑶⑷⑸⑹⑺⑻⑼⑽⑾⑿⒀⒁⒂⒃⒄⒅⒆⒇≈≡≠＝≤≥＜＞≮≯∷±＋－×÷／∫∮∝∞∧∨∑∏∪∩∈∵∴⊥∥∠⌒⊙≌∽√§№☆★○●◎◇◆□℃‰€■△▲※→←↑↓〓¤°＃＆＠＼︿＿￣―♂♀┌┍┎┐┑┒┓─┄┈├┝┞┟┠┡┢┣│┆┊┬┭┮┯┰┱┲┳┼┽┾┿╀╁╂╃└┕┖┗┘┙┚┛━┅┉┤┥┦┧┨┩┪┫┃┇┋┴┵┶┷┸┹┺┻╋╊╉╈╇╆╅╄'

/**
 * 敏感词检测类型
 * - `politics`  政治敏感
 * - `ads`       广告
 * - `porn`      色情
 * - `violence`  暴恐
 * - `cult`      邪教
 * - `abuse`     辱骂
 */
export type DetectType = 'politics' | 'ads' | 'porn' | 'violence' | 'cult' | 'abuse'

/**
 * 敏感词分类词库映射表
 * 用于根据 detectType 快速查找对应词库
 */
const detectTypeWordMap: Record<DetectType, string[]> = {
  politics: politicsWords,
  ads: adWords,
  porn: pornWords,
  violence: violenceWords,
  cult: cultWords,
  abuse: abuseWords,
}

/**
 * FilterSensitiveWord 构造函数可选项
 */
interface FilterOptions {
  /**
   * 用户自定义敏感词列表
   * @default []
   */
  words?: string[]
  /**
   * 是否启用默认词库
   * @default true
   */
  useDefaultWords?: boolean
  /**
   * 启用默认词库时，指定要检测的敏感词类型
   * 不传则启用全部类型：politics、ads、porn、violence、cult、abuse
   * 传入空数组则不加载任何内置分类
   * @default ['politics', 'ads', 'porn', 'violence', 'cult', 'abuse']
   */
  detectTypes?: DetectType[]
  /**
   * 自定义干扰词字符集
   * 默认为内置的 defaultNoiseWords
   */
  noiseWords?: string
}

/**
 * Trie 树节点
 */
interface TrieNode {
  /** 子节点映射，key 为字符，value 为子节点 */
  children: Map<string, TrieNode>
  /** 从根到当前节点的路径是否构成一个完整的敏感词 */
  isEnd: boolean
}

/**
 * 敏感词过滤器
 *
 * 基于 DFA（Trie 树）实现敏感词的高效匹配，支持：
 * - 干扰词跳过（防止用户用特殊字符绕过检测）
 * - 忽略大小写匹配
 * - 最长匹配优先的过滤替换
 *
 * @example
 * ```ts
 * // 使用默认词库和默认干扰词
 * const filter = new FilterSensitiveWord()
 *
 * // 仅启用政治和广告检测
 * const filter = new FilterSensitiveWord({
 *   detectTypes: ['politics', 'ads']
 * })
 *
 * // 仅使用自定义词库
 * const filter = new FilterSensitiveWord({
 *   useDefaultWords: false,
 *   words: ['敏感词1', '敏感词2']
 * })
 * ```
 */
export class FilterSensitiveWord {
  /** Trie 树根节点 */
  private root: TrieNode
  /** 干扰词字符集合，用于快速 O(1) 判断 */
  private noiseSet: Set<string>
  /**
   * 已登记的原文。key 是大小写折叠后的词，value 是首次写入的原文。
   * `setNoiseWords` 会按当前干扰词重新归一化这些原文。
   */
  private vocabulary = new Map<string, string>()
  /** 归一化词条的引用计数。两条原文可能落到同一条路径，删除一条时不能拆掉另一条。 */
  private tokenRefs = new Map<string, number>()

  /**
   * 创建敏感词过滤器实例
   *
   * @param options - 配置选项
   * @param options.words - 用户自定义追加的敏感词
   * @param options.useDefaultWords - 是否启用默认词库，默认 true
   * @param options.detectTypes - 启用默认词库时指定检测类型，不传则全部启用；空数组表示不加载内置分类
   * @param options.noiseWords - 自定义干扰词字符集
   */
  constructor(options: FilterOptions = {}) {
    const { words = [], useDefaultWords = true, detectTypes, noiseWords } = options

    // 初始化空的 Trie 树根节点
    this.root = { children: new Map(), isEnd: false }
    // 设置干扰词集，优先使用用户自定义的，否则使用默认干扰词
    this.noiseSet = new Set(noiseWords ?? defaultNoiseWords)

    if (useDefaultWords) {
      if (detectTypes) {
        // 调用方显式传入的分类，空数组表示一个内置分类都不加载
        for (const type of detectTypes) {
          const list = detectTypeWordMap[type]
          if (list) this.addWords(list)
        }
      } else {
        // 未指定类型时加载全部默认词库
        this.addWords(defaultWords)
      }
    }

    // 追加用户自定义敏感词
    if (words.length > 0) {
      this.addWords(words)
    }
  }

  /**
   * 批量添加敏感词到词库
   *
   * 入库前会去掉干扰字符。去掉后仍至少有两个有效字符时，按这些字符建词，
   * 因此词条里的空格和标点不会再让这个词永远匹配不到。
   * 如果去掉干扰字符后只剩一个有效字符，则丢弃该词，避免被遮挡的词退化成单字。
   * 本身就是单字、且不含干扰字符的词会保留。
   *
   * @param words - 敏感词数组
   *
   * @example
   * ```ts
   * filter.addWords(['新词汇1', '新词汇2'])
   * ```
   */
  addWords(words: string[]): void {
    for (const word of words) {
      if (!word) continue
      const { id, tokens } = this.classify(word)
      if (this.vocabulary.has(id)) continue
      this.vocabulary.set(id, word)
      if (tokens) this.retain(tokens)
    }
  }

  /**
   * 从词库中移除敏感词
   *
   * 只取消被移除词本身的结束标记。更长的词、以及作为前缀单独入库的更短词都会保留。
   * 词不在库中时不做任何事。
   *
   * @param words - 要移除的敏感词数组
   *
   * @example
   * ```ts
   * filter.removeWords(['旧词汇'])
   * ```
   */
  removeWords(words: string[]): void {
    for (const word of words) {
      if (!word) continue
      const { id, tokens } = this.classify(word)
      if (!this.vocabulary.has(id)) continue
      this.vocabulary.delete(id)
      if (tokens) this.release(tokens)
    }
  }

  /**
   * 设置干扰词字符集
   *
   * 干扰词是指在敏感词匹配过程中会被自动跳过忽略的字符，
   * 防止用户通过插入特殊字符来绕过敏感词检测。
   *
   * @param noiseWords - 干扰词字符串，每个字符为一个干扰词
   *
   * 干扰词变化后会按新字符集重建词库，已添加的词会重新归一化。
   *
   * @example
   * ```ts
   * filter.setNoiseWords(' \t!@#$%')
   * ```
   */
  setNoiseWords(noiseWords: string): void {
    this.noiseSet = new Set(noiseWords)
    this.rebuild()
  }

  /**
   * 检测文本中是否包含任何敏感词
   *
   * 遍历文本的每个字符作为起点，在 Trie 树中查找匹配路径，
   * 匹配过程中自动跳过干扰词。
   *
   * @param text - 待检测的文本
   * @returns 是否包含敏感词
   *
   * @example
   * ```ts
   * filter.hasSensitive('这是正常文本')  // false
   * filter.hasSensitive('这是兼职广告')  // true
   * filter.hasSensitive('兼  职')       // true，空格被当作干扰词跳过
   * ```
   */
  hasSensitive(text: string): boolean {
    if (!text) return false

    const units = this.scan(text)
    for (let i = 0; i < units.length; i++) {
      if (units[i].noise) continue
      let node: TrieNode = this.root
      for (let j = i; j < units.length; j++) {
        if (units[j].noise) continue
        const child = node.children.get(units[j].lower)
        if (!child) break
        node = child
        if (node.isEnd) return true
      }
    }
    return false
  }

  /**
   * 过滤文本中的敏感词，将其替换为指定字符
   *
   * 采用最长匹配优先策略：当从某位置出发存在多个匹配时，取最长的那个。
   * 相邻或重叠的匹配区间会被合并，避免替换字符叠加。
   *
   * @param text - 待过滤的文本
   * @param replacement - 替换字符，默认为 '*'
   * @returns 过滤后的文本
   *
   * @example
   * ```ts
   * filter.filter('这是兼职广告')            // '这是**广告'
   * filter.filter('敏感词', '#')             // '###'
   * filter.filter('兼 职', '*')              // '***'，空格为干扰词也会被替换
   * ```
   */
  filter(text: string, replacement: string = '*'): string {
    if (!text) return ''

    const units = this.scan(text)
    const matches: Array<{ start: number; end: number }> = []

    for (let i = 0; i < units.length; i++) {
      if (units[i].noise) continue
      let node: TrieNode = this.root
      let lastMatchEnd = -1
      for (let j = i; j < units.length; j++) {
        if (units[j].noise) continue
        const child = node.children.get(units[j].lower)
        if (!child) break
        node = child
        if (node.isEnd) lastMatchEnd = units[j].end
      }
      if (lastMatchEnd > units[i].index) {
        matches.push({ start: units[i].index, end: lastMatchEnd })
      }
    }

    const merged = this.mergeMatches(matches)
    if (merged.length === 0) return text

    // 按码点替换，避免 emoji 等补充平面字符把下标和字符数组错位
    let out = ''
    let cursor = 0
    for (const { start, end } of merged) {
      out += text.slice(cursor, start)
      out += this.mask(text.slice(start, end), replacement)
      cursor = end
    }
    out += text.slice(cursor)
    return out
  }

  /**
   * 查找文本中所有匹配的敏感词（去干扰词后的纯净文本）
   *
   * @param text - 待查找的文本
   * @returns 匹配到的敏感词数组，可能包含重复项
   *
   * @example
   * ```ts
   * filter.findAll('这是兼职广告')  // ['兼职']
   * filter.findAll('兼*职')         // ['兼职']，* 作为干扰词被过滤掉
   * ```
   */
  findAll(text: string): string[] {
    if (!text) return []

    const units = this.scan(text)
    const result: string[] = []

    for (let i = 0; i < units.length; i++) {
      if (units[i].noise) continue
      let node: TrieNode = this.root
      const matchedChars: string[] = []
      let lastMatch: string | null = null
      for (let j = i; j < units.length; j++) {
        if (units[j].noise) continue
        const child = node.children.get(units[j].lower)
        if (!child) break
        node = child
        matchedChars.push(units[j].char)
        if (node.isEnd) lastMatch = matchedChars.join('')
      }
      if (lastMatch) result.push(lastMatch)
    }

    return result
  }

  /** 把文本拆成码点，并标出干扰字符。lower 与入库时的 token 使用同一种折叠。 */
  private scan(text: string): Array<{ char: string; lower: string; index: number; end: number; noise: boolean }> {
    const units: Array<{ char: string; lower: string; index: number; end: number; noise: boolean }> = []
    for (let i = 0; i < text.length; ) {
      const codePoint = text.codePointAt(i)!
      const char = String.fromCodePoint(codePoint)
      const end = i + char.length
      units.push({
        char,
        lower: char.toLowerCase(),
        index: i,
        end,
        noise: this.noiseSet.has(char),
      })
      i = end
    }
    return units
  }

  /** 每个码点替换成一份 replacement，BMP 文本与按码元逐个替换的结果一致。 */
  private mask(slice: string, replacement: string): string {
    let count = 0
    for (const _char of slice) count++
    return replacement.repeat(count)
  }

  /**
   * 折叠大小写，并去掉干扰字符。
   * 干扰字符被去掉后不足两个有效字符时不入库，避免遮挡词退化成单字。
   */
  private classify(word: string): { id: string; tokens: string[] | null } {
    let id = ''
    const significant: string[] = []
    let droppedNoise = false
    for (const char of word) {
      const lower = char.toLowerCase()
      id += lower
      if (this.noiseSet.has(char)) {
        droppedNoise = true
        continue
      }
      significant.push(lower)
    }
    if (significant.length >= 2) return { id, tokens: significant }
    if (significant.length === 1 && !droppedNoise) return { id, tokens: significant }
    return { id, tokens: null }
  }

  private tokenKey(tokens: string[]): string {
    return JSON.stringify(tokens)
  }

  private retain(tokens: string[]): void {
    const key = this.tokenKey(tokens)
    const count = this.tokenRefs.get(key) ?? 0
    this.tokenRefs.set(key, count + 1)
    if (count === 0) this.insertTokens(tokens)
  }

  private release(tokens: string[]): void {
    const key = this.tokenKey(tokens)
    const count = this.tokenRefs.get(key) ?? 0
    if (count <= 1) {
      this.tokenRefs.delete(key)
      this.removeTokens(tokens)
      return
    }
    this.tokenRefs.set(key, count - 1)
  }

  private rebuild(): void {
    this.root = { children: new Map(), isEnd: false }
    this.tokenRefs.clear()
    for (const word of this.vocabulary.values()) {
      const { tokens } = this.classify(word)
      if (tokens) this.retain(tokens)
    }
  }

  private insertTokens(tokens: string[]): void {
    let node = this.root
    for (const token of tokens) {
      let child = node.children.get(token)
      if (!child) {
        child = { children: new Map(), isEnd: false }
        node.children.set(token, child)
      }
      node = child
    }
    node.isEnd = true
  }

  private removeTokens(tokens: string[]): void {
    const path: TrieNode[] = [this.root]
    for (const token of tokens) {
      const next = path[path.length - 1].children.get(token)
      if (!next) return
      path.push(next)
    }

    const end = path[path.length - 1]
    if (!end.isEnd) return
    end.isEnd = false

    for (let i = path.length - 1; i > 0; i--) {
      const node = path[i]
      if (node.isEnd || node.children.size > 0) break
      path[i - 1].children.delete(tokens[i - 1])
    }
  }

  /**
   * 合并重叠和相邻的匹配区间（内部方法）
   *
   * 先将区间按 start 升序排列，然后遍历合并：
   * 如果当前区间的 start ≤ 上一个区间的 end，则合并。
   */
  private mergeMatches(matches: Array<{ start: number; end: number }>): Array<{ start: number; end: number }> {
    if (matches.length === 0) return []

    // 按起始位置升序排列
    const sorted = matches.sort((a, b) => a.start - b.start)
    const merged: Array<{ start: number; end: number }> = [sorted[0]]

    for (let i = 1; i < sorted.length; i++) {
      const last = merged[merged.length - 1]
      if (sorted[i].start <= last.end) {
        // 区间重叠或相邻，扩展上一个区间的结束位置
        last.end = Math.max(last.end, sorted[i].end)
      } else {
        // 区间不重叠，新增一个独立区间
        merged.push(sorted[i])
      }
    }

    return merged
  }
}

export { defaultWords, adWords, politicsWords, pornWords, violenceWords, cultWords, abuseWords }
export type { FilterOptions }
