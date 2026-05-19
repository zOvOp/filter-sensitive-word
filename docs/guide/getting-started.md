# 快速开始

## 安装

::: code-group

```bash [npm]
npm install filter-sensitive-word
```

```bash [pnpm]
pnpm add filter-sensitive-word
```

```bash [yarn]
yarn add filter-sensitive-word
```

:::

## DFA 敏感词过滤

```ts
import { FilterSensitiveWord } from "filter-sensitive-word";

const filter = new FilterSensitiveWord();

filter.hasSensitive("这是正常文本"); // false
filter.hasSensitive("这是兼职广告"); // true

filter.filter("这是兼职广告"); // '这是****'
filter.findAll("兼 职 广 告"); // ['兼职', '广告']
```

### 按分类启用词库

```ts
const filter = new FilterSensitiveWord({
  detectTypes: ["politics", "abuse"],
});
```

### 仅使用自定义词库

```ts
const filter = new FilterSensitiveWord({
  useDefaultWords: false,
  words: ["业务敏感词A", "业务敏感词B"],
});
```

## AI 大模型检测

```ts
import { AISensitiveWordDetector } from "filter-sensitive-word";

const ai = new AISensitiveWordDetector({
  apiKey: "sk-xxx",
  model: "gpt-3.5-turbo",
});

const result = await ai.detect("待检测文本");
// 默认提示词下 result 为 AIDetectResult
console.log(result.isSensitive, result.categories, result.riskLevel);
```

传入自定义 `systemPrompt` 时，`detect()` 返回 LLM 原始接口数据，不再解析为 `AIDetectResult`。详见 [AI 大模型检测](/guide/ai)。

## 下一步

- [在线体验](/guide/playground) — 浏览器内实时 DFA 演示
- [DFA API](/guide/api) — 完整 API 说明
- [工作原理](/guide/how-it-works) — Trie 匹配与干扰词机制
