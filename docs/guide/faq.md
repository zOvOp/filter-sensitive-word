# 常见问题

## AI 检测报 400 错误是什么原因？

通过 API Key 调用大模型时，若出现 `API 请求失败 (400)`，**通常不是本库的错误**，而是 API 提供商在**输入端**部署的安全策略拦截了本次请求。

### 核心原因：触发了 API 的原生安全策略

各大模型厂商在 API 层面都部署了严格的安全护栏。本库默认 System Prompt 和 待检测消息中会出现多类高风险敏感词示例，例如：

- 性暗示、色情描写、招嫖信息
- 暴力、恐怖主义、武器制作
- 邪教组织、精神控制
- 侮辱谩骂、诅咒

当 API 接收到这段 System Prompt 时，其安全过滤器（Safety Checker）会在**第一层**扫描到这些词汇。此时，模型**无法区分**你是「要求它生成这些内容」还是「要求它审核这些内容」，只会判定「输入内容严重违反安全政策」，从而直接拒绝请求并返回 **400 Bad Request**（响应体中常见 `content_policy_violation` 或类似的安全提示）。

### 解决方式：从提示词入手

通过 `AISensitiveWordDetector` 的 **`systemPrompt`** 配置项传入自定义提示词，弱化或替换其中的敏感词示例表述。默认提示词可通过 `DEFAULT_AI_SYSTEM_PROMPT` 导出常量查看或在此基础上改写。

```ts
import { AISensitiveWordDetector } from "filter-sensitive-word";

const ai = new AISensitiveWordDetector({
  apiKey: "sk-xxx",
  systemPrompt: "你是内容审核助手，用温和表述说明审核规则，勿罗列高风险原文示例。",
});

const raw = await ai.detect("待检测文本");
// 自定义提示词时 detect() 返回 LLM 原始响应，需自行解析
// 直连：raw 为 Chat Completions 完整 JSON
// 代理：raw 为 customFetch.fetch() 的返回值
```

::: info 返回值说明
配置 `systemPrompt` 后，`detect()` **不再**解析为 `AIDetectResult`，而是直接返回接口原始数据。若需结构化字段，请在提示词中约定格式并自行解析，或使用默认提示词（不传 `systemPrompt`）。
:::

详见 [AI 大模型检测 · 自定义提示词](/guide/ai#自定义提示词-systemprompt)。
