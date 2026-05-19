import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitepress";

const root = fileURLToPath(new URL("../..", import.meta.url));

export default defineConfig({
  vite: {
    resolve: {
      alias: {
        // 文档站引用本地源码，避免 CI 依赖 npm 包且未构建 dist 导致解析失败
        "filter-sensitive-word": resolve(root, "src/index.ts"),
      },
    },
    ssr: {
      noExternal: ["filter-sensitive-word"],
    },
  },
  lang: "zh-CN",  title: "filter-sensitive-word",
  description: "轻量级敏感词检测与过滤库，DFA 高性能匹配 + AI 语义检测",
  base: "/filter-sensitive-word/",
  head: [["link", { rel: "icon", href: "/filter-sensitive-word/logo.png" }]],
  themeConfig: {
    logo: "/logo.png",
    nav: [
      { text: "指南", link: "/guide/getting-started" },
      { text: "DFA API", link: "/guide/api" },
      { text: "AI 检测", link: "/guide/ai" },
      { text: "常见问题", link: "/guide/faq" },
      {
        text: "npm",
        link: "https://www.npmjs.com/package/filter-sensitive-word",
      },
    ],
    sidebar: [
      {
        text: "介绍",
        items: [
          { text: "快速开始", link: "/guide/getting-started" },
          { text: "在线体验", link: "/guide/playground" },
        ],
      },
      {
        text: "文档",
        items: [
          { text: "DFA API", link: "/guide/api" },
          { text: "AI 大模型检测", link: "/guide/ai" },
          { text: "工作原理", link: "/guide/how-it-works" },
          { text: "常见问题", link: "/guide/faq" },
        ],
      },
    ],
    socialLinks: [
      {
        icon: "github",
        link: "https://github.com/zOvOp/filter-sensitive-word",
      },
    ],
    footer: {
      message: "Released under the MIT License.",
      copyright: "Copyright © zOvOp",
    },
    search: {
      provider: "local",
    },
  },
});
