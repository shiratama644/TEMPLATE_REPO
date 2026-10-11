# Skills Index — Agentのスキル集

> このファイルは `.agent/skills/` の**入口**。タスク着手時に本ファイルだけ読み、
> 必要なスキルだけをピンポイントで読み込む（コンテキストの無駄遣いを防ぐ）。
>
> ここにあるのは **Agent 自身のスキル** — 「このプロジェクトで何をどうやるとうまくいくか」
> という実践的なノウハウ・手順・パターン。設計仕様の正本ではない。設計の正本は `docs/`。
> 作業規約は `AGENTS.md` と `.agent/rules/`。
>
> 各スキルは `<name>/SKILL.md`（YAML frontmatter に `name` / `description`）。

## 読み方ガイド（どの状況でどのスキルを使うか）

| 状況 | 使うスキル |
| :--- | :--- |
| 初回 / 全体把握 | [`project-overview/SKILL.md`](./project-overview/SKILL.md) |
| 技術の選定・設定・記録 | [`tech-stack/SKILL.md`](./tech-stack/SKILL.md) |
| 「動かない / 検証できない / 外部に接続したい」環境トラブル | [`sandbox-constraints/SKILL.md`](./sandbox-constraints/SKILL.md) |
| ドキュメント変更後の整合性検証 | [`verify-doc-integrity/SKILL.md`](./verify-doc-integrity/SKILL.md) |
| ドキュメント整理・URL検証・重複の解消 | [`docs-maintenance/SKILL.md`](./docs-maintenance/SKILL.md) |
| 3ファイル以上の変更・判断を伴う変更のレビューレポート作成 | [`diff-review-report/SKILL.md`](./diff-review-report/SKILL.md) |
| （ソフトウェア）意味のあるテスト・カバレッジ・モック戦略 | [`testing/SKILL.md`](./testing/SKILL.md) |
| （ソフトウェア）CI の品質ゲート・ワークフロー管理 | [`ci-quality-gates/SKILL.md`](./ci-quality-gates/SKILL.md) |
| （Web）E2E テスト・ブラウザ検証 | [`e2e/SKILL.md`](./e2e/SKILL.md) |
| （ソフトウェア）レイヤー境界・import 制限・循環参照防止 | [`import-boundaries/SKILL.md`](./import-boundaries/SKILL.md) |
| （ソフトウェア）決定論・純粋関数・禁止 API 検出 | [`determinism/SKILL.md`](./determinism/SKILL.md) |
| （ソフトウェア）メモリリーク防止・リソース解放 | [`memory-leak/SKILL.md`](./memory-leak/SKILL.md) |
| （ソフトウェア）ホットパスのアロケーション削減 | [`zero-alloc/SKILL.md`](./zero-alloc/SKILL.md) |

> 「（ソフトウェア）」「（Web）」の付いたスキルは、該当分野のプロジェクトでのみ使う。
> それ以外の分野では読まなくてよい。

## 設計・進捗の正本（スキルではなく docs/）

| 文書 | 内容 |
| :--- | :--- |
| [docs/README.md](../../docs/README.md) | 全ドキュメントの目次 |
| [docs/task-list.md](../../docs/task-list.md) | タスク管理の唯一の正本 |
| [docs/arch/README.md](../../docs/arch/README.md) | 仕様書一覧 |
| [docs/planning/_TEMPLATE.md](../../docs/planning/_TEMPLATE.md) | 計画書テンプレート |
| [AGENTS.md](../../AGENTS.md) | 開発規約（§1〜§5 汎用 + §6 プロジェクト固有） |
| [.agent/rules/](../rules/) | トピック別ルール |

## スキル一覧

| スキル | できるようになること | 分野 |
| :--- | :--- | :--- |
| [project-overview](./project-overview/SKILL.md) | テンプレートの構成と運用の全体像を把握する | 共通 |
| [tech-stack](./tech-stack/SKILL.md) | 分野に応じて技術を選び、AGENTS.md §6.1 に記録する | 共通 |
| [sandbox-constraints](./sandbox-constraints/SKILL.md) | Sandbox の制約を見極め、迂回・復旧して作業を続ける | 共通 |
| [verify-doc-integrity](./verify-doc-integrity/SKILL.md) | ドキュメントのリンク実在・目次更新・機密情報の混入なしを検証する | 共通 |
| [docs-maintenance](./docs-maintenance/SKILL.md) | ドキュメントの整理・内部リンク・外部 URL の有効性を確認する | 共通 |
| [diff-review-report](./diff-review-report/SKILL.md) | 大きな変更の差分を、人間がレビューできるレポートにまとめる | 共通 |
| [testing](./testing/SKILL.md) | 意味のあるテストを書き、カバレッジの目標を達成する | ソフトウェア |
| [ci-quality-gates](./ci-quality-gates/SKILL.md) | 品質ゲートを段階的に実行し、CI と手元の検証を揃える | ソフトウェア |
| [import-boundaries](./import-boundaries/SKILL.md) | レイヤー間の依存方向を守り、循環参照と責務混在を防ぐ | ソフトウェア |
| [determinism](./determinism/SKILL.md) | 純粋ロジックの決定論を守り、same-input テストを書く | ソフトウェア |
| [memory-leak](./memory-leak/SKILL.md) | リソース解放漏れを防ぎ、回帰テストを書く | ソフトウェア |
| [zero-alloc](./zero-alloc/SKILL.md) | ホットパスでの不要なアロケーションを避ける | ソフトウェア |
| [e2e](./e2e/SKILL.md) | ブラウザの E2E テストを安定して実行する | Web |

## 運用ルール

- 新しいノウハウ（特に**実測で判明した**制約・挙動）を得たらスキルとして追加・更新する。
- 新スキル追加時は「読み方ガイド」と「スキル一覧」の両方に追記する。
- スキルは実践的なやり方・手順・回避策を書く。設計の正本は `docs/`。
- AGENTS.md と重複する作業規約はスキルに書かず、AGENTS.md / rules/ を正とする。
- 各スキルは `<kebab-case>/SKILL.md`（YAML frontmatter に `name` / `description` 必須）。`description` は自動発火の判断材料なので具体的に書く。
