# TEMPLATE_REPO

AI Agent に作業を任せるとき、**規約・記憶・進捗管理・ドキュメントの土台**を最初から揃えておくための汎用テンプレートです。
ソフトウェア開発に限らず、文書作成・調査・データ整理・設定作業など、さまざまな用途に使えます。

GitHub の「Use this template」から新しいリポジトリを作成し、プロジェクトごとに書き換えて使うことを想定しています。

## 含まれるもの

| パス | 役割 |
| :--- | :--- |
| `AGENTS.md` | Agent が必ず守る作業規約（作業単位・検証・Git 運用・コミュニケーション規約）。§6 にプロジェクト固有のルールを書く。`CLAUDE.md` はこのファイルへの symlink |
| `.agent/` | Agent の設定と知識。ルール（`rules/`）・スキル（`skills/`）・フック（`hooks/`）・サブエージェント定義（`agents/`）・コマンド（`commands/`）など。`.claude` はこのディレクトリへの symlink。上流由来の資産の出典は `.agent/THIRD_PARTY_NOTICES.md` |
| `docs/` | ドキュメント一式。`task-list.md`（進捗の正本）・`arch/`（仕様）・`adr/`（個別の設計判断）・`planning/`（計画）・`research/`（調査）・`audit/`（監査）・`ops/`（運用） |
| `LICENSE` | ライセンス |

ソフトウェア開発向けの設定（ビルド・テスト・Lint・CI など）は含めていません。Agent 側の skill にはソフトウェア向けのものも含みますが、分野に合わなければ使わなくてよく、`.agent/` は Node.js・pnpm などのランタイムに依存しません。必要になったプロジェクトで、`AGENTS.md §6.1` に検証手段を記録しながら追加してください。

## 使い方

1. GitHub の「Use this template」から新しいリポジトリを作成する
2. `README.md` をプロジェクトの内容に書き換える
3. `AGENTS.md §6` にプロジェクト固有のルールを書く（特に **§6.1 の検証コマンド**）
4. `.agent/skills/project-overview/SKILL.md` をプロジェクトに合わせて書き換える
5. `docs/task-list.md` にタスクを登録し、`docs/README.md` の目次を更新する
6. Agent に作業を依頼する

## 運用の考え方

- **小さく実行 → 検証 → 記録 → 次へ** のサイクルを基本とする（`AGENTS.md §1〜§2`）。
- **進捗の正本は `docs/task-list.md`**。完了は自己申告ではなく、検証結果や成果物などの証拠で判定する。
- **Git は復元チェックポイント**として使う。検証が通った状態だけをコミットする（`AGENTS.md §4`）。
- **分野に合わせてスキルを選ぶ**。`.agent/skills/index.md` の「分野」列を見て、不要なものは削除してよい。

## ドキュメントの探し方

- 全体の目次: [`docs/README.md`](docs/README.md)
- 開発規約: [`AGENTS.md`](AGENTS.md)
- Agent の知識の入口: [`.agent/skills/index.md`](.agent/skills/index.md)
- Agent 設定の説明: [`.agent/README.md`](.agent/README.md)

## ライセンス

[LICENSE](LICENSE) を参照してください。
