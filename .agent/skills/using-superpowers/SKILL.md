---
name: using-superpowers
description: Use when starting work that might match an existing skill. Read the matching SKILL.md before acting or asking.
---

# Using Skills

該当スキルがあるなら、返事や探索の前に読む。この環境に Skill ツールは無い。

## 手順

1. `.agent/skills/index.md` を `read_file` する（読み方ガイドだけ）。
2. 該当する `SKILL.md` を `read_file` する。全件は読まない。
3. 「Using [skill] to [purpose]」と宣言し、その手順に従う。

```json
{
  "path": ".agent/skills/index.md"
}
```

```json
{
  "path": ".agent/skills/<name>/SKILL.md"
}
```

`AGENTS.md` とユーザーの明示指示はスキルより優先する。

## 優先

複数が当たるときは、進め方のスキルを先に読む。

- 「X を作って」→ `brainstorming`（質問は `ask_user`）
- 「直して」→ `systematic-debugging`
- 「初期設定して」→ `project-init`

## 使わないもの

- `Skill` ツール / `Call the Skill tool with "..."` 
- Claude Code 専用のサブエージェント入れ子
- `references/claude-code-tools.md`（削除済み）
