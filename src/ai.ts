/**
 * AI 大模型敏感词检测结果
 */
export interface AIDetectResult {
  /** 是否包含敏感内容 */
  isSensitive: boolean
  /** 命中的敏感词分类，可多选 */
  categories: Array<'politics' | 'ads' | 'porn' | 'violence' | 'cult' | 'abuse'>
  /** 命中的具体敏感词列表 */
  matchedWords: string[]
  /** 风险等级 */
  riskLevel: 'low' | 'medium' | 'high'
  /** 判断理由简述 */
  reason: string
  /** 置信度（取值 0 ~ 1） */
  confidence: number
}

/**
 * 自定义远程请求配置
 *
 * 用于将 LLM 请求代理到自己的后端服务，避免前端暴露 API Key。
 * SDK 会将已组装好的 messages 数组传给 `fetch`，后端只需原样转发给 LLM。
 *
 * @example
 * ```ts
 * const ai = new AISensitiveWordDetector({
 *   customFetch: {
 *     fetch: async (messages) => {
 *       const res = await fetch('/api/check-sensitive', {
 *         method: 'POST',
 *         headers: {
 *           'Content-Type': 'application/json',
 *           'X-Custom-Header': 'my-value', // 自定义请求头
 *         },
 *         body: JSON.stringify({ messages }),
 *       })
 *       const data = await res.json()
 *       return data
 *     },
 *   },
 * })
 * ```
 */
export interface CustomFetch {
  /**
   * 自定义请求函数
   *
   * @param messages - SDK 已组装好的完整消息列表，格式为 `[{ role: 'system', content }, { role: 'user', content }]`
   *                   后端可直接放入 LLM API 的 messages 字段，无需重新拼装
   * @returns LLM 接口原始 JSON，或 `choices[0].message.content` 字符串
   */
  fetch: (messages: Array<{ role: string; content: string }>) => Promise<unknown>
}

/**
 * AI 客户端配置
 *
 * 兼容 OpenAI 及所有兼容 OpenAI Chat Completions 接口的大模型服务。
 *
 * **安全提示**：如果在前端（浏览器）中使用，请勿直接传入 `apiKey`，推荐使用 `customFetch`
 * 将请求代理到自己的后端，由后端持有 API Key 并转发 LLM 请求。
 */
export interface AIClientConfig {
  /**
   * API Key
   *
   * 如果提供了 `customFetch`，则 `apiKey` 可以省略（由后端代理持有）。
   */
  apiKey?: string
  /** API 基础地址，默认 https://api.openai.com/v1 */
  baseURL?: string
  /** 模型名称，默认 gpt-3.5-turbo */
  model?: string
  /** 请求超时毫秒数，默认 15000 */
  timeout?: number
  /** 温度参数，控制输出随机性，默认 0 */
  temperature?: number
  /**
   * 自定义远程请求配置
   *
   * 建议在前端或安全性要求较高的场景中使用。SDK 将已组装好的 messages 数组
   * （含 system + user）传给 `fetch`，用户在自己的后端直接转发给 LLM，
   * 再将 LLM 原始 content 返回即可。
   *
   * @example
   * ```ts
   * const ai = new AISensitiveWordDetector({
   *   customFetch: {
   *     fetch: async (messages) => {
   *       const res = await fetch('/api/check-sensitive', {
   *         method: 'POST',
   *         headers: { 'Content-Type': 'application/json' },
   *         body: JSON.stringify({ messages }),
   *       })
 *       const data = await res.json()
 *       return data
 *     },
 *   },
 * })
 * ```
   */
  customFetch?: CustomFetch
}

/**
 * AI 敏感词检测器内部配置（apiKey 允许为空，仅在 direct 模式下使用）
 */
interface InternalConfig {
  apiKey: string
  baseURL: string
  model: string
  timeout: number
  temperature: number
  customFetch: CustomFetch | null
}

