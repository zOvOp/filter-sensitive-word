# AI 大模型检测

`AISensitiveWordDetector` 借助大模型语义能力，可识别隐晦表达、谐音变体等 DFA 难以覆盖的内容。

> AI 检测依赖网络，响应较慢，建议作为 **第二道防线**，与 DFA 组合使用。

## 入参说明

### `new AISensitiveWordDetector(config)`

创建检测器实例，入参为 `AIClientConfig` 对象：

| 参数           | 类型          | 默认值                      | 必填         | 说明                                     |
| -------------- | ------------- | --------------------------- | ------------ | ---------------------------------------- |
| `apiKey`       | `string`      | —                           | 直连模式必填 | LLM API Key；使用 `customFetch` 时可省略 |
| `baseURL`      | `string`      | `https://api.openai.com/v1` | 否           | Chat Completions 接口基础地址            |
| `model`        | `string`      | `gpt-3.5-turbo`             | 否           | 模型名称                                 |
| `timeout`      | `number`      | `15000`                     | 否           | 请求超时（毫秒），仅直连模式生效         |
| `temperature`  | `number`      | `0`                         | 否           | 采样温度，建议 `0` 保证输出稳定          |
| `customFetch`  | `CustomFetch` | —                           | 代理模式必填 | 自定义请求，将 LLM 调用委托给自有后端    |
| `systemPrompt` | `string`      | 内置默认                    | 否           | 自定义 System Prompt；传入后 `detect()` 返回原始接口数据，见下方 |

::: tip 二选一
必须提供 **`apiKey`**（直连）或 **`customFetch`**（代理）之一，否则构造函数抛出异常。
:::

### `ai.detect(text)`

| 参数   | 类型     | 必填 | 说明                               |
| ------ | -------- | ---- | ---------------------------------- |
| `text` | `string` | 是   | 待检测文本，建议不超过 **2000 字** |

**返回值**（取决于是否传入 `systemPrompt`）：

| 场景 | 类型 | 说明 |
| --- | --- | --- |
| 未传 `systemPrompt`（默认提示词） | `Promise<AIDetectResult>` | SDK 解析模型输出为结构化结果 |
| 传入自定义 `systemPrompt` | `Promise<unknown>` | **不做 JSON 解析**，直接返回接口原始数据 |

自定义 `systemPrompt` 时的返回值：

| 模式 | 返回值 |
| --- | --- |
| `customFetch` | `customFetch.fetch()` 的返回值（原样透传） |
| 直连（`apiKey`） | Chat Completions 完整 JSON（与 OpenAI `chat/completions` 响应一致） |

**空文本**：`text` 为空字符串时，不发起网络请求，直接返回 `AIDetectResult` 形态的空结果（与是否自定义提示词无关）：

```ts
{
  isSensitive: false,
  categories: [],
  matchedWords: [],
  riskLevel: 'low',
  reason: '输入文本为空',
  confidence: 1,
}
```

### `customFetch.fetch(messages)`

代理模式下由你实现，`messages` 由 SDK 内部组装，**无需自行拼接 system prompt**。

| 参数       | 类型                                       | 说明                                                                |
| ---------- | ------------------------------------------ | ------------------------------------------------------------------- |
| `messages` | `Array<{ role: string; content: string }>` | 固定两条：`system`（审核规则）+ `user`（`detect(text)` 传入的文本） |

**返回值**：`Promise<unknown>`

- **未传 `systemPrompt`**：支持 LLM 原始 JSON（推荐）或 `choices[0].message.content` 字符串，SDK 会提取正文并解析为 `AIDetectResult`
- **传入自定义 `systemPrompt`**：`detect()` 直接返回你 `fetch` 的返回值，**不再解析**

**后端代理请求体**（SDK 发给 `/api/check-sensitive` 的 body）：

```json
{
  "messages": [
    { "role": "system", "content": "你是一个专业的内容审核助手…" },
    { "role": "user", "content": "用户待检测的文本" }
  ]
}
```

后端将 `messages` 放入 LLM 的 `messages` 字段转发即可。

## 自定义提示词 `systemPrompt`

默认 System Prompt 会列举多类违规内容的说明，部分 API 厂商会在**输入端**拦截并返回 400。可通过 `systemPrompt` 替换为更温和的表述。

