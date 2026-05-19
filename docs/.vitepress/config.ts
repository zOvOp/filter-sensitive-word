import { defineConfig } from "vitepress";

export default defineConfig({
  lang: "zh-CN",
  title: "filter-sensitive-word",
  description: "轻量级敏感词检测与过滤库，DFA 高性能匹配 + AI 语义检测",
  base: "/filter-sensitive-word/",
  head: [["link", { rel: "icon", href: "/filter-sensitive-word/logo.png" }]],
  themeConfig: {
    logo: "/logo.png",
    nav: [
      { text: "指南", link: "/guide/getting-started" },
      { text: "DFA API", link: "/guide/api" },
      { text: "AI 检测", link: "/guide/ai" },
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
