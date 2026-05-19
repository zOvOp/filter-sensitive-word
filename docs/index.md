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
    details: 兼容 OpenAI Chat Completions，识别隐晦表达与变体写法（建议作第二道防线）
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
