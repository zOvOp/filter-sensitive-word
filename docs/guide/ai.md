# AI 大模型检测

`AISensitiveWordDetector` 借助大模型语义能力，可识别隐晦表达、谐音变体等 DFA 难以覆盖的内容。

> AI 检测依赖网络，响应较慢，建议作为 **第二道防线**，与 DFA 组合使用。

## 入参说明

### `new AISensitiveWordDetector(config)`

创建检测器实例，入参为 `AIClientConfig` 对象：

| 参数 | 类型 | 默认值 | 必填 | 说明 |
| --- | --- | --- | --- | --- |
| `apiKey` | `string` | — | 直连模式必填 | LLM API Key；使用 `customFetch` 时可省略 |
| `baseURL` | `string` | `https://api.openai.com/v1` | 否 | Chat Completions 接口基础地址 |
| `model` | `string` | `gpt-3.5-turbo` | 否 | 模型名称 |
| `timeout` | `number` | `15000` | 否 | 请求超时（毫秒），仅直连模式生效 |
| `temperature` | `number` | `0` | 否 | 采样温度，建议 `0` 保证输出稳定 |
| `customFetch` | `CustomFetch` | — | 代理模式必填 | 自定义请求，将 LLM 调用委托给自有后端 |

::: tip 二选一
必须提供 **`apiKey`**（直连）或 **`customFetch`**（代理）之一，否则构造函数抛出异常。
:::

### `ai.detect(text)`

| 参数 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `text` | `string` | 是 | 待检测文本，建议不超过 **2000 字** |

**返回值**：`Promise<AIDetectResult>`

**空文本**：`text` 为空字符串时，不发起网络请求，直接返回：

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

| 参数 | 类型 | 说明 |
| --- | --- | --- |
| `messages` | `Array<{ role: string; content: string }>` | 固定两条：`system`（审核规则）+ `user`（`detect(text)` 传入的文本） |

**返回值**：`Promise<unknown>`，支持以下两种形式（SDK 自动解析）：

1. **LLM 原始 JSON**（推荐）：OpenAI 兼容接口的完整响应，如 `res.json(data)` 原样返回
2. **content 字符串**：即 `choices[0].message.content` 的文本

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

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `isSensitive` | `boolean` | 是否包含敏感内容 |
| `categories` | `string[]` | 命中分类，取值为下表之一 |
| `matchedWords` | `string[]` | AI 识别到的具体敏感词 |
| `riskLevel` | `'low' \| 'medium' \| 'high'` | 风险等级 |
| `reason` | `string` | 判断理由（中文） |
| `confidence` | `number` | 置信度，范围 `0` ~ `1` |

`categories` 可选值：

| 值 | 含义 |
| --- | --- |
| `politics` | 政治敏感 |
| `ads` | 广告 |
| `porn` | 色情 |
| `violence` | 暴恐 |
| `cult` | 邪教 |
| `abuse` | 辱骂 |
