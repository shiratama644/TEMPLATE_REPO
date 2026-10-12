# Rules Index — 作業規約の一覧

> このファイルは `.agent/rules/` の**入口**。ルールは `paths` で発火条件を絞れる。
> 発火条件（`paths`）に合うファイルを扱うときだけ、該当ルールが読み込まれる。
> 作業規約の正本は `AGENTS.md`。ここにあるルールは AGENTS.md を補う詳細。

## プロジェクト共通ルール（番号付き）

| ファイル | 内容 | 発火条件（paths） |
| :--- | :--- | :--- |
| [01_information-hierarchy.md](./01_information-hierarchy.md) | 情報の正本と優先順位（AGENTS.md・docs・skills の役割） | Markdown と `docs/` |
| [02_git-workflow.md](./02_git-workflow.md) | Git 運用、環境復旧、フック | `.git/`、`.agent/hooks/` |
| [03_doc-style.md](./03_doc-style.md) | 文書の書式と文体 | `docs/**/*.md`、`README.md` |
| [04_verification.md](./04_verification.md) | 検証・品質保証（`make check` など） | 全般（常時） |
| [project-template.md](./project-template.md) | テンプレート利用時の追記ルール | `AGENTS.md`、`project-overview` skill |

## 共通規約（`common/`、ECC 由来・本リポジトリ向けに調整）

| ファイル | 内容 | 発火条件 |
| :--- | :--- | :--- |
| [common/code-review.md](./common/code-review.md) | レビューの観点と手順（セキュリティ観点は code-reviewer に依頼） | 全般（常時） |
| [common/development-workflow.md](./common/development-workflow.md) | 計画 → 実装 → 検証 → レビューの流れ | 全般（常時） |
| [common/security.md](./common/security.md) | 秘密情報の扱い、入力の検証、依存の扱い | 全般（常時） |
| [common/git-workflow.md](./common/git-workflow.md) | コミットとブランチの規約（AGENTS.md §4.2 を参照） | 全般（常時） |
| [common/agents.md](./common/agents.md) | サブエージェントの使い分け（`.agent/agents/` の定義を使う） | 全般（常時） |
| [common/hooks.md](./common/hooks.md) | フックの種類と配置（`.agent/settings.json`） | `.agent/**` |
| [common/coding-style.md](./common/coding-style.md) | コードの書き方（命名、不変性、可読性） | コード系ファイル |
| [common/testing.md](./common/testing.md) | テストの書き方と実行（テストツールは AGENTS.md §6.1 に従う） | コード系ファイル |
| [common/patterns.md](./common/patterns.md) | 設計パターンの使い方（過剰な抽象化を避ける） | コード系ファイル |
| [common/performance.md](./common/performance.md) | 性能の確認（計測してから最適化） | コード系ファイル |

> `paths` に書いたコード系の拡張子は、代表的な言語の例。プロジェクトで扱う拡張子が違う場合は、ルールの `paths` を書き換える。
