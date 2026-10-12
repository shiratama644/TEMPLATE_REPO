---
name: grilling
description: Use when the user wants to stress-test a plan or design, or uses a grill trigger. Interview until the design tree has no silent assumptions.
---

# Grilling

計画・判断・アイデアの前提を、設計ツリーとして潰す。事実は自分で取り、決定だけユーザーに聞く。

`grill-me` は本スキルへ統合した。入口は本ファイルだけ。

## 手段

| 対象 | function call |
| :--- | :--- |
| ユーザーの決定 | `ask_user`（1 ラウンド最大 4 問、選択肢 2〜4 + 自由記述） |
| リポジトリの事実 | `read_file` / `bash` |
| 外部の事実 | `web_search` → `fetch_page` |

サブエージェントは無い。調べものは自分で行う。調べ終わるまで、それに依存する質問は次ラウンドへ回す。

## ラウンド

設計ツリーの **frontier**（前提がもう決まっている決定）だけを聞く。他の未決に依存する問は後回し。

各問は「yes で推奨案を飲む」形にする。`ask_user` の `options` 例:

- `yes` — 推奨案を採用
- `no` — 別案（`description` か自由記述）

```json
{
  "questions": [
    {
      "id": "q1",
      "question": "<決定の題>: <本文。推奨案を含む>",
      "allowCustomResponse": true,
      "options": [
        { "id": "yes", "label": "推奨どおり", "description": "<推奨案>" },
        { "id": "no", "label": "別案にする", "description": "自由記述で書く" }
      ]
    }
  ]
}
```

答えが返ったらツリーを更新し、次の frontier を聞く。frontier が空になったら、共有理解に達したか `ask_user` で確認してから動く。