传入自定义 `systemPrompt` 后，SDK **不再**调用内部 `parseResponse()`，由你在业务侧自行解析 LLM 返回。

```ts
import {
  AISensitiveWordDetector,
  DEFAULT_AI_SYSTEM_PROMPT,
} from "filter-sensitive-word";

// 直连模式：返回 Chat Completions 完整 JSON
const ai = new AISensitiveWordDetector({
  apiKey: "sk-xxx",
  systemPrompt: "你是内容审核助手，用一句话说明文本是否违规即可。",
});

const raw = await ai.detect("用户输入");
const content = (raw as { choices?: Array<{ message?: { content?: string } }> })
  ?.choices?.[0]?.message?.content;
console.log(content);

// 代理模式：返回 customFetch 的原始值
const aiProxy = new AISensitiveWordDetector({
  customFetch: {
    fetch: async (messages) => {
      const res = await fetch("/api/check-sensitive", {
        method: "POST",
        body: JSON.stringify({ messages }),
      });
      return res.json();
    },
  },
  systemPrompt: "你是内容审核助手…",
});

const data = await aiProxy.detect("用户输入");
// data 即后端 / LLM 原样返回的 JSON
```

若仍希望获得 `AIDetectResult`：

- **不传 `systemPrompt`**：使用内置默认提示词，SDK 自动解析
- **必须自定义提示词**：在提示词中约定输出格式，从 `content` 或 `raw` 自行 `JSON.parse`

`DEFAULT_AI_SYSTEM_PROMPT` 可作为改写参考，但一经传入 `systemPrompt` 即视为自定义，返回值变为原始接口数据。

遇到 400 的说明见 [常见问题](/guide/faq)。

## 直连模式（Node.js）

```ts
import { AISensitiveWordDetector } from "filter-sensitive-word";

const ai = new AISensitiveWordDetector({
  apiKey: "sk-xxx",
  model: "gpt-3.5-turbo",
});

const result = await ai.detect("用户输入");
```

## 代理模式（前端推荐）

API Key 放在后端，前端通过 `customFetch` 转发：

```ts
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
```

后端将 LLM 原始 JSON 原样返回即可：

```ts
const data = await response.json();
res.json(data);
```

## 接入其他模型

```ts
// DeepSeek
new AISensitiveWordDetector({
  apiKey: "sk-xxx",
  baseURL: "https://api.deepseek.com/v1",
  model: "deepseek-chat",
});

// 通义千问
new AISensitiveWordDetector({
  apiKey: "sk-xxx",
  baseURL: "https://dashscope.aliyuncs.com/compatible-mode/v1",
  model: "qwen-turbo",
});
```

## 返回结构 `AIDetectResult`

以下结构仅在**未传自定义 `systemPrompt`** 时由 `detect()` 返回。传入自定义提示词时请参考上一节，自行从原始响应中解析。

| 字段           | 类型                          | 说明                     |
| -------------- | ----------------------------- | ------------------------ |
| `isSensitive`  | `boolean`                     | 是否包含敏感内容         |
| `categories`   | `string[]`                    | 命中分类，取值为下表之一 |
| `matchedWords` | `string[]`                    | AI 识别到的具体敏感词    |
| `riskLevel`    | `'low' \| 'medium' \| 'high'` | 风险等级                 |
| `reason`       | `string`                      | 判断理由（中文）         |
| `confidence`   | `number`                      | 置信度，范围 `0` ~ `1`   |

`categories` 可选值：

| 值         | 含义     |
| ---------- | -------- |
| `politics` | 政治敏感 |
| `ads`      | 广告     |
| `porn`     | 色情     |
| `violence` | 暴恐     |
| `cult`     | 邪教     |
| `abuse`    | 辱骂     |

## 常见问题

### AI 检测报 400 错误是什么原因？

通过 API Key 调用时若返回 400，**通常不是本库错误**，而是 API 提供商的**输入端安全拦截**：默认 System Prompt 中含大量高风险敏感词示例，安全过滤器无法区分「审核」与「生成」，会直接拒绝（常见 `content_policy_violation`）。

**解决方式：** 配置 `systemPrompt` 使用更温和的提示词。详见 [常见问题](/guide/faq#ai-检测报-400-错误是什么原因)。
