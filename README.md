# filter-sensitive-word

轻量级敏感词检测与过滤库，基于 **DFA（Trie 树）算法**，支持 Node.js 与打包工具（ESM / CJS）。

📖 **文档站点**：[https://zovop.github.io/filter-sensitive-word/](https://zovop.github.io/filter-sensitive-word/)（VitePress，本地开发：`npm run docs:dev`）

## 特性

- **高性能**：基于 DFA（Trie 树）实现 O(n) 时间复杂度的匹配
- **干扰词跳过**：自动跳过空格、标点、特殊符号等干扰字符，防止绕过检测
- **忽略大小写**：匹配时自动忽略大小写差异
- **按需分类**：内置六大类敏感词库，可按需启用指定分类
- **最长匹配**：过滤替换时采用最长匹配优先策略，区间合并避免字符叠加
- **AI 大模型检测**：支持接入大语言模型，利用语义理解识别隐晦表达、变体写法
- **可扩展**：支持自定义词库、自定义干扰词、运行时动态添加词汇
- **TypeScript**：完整的类型定义，开箱即用
- **双格式**：同时输出 ESM 和 CJS，兼容各种运行环境

## 安装

```bash
npm install filter-sensitive-word
```

## 快速开始

```ts
import { FilterSensitiveWord } from "filter-sensitive-word";

// 使用默认配置（全部六类词库 + 默认干扰词）
const filter = new FilterSensitiveWord();

filter.hasSensitive("这是正常文本"); // false
filter.hasSensitive("这是兼职广告"); // true

filter.filter("这是兼职广告"); // '这是****'
filter.findAll("兼 职 广 告"); // ['兼职', '广告']
```

## API

### `new FilterSensitiveWord(options?)`

创建敏感词过滤器实例。

#### options

| 参数              | 类型           | 默认值       | 说明                                       |
| ----------------- | -------------- | ------------ | ------------------------------------------ |
| `words`           | `string[]`     | `[]`         | 用户自定义追加的敏感词列表                 |
| `useDefaultWords` | `boolean`      | `true`       | 是否启用内置默认词库                       |
| `detectTypes`     | `DetectType[]` | 全部六类     | 启用默认词库时，指定要检测的分类           |
| `noiseWords`      | `string`       | 内置干扰词集 | 自定义干扰词字符集，每个字符视为一个干扰词 |

#### DetectType

```ts
type DetectType = "politics" | "ads" | "porn" | "violence" | "cult" | "abuse";
```

| 值           | 说明     |
| ------------ | -------- |
| `'politics'` | 政治敏感 |
| `'ads'`      | 广告     |
| `'porn'`     | 色情     |
| `'violence'` | 暴恐     |
| `'cult'`     | 邪教     |
| `'abuse'`    | 辱骂     |

---

### `filter.hasSensitive(text)`

检测文本是否包含任何敏感词。

```ts
filter.hasSensitive("这是正常文本"); // false
filter.hasSensitive("这是兼职广告"); // true
filter.hasSensitive("兼  职"); // true — 空格作为干扰词被跳过
filter.hasSensitive("兼***职"); // true — * 作为干扰词被跳过
filter.hasSensitive("JianZhi"); // true — 忽略大小写（取决于词库）
```

---

### `filter.filter(text, replacement?)`

过滤文本中的敏感词，将其替换为指定字符。采用最长匹配优先策略，相邻及重叠匹配区间会自动合并。

- **text** `string` — 待过滤的文本
- **replacement** `string` — 替换字符，默认 `'*'`

```ts
filter.filter("这是兼职广告"); // '这是****'
filter.filter("敏感词123", "#"); // '###123'
filter.filter("兼 职", "*"); // '***' — 干扰词也被替换
filter.filter("AB兼职CD广告EF"); // 'AB****CD****EF'
```

---

### `filter.findAll(text)`

查找文本中所有匹配的敏感词，返回去干扰词后的纯净结果。

```ts
filter.findAll("这是兼职广告"); // ['兼职', '广告']
filter.findAll("兼*职"); // ['兼职']
filter.findAll("这是一段正常文本"); // []
```

---

### `filter.addWords(words)`

运行时动态追加敏感词。

```ts
filter.addWords(["新敏感词1", "新敏感词2"]);
```

---

### `filter.setNoiseWords(noiseWords)`

动态修改干扰词字符集。传入一个字符串，每个字符都会被视为干扰词。

```ts
// 仅将空格和 @ 视为干扰词
filter.setNoiseWords(" @");

// 之后匹配时只有空格和 @ 会被跳过
filter.hasSensitive("兼@职"); // true
filter.hasSensitive("兼#职"); // false — # 不再是干扰词
```

## 使用场景

### 按分类启用词库

```ts
// 仅检测政治和邪教相关内容
const filter = new FilterSensitiveWord({
  detectTypes: ["politics", "cult"],
});

// 仅检测辱骂和广告
const filter = new FilterSensitiveWord({
  detectTypes: ["abuse", "ads"],
});
```

### 仅使用自定义词库

```ts
const filter = new FilterSensitiveWord({
  useDefaultWords: false,
  words: ["自定义敏感词A", "自定义敏感词B"],
});
```

### 自定义干扰词

```ts
const filter = new FilterSensitiveWord({
  noiseWords: " \t!@#$%", // 仅将这些字符视为干扰词
});
```

### 词库混用

```ts
const filter = new FilterSensitiveWord({
  detectTypes: ["porn", "abuse"], // 启用色情 + 辱骂词库
  words: ["业务自定义词汇"], // 同时追加业务自定义词
  noiseWords: " _-", // 自定义干扰词
});
```

## 导出的词库

库同时导出了各分类原始词库，可在业务中按需使用：

```ts
import {
  defaultWords, // 全部词库合集
  politicsWords, // 政治词库
  adWords, // 广告词库
  pornWords, // 色情词库
  violenceWords, // 暴恐词库
  cultWords, // 邪教词库
  abuseWords, // 辱骂词库
} from "filter-sensitive-word";
```

## AI 大模型检测

除了基于关键词的 DFA 匹配外，本库还提供了 **AI 大模型检测** 方案。借助大语言模型的语义理解能力，可以识别：

- 隐晦表达、暗示、反讽等不含关键词的内容
- 上下文相关的敏感语义
- 变体写法、谐音替换等绕过手段

接口兼容 **OpenAI Chat Completions** 协议，支持 OpenAI / Azure OpenAI / DeepSeek / Moonshot / 通义千问 / 智谱 等任何兼容的服务。

> **注意**：AI 检测依赖网络请求，相比本地 DFA 匹配响应较慢（通常数百毫秒至数秒），建议作为辅助校验或审核流程的第二道防线。

### 快速开始

```ts
import { AISensitiveWordDetector } from "filter-sensitive-word";

const ai = new AISensitiveWordDetector({
  apiKey: "sk-xxx",
  model: "gpt-3.5-turbo",
});

const result = await ai.detect("这是一段需要检测的文本");

console.log(result.isSensitive); // true | false
console.log(result.categories); // ['abuse', 'porn']
console.log(result.matchedWords); // ['具体词汇1', '具体词汇2']
console.log(result.riskLevel); // 'low' | 'medium' | 'high'
console.log(result.reason); // "文本包含辱骂和色情内容"
console.log(result.confidence); // 0.95
```

### `new AISensitiveWordDetector(config)`

创建 AI 检测器实例。

| 参数           | 类型                                        | 默认值                      | 说明                                 |
| -------------- | ------------------------------------------- | --------------------------- | ------------------------------------ |
| `apiKey`       | `string`                                    | —                           | API Key，使用 `customFetch` 时可省略 |
| `baseURL`      | `string`                                    | `https://api.openai.com/v1` | API 基础地址                         |
| `model`        | `string`                                    | `gpt-3.5-turbo`             | 模型名称                             |
| `timeout`      | `number`                                    | `15000`                     | 请求超时（毫秒）                     |
| `temperature`  | `number`                                    | `0`                         | 模型温度参数                         |
| `customFetch`  | `{ fetch: (messages) => Promise<unknown> }` | —                           | 自定义远程请求配置，**前端推荐使用** |
| `systemPrompt` | `string`                                    | 内置默认提示词              | 自定义 System Prompt；传入后 `detect()` 返回原始接口数据，不做 JSON 解析 |

#### `customFetch.fetch(messages)` 入参

| 参数       | 类型                                       | 说明                                                                 |
| ---------- | ------------------------------------------ | -------------------------------------------------------------------- |
| `messages` | `Array<{ role: string; content: string }>` | SDK 已组装：`system`（审核 prompt）+ `user`（`detect(text)` 的文本） |

**返回值**：`Promise<unknown>`

- 默认提示词：支持 LLM 原始 JSON 或 `content` 字符串，SDK 解析为 `AIDetectResult`
- 自定义 `systemPrompt`：`detect()` 直接返回 `fetch` 的原始值，不再解析

### `ai.detect(text)`

调用 AI 大模型检测文本中的敏感内容。

- **text** `string` — 待检测的文本，建议不超过 2000 字
- **返回**
  - 未传 `systemPrompt`：`Promise<AIDetectResult>`（SDK 自动解析）
  - 传入自定义 `systemPrompt`：`Promise<unknown>`（直连为 Chat Completions 完整 JSON；代理为 `customFetch` 返回值）

### `AIDetectResult` 结构

仅在**未传自定义 `systemPrompt`** 时，`detect()` 返回此结构。

| 字段           | 类型                          | 说明                  |
| -------------- | ----------------------------- | --------------------- |
| `isSensitive`  | `boolean`                     | 是否包含敏感内容      |
| `categories`   | `string[]`                    | 命中的敏感词分类      |
| `matchedWords` | `string[]`                    | AI 识别到的具体敏感词 |
| `riskLevel`    | `'low' \| 'medium' \| 'high'` | 风险等级              |
| `reason`       | `string`                      | AI 给出的判断理由     |
| `confidence`   | `number`                      | AI 置信度（0 ~ 1）    |

### 使用示例

**直连模式（Node.js 后端）：**

```ts
const ai = new AISensitiveWordDetector({
  apiKey: "sk-xxx",
  model: "gpt-3.5-turbo",
});

const result = await ai.detect("用户输入的内容");
```

**自定义提示词（规避 API 输入端 400）：**

传入 `systemPrompt` 后，`detect()` **不再**解析为 `AIDetectResult`，而是直接返回 LLM 接口原始响应，由调用方自行处理。

```ts
import {
  AISensitiveWordDetector,
  DEFAULT_AI_SYSTEM_PROMPT,
} from "filter-sensitive-word";

const ai = new AISensitiveWordDetector({
  apiKey: "sk-xxx",
  // 使用更温和的表述，避免触发厂商输入端安全拦截
  systemPrompt: "你是内容审核助手，判断用户文本是否违规，简要说明理由即可。",
});

const raw = await ai.detect("用户输入的内容");
const content = (raw as { choices?: Array<{ message?: { content?: string } }> })
  ?.choices?.[0]?.message?.content;

// 需要 AIDetectResult 时：不传 systemPrompt，使用默认提示词（SDK 自动解析）
// 或基于 DEFAULT_AI_SYSTEM_PROMPT 自行改写后，在业务侧解析 content / raw
```

**代理模式（前端，推荐）：**

> ⚠️ **安全提示**：API Key 绝不应该暴露在前端代码中。建议搭建一个后端代理来转发 LLM 请求，
> 使用 `customFetch.fetch` 将 SDK 已组装好的 messages 数组发送到自己的后端，后端原样转发给 LLM。

前端代码：

```ts
const ai = new AISensitiveWordDetector({
  customFetch: {
    fetch: async (messages) => {
      const res = await fetch("/api/check-sensitive", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Custom-Header": "my-value", // 可携带自定义请求头
        },
        body: JSON.stringify({ messages }),
      });
      const data = await res.json();
      return data;
    },
  },
});

const result = await ai.detect("用户输入的内容");
```

后端代理示例（Node.js / Express）：

```ts
// 后端 /api/check-sensitive 接口
app.post("/api/check-sensitive", async (req, res) => {
  const { messages } = req.body; // SDK 已组装好的 [{ role, content }, ...]

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`, // Key 存在后端环境变量
    },
    body: JSON.stringify({
      model: "gpt-3.5-turbo",
      messages, // 直接转发，无需重新拼装
      temperature: 0,
    }),
  });

  const data = await response.json();
  res.json(data);
});
```

**接入 DeepSeek：**

```ts
const ai = new AISensitiveWordDetector({
  apiKey: "sk-xxx",
  baseURL: "https://api.deepseek.com/v1",
  model: "deepseek-chat",
});

