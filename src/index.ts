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
   * 创建敏感词过滤器实例
   *
   * @param options - 配置选项
   * @param options.words - 用户自定义追加的敏感词
   * @param options.useDefaultWords - 是否启用默认词库，默认 true
   * @param options.detectTypes - 启用默认词库时指定检测类型，不传则全部启用
   * @param options.noiseWords - 自定义干扰词字符集
   */
  constructor(options: FilterOptions = {}) {
    const { words = [], useDefaultWords = true, detectTypes, noiseWords } = options

    // 初始化空的 Trie 树根节点
    this.root = { children: new Map(), isEnd: false }
    // 设置干扰词集，优先使用用户自定义的，否则使用默认干扰词
    this.noiseSet = new Set(noiseWords ?? defaultNoiseWords)

    if (useDefaultWords) {
      if (detectTypes && detectTypes.length > 0) {
        // 根据指定类型按需加载词库
        for (const type of detectTypes) {
          if (detectTypeWordMap[type]) {
            this.addWords(detectTypeWordMap[type])
          }
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
      this.insert(word)
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
   * @example
   * ```ts
   * filter.setNoiseWords(' \t!@#$%')
   * ```
   */
  setNoiseWords(noiseWords: string): void {
    this.noiseSet = new Set(noiseWords)
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

    const len = text.length
    // 外层循环：以每个非干扰词字符为起点尝试匹配
    for (let i = 0; i < len; i++) {
      if (this.noiseSet.has(text[i])) continue
      let node: TrieNode = this.root
      // 内层循环：从起点向后逐字符在 Trie 树中前进
      for (let j = i; j < len; j++) {
        // 干扰词直接跳过，不参与 Trie 匹配
        if (this.noiseSet.has(text[j])) continue
        const child = node.children.get(text[j].toLowerCase())
        if (!child) break // 当前字符不在 Trie 中，退出内层循环
        node = child
        if (node.isEnd) return true // 找到完整敏感词，立即返回
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
   * filter.filter('这是兼职广告')            // '这是****'
   * filter.filter('敏感词', '#')             // '###'
   * filter.filter('兼 职', '*')              // '***'，空格为干扰词也会被替换
   * ```
   */
  filter(text: string, replacement: string = '*'): string {
    if (!text) return ''

    // 收集所有匹配到的敏感词区间 [start, end)
    const matches: Array<{ start: number; end: number }> = []
    const len = text.length

    for (let i = 0; i < len; i++) {
      // 跳过干扰词起始位置
      if (this.noiseSet.has(text[i])) continue
      let node: TrieNode = this.root
      let j = i
      let lastMatchEnd = -1 // 记录当前起点下能匹配到的最远结束位置
      while (j < len) {
        if (this.noiseSet.has(text[j])) {
          j++
          continue
        }
        const child = node.children.get(text[j].toLowerCase())
        if (!child) break
        node = child
        j++
        if (node.isEnd) {
          lastMatchEnd = j // 记录匹配终点，继续向后寻找更长匹配
        }
      }
      if (lastMatchEnd > 0) {
        matches.push({ start: i, end: lastMatchEnd })
      }
    }

    // 合并重叠和相邻的匹配区间
    const merged = this.mergeMatches(matches)
    if (merged.length === 0) return text

    // 用替换字符覆盖匹配区间内的所有字符（包括干扰词）
    const chars = [...text]
    for (const { start, end } of merged) {
      for (let k = start; k < end; k++) {
        chars[k] = replacement
      }
    }
    return chars.join('')
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

    const result: string[] = []
    const len = text.length

    for (let i = 0; i < len; i++) {
      if (this.noiseSet.has(text[i])) continue
      let node: TrieNode = this.root
      const matchedChars: string[] = [] // 当前路径上匹配到的所有字符（含干扰词）
      let lastMatch: string | null = null // 当前路径上最近一次完整匹配（去干扰词）
      for (let j = i; j < len; j++) {
        // 干扰词保留在 matchedChars 中但跳过 Trie 匹配
        if (this.noiseSet.has(text[j])) {
          matchedChars.push(text[j])
          continue
        }
        const child = node.children.get(text[j].toLowerCase())
        if (!child) break
        node = child
        matchedChars.push(text[j])
        if (node.isEnd) {
          // 找到完整匹配，过滤掉干扰词后记录
          lastMatch = matchedChars.filter(c => !this.noiseSet.has(c)).join('')
        }
      }
      if (lastMatch) {
        result.push(lastMatch)
      }
    }

    return result
  }

  /**
   * 向 Trie 树中插入一个敏感词（内部方法）
   * 插入时统一转为小写以保证大小写不敏感匹配
   */
  private insert(word: string): void {
    let node = this.root
    for (const char of word.toLowerCase()) {
      if (!node.children.has(char)) {
        node.children.set(char, { children: new Map(), isEnd: false })
      }
      node = node.children.get(char)!
    }
    node.isEnd = true // 标记单词结束
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
