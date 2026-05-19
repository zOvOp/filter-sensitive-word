# DFA API

## `new FilterSensitiveWord(options?)`

| 参数 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `words` | `string[]` | `[]` | 自定义追加敏感词 |
| `useDefaultWords` | `boolean` | `true` | 是否启用内置词库 |
| `detectTypes` | `DetectType[]` | 全部六类 | 启用的分类 |
| `noiseWords` | `string` | 内置集 | 干扰词字符集 |

```ts
type DetectType =
  | "politics"
  | "ads"
  | "porn"
  | "violence"
  | "cult"
  | "abuse";
```

## 实例方法

### `hasSensitive(text)`

检测是否包含敏感词。

```ts
filter.hasSensitive("兼  职"); // true
```

### `filter(text, replacement?)`

替换敏感词，默认 `*`。最长匹配优先，区间自动合并。

```ts
filter.filter("这是兼职广告"); // '这是****'
filter.filter("敏感词", "#"); // '###'
```

### `findAll(text)`

返回命中的敏感词列表（去干扰词）。

```ts
filter.findAll("兼*职"); // ['兼职']
```

### `addWords(words)`

运行时追加词库。

### `setNoiseWords(noiseWords)`

动态设置干扰词字符集。

## 导出词库

```ts
import {
  defaultWords,
  politicsWords,
  adWords,
  pornWords,
  violenceWords,
  cultWords,
  abuseWords,
} from "filter-sensitive-word";
```
