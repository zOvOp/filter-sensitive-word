# 贡献

## 开发

```bash
npm install
npm test
npm run typecheck
npm run build
```

`npm test` 使用 Node.js 自带的测试运行器。提交前请让 `npm test` 和 `npm run typecheck` 通过。

## 约定

- 不要增加运行时依赖。文档和构建工具留在 `devDependencies`。
- 词库条目去掉干扰字符后至少保留两个有效字符。只剩一个有效字符的遮挡写法不会入库，避免误伤。请不要再往默认词库里加单字。
- 改版本时同时改 `package.json` 和 `package-lock.json`。仓库不会在 CI 里执行 `npm publish`。
- 行为变化补一条测试。DFA 用自定义小词库即可，不必把整份默认词库复制进测试。

## English

Run `npm test` and `npm run typecheck` before opening a pull request against `main`. Do not add runtime dependencies. A dictionary entry must keep at least two significant characters after noise characters are removed; one-character entries are not accepted unless the word itself contains no noise character.
