---
layout: home

hero:
  name: filter-sensitive-word
  text: 轻量级敏感词检测与过滤
  tagline: 基于 DFA（Trie）O(n) 本地匹配，可选 AI 语义审核，TypeScript 开箱即用
  image:
    src: /logo.png
    alt: filter-sensitive-word
  actions:
    - theme: brand
      text: 快速开始
      link: /guide/getting-started
    - theme: alt
      text: 在线体验
      link: /guide/playground
    - theme: alt
      text: GitHub
      link: https://github.com/zOvOp/filter-sensitive-word

features:
  - icon: ⚡
    title: 高性能 DFA
    details: Trie 树前缀匹配，时间复杂度 O(n)，适合评论、昵称、UGC 实时过滤
  - icon: 🛡️
    title: 干扰词跳过
    details: 自动忽略空格、标点、特殊符号，防止「兼 职」「兼*职」等绕过
  - icon: 📦
    title: 六大内置词库
    details: 政治、广告、色情、暴恐、邪教、辱骂，可按 detectTypes 按需启用
  - icon: 🤖
    title: AI 语义检测
    details: 兼容 OpenAI Chat Completions；默认提示词自动解析为结构化结果，自定义 systemPrompt 则返回原始接口数据
  - icon: 🔧
    title: 可扩展
    details: 自定义词库、干扰词、运行时 addWords，支持 ESM / CJS 双格式
  - icon: 📘
    title: TypeScript
    details: 完整类型定义，Node.js 与主流打包工具均可直接使用
---

## 安装

```bash
npm install filter-sensitive-word
```

## 一行上手

```ts
import { FilterSensitiveWord } from "filter-sensitive-word";

const filter = new FilterSensitiveWord();
filter.hasSensitive("这是兼职广告"); // true
filter.filter("这是兼职广告"); // '这是****'
```

<DfaPlayground />

## 常见问题

使用 AI 检测时若遇到 **`API 请求失败 (400)`**，多为 API 输入端安全策略拦截了 System Prompt 中的敏感词示例，**不是本库错误**。可配置 `systemPrompt` 规避；配置后 `detect()` 返回 LLM 原始响应，需自行解析。详见 [AI 检测](/guide/ai) 与 [常见问题 · AI 400](/guide/faq#ai-检测报-400-错误是什么原因)。