const result = await ai.detect("用户输入的内容");
```

**接入通义千问：**

```ts
const ai = new AISensitiveWordDetector({
  apiKey: "sk-xxx",
  baseURL: "https://dashscope.aliyuncs.com/compatible-mode/v1",
  model: "qwen-turbo",
});
```

**DFA + AI 双重校验（代理模式）：**

```ts
import {
  FilterSensitiveWord,
  AISensitiveWordDetector,
} from "filter-sensitive-word";

const dfa = new FilterSensitiveWord({ detectTypes: ["politics", "abuse"] });

const ai = new AISensitiveWordDetector({
  customFetch: {
    fetch: async (messages) => {
      const res = await fetch("/api/check-sensitive", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages }),
      });
      const data = await res.json();
      return data;
    },
  },
});

async function doubleCheck(text: string) {
  // 第一步：DFA 快速筛查
  if (!dfa.hasSensitive(text)) {
    // DFA 未命中，再用 AI 做语义兜底
    const aiResult = await ai.detect(text);
    return { method: "ai", ...aiResult };
  }
  // DFA 已命中，直接返回
  return { method: "dfa", isSensitive: true, words: dfa.findAll(text) };
}
```

## 常见问题

### AI 检测报 400 错误是什么原因？

通过 API Key 调用大模型时若出现 `API 请求失败 (400)`，**通常不是本库的错误**，而是 API 提供商在输入端的安全策略拦截了请求。

**核心原因：** 本库默认 System Prompt 中和 待检测消息 中列举了色情、暴力、邪教、辱骂等多类高风险敏感词示例。API 的安全过滤器无法区分「审核这些内容」与「生成这些内容」，会在第一层判定输入违反安全政策，直接返回 400（常见 `content_policy_violation` 等提示）。

**解决方式：** 通过配置项 `systemPrompt` 传入更温和的提示词（可参考导出的 `DEFAULT_AI_SYSTEM_PROMPT` 自行改写），避免在 system 消息中直接罗列大段高风险原文。配置后 `detect()` 返回 LLM 原始响应，需自行解析，详见上文「自定义提示词」。

详见文档：[常见问题 · AI 400](https://zovop.github.io/filter-sensitive-word/guide/faq.html#ai-检测报-400-错误是什么原因)

## 工作原理

### DFA（Trie 树）匹配

所有敏感词被组织为一棵 Trie 树（前缀树）。检测时遍历输入文本的每个字符位置，从该位置出发沿着 Trie 树向下匹配：

- 时间复杂度：O(n)，`n` 为文本长度
- 空间复杂度：O(m × k)，`m` 为词库总字符数，`k` 为字符集大小

### 干扰词处理

干扰词是指在敏感词匹配过程中会被自动跳过的字符。假设干扰词集合包含空格 ` `：

```
输入文本：兼  职
          ↑  ↑  ↑
匹配路径：兼  [跳]  职  →  命中 "兼职"
```

这使得用户无法通过在敏感词中插入空格、符号等方式绕过检测。过滤替换时，干扰词也会被一并替换为 `replacement` 字符。

### 最长匹配优先

当从文本中某一位置出发存在多个可能的敏感词匹配时，选择最长的那个：

```
词库：["兼职", "兼职广告"]

输入：兼职广告
      ↑──↑   匹配 "兼职"（2字）
      ↑─────↑ 匹配 "兼职广告"（4字）← 选择此结果
```

## License

MIT