/**
 * AI 大模型敏感词检测器
 *
 * 借助大语言模型的语义理解能力进行内容审核。相比基于 DFA 关键词匹配的
 * {@link FilterSensitiveWord}，AI 检测器能够识别：
 * - 隐晦表达、暗示、反讽等无关键词的内容
 * - 上下文相关的敏感语义
 * - 变体写法、谐音替换等绕过手段
 *
 * 接口兼容 OpenAI Chat Completions 协议，支持 OpenAI / Azure OpenAI /
 * DeepSeek / Moonshot / 通义千问 / 智谱 等任何兼容的服务。
 *
 * ## 请求方式
 *
 * 支持两种请求方式，通过 `customFetch` 切换：
 *
 * | 方式 | 适用场景 | API Key 位置 |
 * |---|---|---|
 * | **直连模式**（默认） | 后端 / Node.js 环境 | 前端传入，直连 LLM |
 * | **代理模式**（推荐） | 前端 / 浏览器 | 后端持有，前端不感知 |
 *
 * @example
 * #### 直连模式（Node.js）
 * ```ts
 * import { AISensitiveWordDetector } from 'filter-sensitive-word'
 *
 * const ai = new AISensitiveWordDetector({
 *   apiKey: 'sk-xxx',
 *   model: 'gpt-3.5-turbo',
 * })
 *
 * const result = await ai.detect('这是一段需要检测的文本')
 * console.log(result.isSensitive)  // true | false
 * console.log(result.categories)   // ['abuse', 'porn']
 * console.log(result.riskLevel)    // 'high'
 * ```
 *
 * @example
 * #### 代理模式（前端，推荐）
 * ```ts
 * const ai = new AISensitiveWordDetector({
 *   customFetch: {
 *     fetch: async (messages) => {
 *       const res = await fetch('/api/check-sensitive', {
 *         method: 'POST',
 *         headers: { 'Content-Type': 'application/json' },
 *         body: JSON.stringify({ messages }),
 *       })
 *       const data = await res.json()
 *       return data
 *     },
 *   },
 * })
 * ```
 */
export class AISensitiveWordDetector {
  private config: InternalConfig

  constructor(config: AIClientConfig) {
    if (!config.apiKey && !config.customFetch) {
      throw new Error(
        '[AISensitiveWordDetector] 必须提供 apiKey 或 customFetch 之一。' +
        '前端推荐使用 customFetch 将请求代理到后端，避免暴露 API Key。'
      )
    }

    this.config = {
      apiKey: config.apiKey ?? '',
      baseURL: config.baseURL ?? 'https://api.openai.com/v1',
      model: config.model ?? 'gpt-3.5-turbo',
      timeout: config.timeout ?? 15000,
      temperature: config.temperature ?? 0,
      customFetch: config.customFetch ?? null,
    }
  }

  /**
   * 检测文本中是否包含敏感内容
   *
   * @param text - 待检测的文本，建议不超过 2000 字以获得最佳效果
   * @returns AI 检测结果
   * @throws 网络错误、API 返回错误、或 JSON 解析失败时抛出异常
   *
   * @example
   * ```ts
   * const result = await ai.detect('待检测的文本内容')
   * if (result.isSensitive) {
   *   console.log(`命中分类: ${result.categories.join(', ')}`)
   *   console.log(`风险等级: ${result.riskLevel}`)
   * }
   * ```
   */
  async detect(text: string): Promise<AIDetectResult> {
    if (!text) {
      return {
        isSensitive: false,
        categories: [],
        matchedWords: [],
        riskLevel: 'low',
        reason: '输入文本为空',
        confidence: 1,
      }
    }

    const messages = [
      { role: 'system', content: this.buildSystemPrompt() },
      { role: 'user', content: text },
    ]

    // 代理模式：通过 customFetch.fetch 委托后端转发 LLM 请求
    // SDK 已组装好 messages（含 system prompt），后端直接转发即可
    if (this.config.customFetch) {
      const data = await this.config.customFetch.fetch(messages)
      return this.parseResponse(this.resolveLLMContent(data))
    }

    // 直连模式：SDK 直接调用 LLM API
    const response = await this.directRequest(messages)
    return this.parseResponse(response)
  }

  /** 从 LLM 原始 JSON 或 content 字符串中取出正文 */
  private resolveLLMContent(data: unknown): string {
    if (typeof data === 'string') return data
    const content = (data as { choices?: Array<{ message?: { content?: string } }> })
      ?.choices?.[0]?.message?.content
    if (!content) {
      throw new Error(
        '[AISensitiveWordDetector] 代理响应格式异常，需为 LLM 原始 JSON 或 content 字符串',
      )
    }
    return content
  }

