# docs/planning — 計画書

計画書は、`docs/task-list.md` の各タスクを **どの順で、どの範囲で、何をもって完了とするか** に分解する場所です。仕様そのものの正本は `../arch/`。

## まず読むもの

| 順 | 文書 | いつ読むか | 内容 |
|---:|---|---|---|
| 1 | `../task-list.md` | 常に最初 | 状態・依存・次に着手できるタスク |
| 2 | 対象タスクの計画書 | 作業に入る前 | 目的、変更範囲、禁止事項、完了条件、停止条件 |
| 3 | `../research/README.md` | 根拠となる調査が必要な時 | 調査の入口 |
| 4 | `../arch/README.md` | 仕様の確認が必要な時 | 仕様書一覧 |

## 計画書の作り方

1. `../task-list.md` に行を追加する（ID を採番。再利用しない）。
2. [`_TEMPLATE.md`](./_TEMPLATE.md) をコピーして計画書を作る。ファイル名は短く正確に、ハイフンは最大 1 つ。
3. 計画書の完了条件を満たしたら、`task-list.md` の状態と証拠を更新する。

## 計画書の一覧

| 文書 | 対応 ID | 状態 | 役割 |
|---|---|---|---|
| [`_TEMPLATE.md`](./_TEMPLATE.md) | — | 現用 | 製品実装など個別タスクの必須形式 |
| [`REPOFIX_PLAN.md`](./REPOFIX_PLAN.md) | REPOFIX-1〜6 | 完了 | テンプレート内の不整合（文書の約束と実物のずれ）を解消する計画 |
| [`AGENTSYNC_PLAN.md`](./AGENTSYNC_PLAN.md) | AGENTSYNC-1〜6 | 完了 | 公式仕様（Anthropic / Codex / agentskills.io / Hooks）と実証研究に合わせて指示ファイルと Agent 設定を更新する計画 |
| [`LANGGATE_PLAN.md`](./LANGGATE_PLAN.md) | LANGGATE-1〜4 | LANGGATE-2 のみ保留 | 日本語と英語のみを許可する検査の追加と、AGENTSYNC の残事項（上流報告・ブランチ名規約の矛盾・コミットメッセージの誤字記録）を片付ける計画 |
| [`BUN_SETUP_PLAN.md`](./BUN_SETUP_PLAN.md) | BUNSETUP-1〜4 | 1〜3 完了、4 実機検証待ち | Bun 版の対話/非対話 setup と検査の移行 |
| [`BUN_AUDIT_PLAN.md`](./BUN_AUDIT_PLAN.md) | BUNAUDIT-1 | ローカル検証済み | Bun CLI・生成物・検査のバグ監査と安全境界 |
| `INIT_STATE.md` | — | 実行時に作成 | 初期設定の作業記憶（スロット状態・予算）。承認前に書いてよい唯一のファイル |
| `INIT_PLAN.md` | — | 実行時に作成 | 承認済みの初期設定計画。書式は [`project-init`](../../.agent/skills/project-init/SKILL.md)。テンプレート本体には置かない |

派生リポジトリの初期設定時に `INIT_PLAN.md` が作られます。
