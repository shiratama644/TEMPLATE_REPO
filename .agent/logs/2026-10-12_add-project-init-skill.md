# 初期設定スキルの追加

> Date: 2026-10-12(JST) / Commit: 31b4d21 / Branch: arena/b4ace597-template-repo

## 1. 指示内容 (Task Summary)

新規プロジェクトでの Agent 初期設定スキルを作成する。既存スキルの修正と併用を許可。質問・計画修正ループと、プロジェクトに合ったドキュメント・Agent 設定への書き換えを含める。

## 2. 実行内容 (Executed Actions)

| # | 内容 |
|---|---|
| 1 | `.agent/skills/project-init/SKILL.md` を作成（オーケストレーター。承認前は書き換えない） |
| 2 | `.agent/commands/project-init.md` を入口として追加 |
| 3 | `project-overview` / `tech-stack` / `ci-quality-gates` / `project-template` から相互参照 |
| 4 | README・AGENTS.md §8・skills/index・hooks/pre-task・docs を更新 |
| 5 | `project-overview` の存在しない `docs/examples/` 参照を削除 |
| 6 | `make links` PASS（139 files）。`make check` は pre-commit 未導入のため未実行 |

## 3. 気づいたこと・知見 (Insights & Lessons Learned)

- 初期設定の手順は README と `.agent/README.md` と `project-template.md` に散在していたが、Agent が実行する単一スキルではなかった。
- 質問は `ask_user`（AGENTS.md §7.4）を正とし、`brainstorming` / `grilling` / `to-questionnaire` は条件付きで切り替える方が、このリポジトリのコミュニケーション規約と衝突しない。
- `project-overview` は「読むスキル」であり、初期設定後は「書き換える対象」になる。

## 4. 次にすべきこと (Next Actions)

- 派生リポジトリで `project-init` を一度通し、質問ラウンドや書き換え対象の過不足を実測する。
- ユーザーが望むなら本ブランチから PR を出す。