  /**
   * 构建系统提示词
   * 指导大模型按照指定格式输出敏感词检测结果
   */
  private buildSystemPrompt(): string {
    return `你是一个专业的内容审核助手。请分析用户输入的文本，判断是否包含以下任意一类敏感内容：

1. politics（政治敏感）：涉及政治人物、政治事件、体制攻击等
2. ads（广告）：推广营销、引流、代购、兼职招聘、赌博彩票等
3. porn（色情）：性暗示、色情描写、低俗内容、招嫖信息等
4. violence（暴恐）：暴力、恐怖主义、极端主义、武器制作等
5. cult（邪教）：邪教组织、封建迷信、精神控制、末日预言等
6. abuse（辱骂）：人身攻击、侮辱谩骂、诅咒、歧视等

请严格按以下 JSON 格式返回，不要包含 markdown 标记或其他额外文字：
{
  "isSensitive": true或false,
  "categories": ["命中的分类1", "命中的分类2"],
  "matchedWords": ["命中的具体词汇1", "命中的具体词汇2"],
  "riskLevel": "low"或"medium"或"high",
  "reason": "简要判断理由，中文",
  "confidence": 0到1之间的数值
}

风险等级说明：
- high：明确包含敏感内容，无需上下文即可判定
- medium：包含可疑内容，需要结合上下文综合判断
- low：基本安全或仅有轻微擦边

如果内容完全安全不包含任何敏感内容，categories 和 matchedWords 为空数组，riskLevel 为 "low"，confidence 为 1。`
  }

  /**
   * 直连模式：直接向 LLM API 发起 HTTP 请求
   */
  private async directRequest(messages: Array<{ role: string; content: string }>): Promise<string> {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), this.config.timeout)

    try {
      const res = await fetch(`${this.config.baseURL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.apiKey}`,
        },
        body: JSON.stringify({
          model: this.config.model,
          messages,
          temperature: this.config.temperature,
          max_tokens: 500,
        }),
        signal: controller.signal,
      })

      clearTimeout(timer)

      if (!res.ok) {
        const errorBody = await res.text().catch(() => '')
        throw new Error(
          `[AISensitiveWordDetector] API 请求失败 (${res.status}): ${errorBody}`
        )
      }

      const data: any = await res.json()
      const content = data?.choices?.[0]?.message?.content
      if (!content) {
        throw new Error(
          `[AISensitiveWordDetector] API 返回数据格式异常: ${JSON.stringify(data)}`
        )
      }

      return content
    } catch (err: any) {
      clearTimeout(timer)
      if (err.name === 'AbortError') {
        throw new Error(`[AISensitiveWordDetector] 请求超时 (${this.config.timeout}ms)`)
      }
      throw err
    }
  }

  /**
   * 解析 AI 返回的文本为结构化结果
   *
   * 兼容以下情况：
   * - 纯 JSON 字符串
   * - JSON 包裹在 markdown 代码块中（```json ... ```）
   * - 文本中某处包含 JSON 对象
   */
  private parseResponse(content: string): AIDetectResult {
    // 尝试提取 markdown 代码块中的 JSON
    const codeBlockMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/)
    const candidate = codeBlockMatch ? codeBlockMatch[1].trim() : content.trim()

    // 尝试从文本中提取 JSON 对象
    const jsonMatch = candidate.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      throw new Error(
        `[AISensitiveWordDetector] 无法从 AI 返回中解析 JSON: ${content}`
      )
    }

    let parsed: any
    try {
      parsed = JSON.parse(jsonMatch[0])
    } catch {
      throw new Error(
        `[AISensitiveWordDetector] JSON 解析失败: ${jsonMatch[0]}`
      )
    }

    const validCategories = ['politics', 'ads', 'porn', 'violence', 'cult', 'abuse']
    const validRiskLevels = ['low', 'medium', 'high']

    return {
      isSensitive: Boolean(parsed.isSensitive),
      categories: Array.isArray(parsed.categories)
        ? parsed.categories.filter((c: string) => validCategories.includes(c))
        : [],
      matchedWords: Array.isArray(parsed.matchedWords)
        ? parsed.matchedWords.map(String)
        : [],
      riskLevel: validRiskLevels.includes(parsed.riskLevel)
        ? parsed.riskLevel
        : 'low',
      reason: typeof parsed.reason === 'string' ? parsed.reason : '',
      confidence: typeof parsed.confidence === 'number'
        ? Math.max(0, Math.min(1, parsed.confidence))
        : 1,
    }
  }
}
