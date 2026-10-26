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
| `Makefile` | 検証の入口。`make check`（全検証）・`make links`（文書リンク）・`make mermaid`（Mermaid 図）・`make agents`（`AGENTS.md` の予算と品質）・`make lang`（文書の言語）・`make setup`（フック導入）・`make help` |
| `.pre-commit-config.yaml` | commit 時の検査（衛生・形式・綴り・秘密情報・文書リンク・`AGENTS.md` の予算・コミットメッセージ）。分野を問わない構成 |
| `biome.json` / `.editorconfig` / `.gitleaks.toml` | 書式・エディタ設定・秘密情報検出の設定（分野を問わない汎用版） |
| `.github/workflows/` | CI（`ci.yml`：`make check` と gitleaks）、リリース（`release.yml`：タグで検証のうえ GitHub Release）、依存関係レビュー（`dependency-review.yml`） |
| `scripts/check_doc_links.py` | Markdown の内部リンクを検査する（標準ライブラリのみ） |
| `scripts/check_mermaid.py` | Mermaid 図の宣言（種類・重複）を検査する（標準ライブラリのみ） |
| `scripts/check_language.py` | 文書とコミットメッセージの言語を検査する（日本語と英語のみ。標準ライブラリのみ） |
| `LICENSE` | ライセンス |

ビルド・テストなど**言語固有の設定は含めていません**。CI・Biome・pre-commit は分野を問わない形で置いてあり、`make check` の `PROJECT_CHECKS` に分野固有の検証を足して使います。`.agent/` のフックは `sh` と標準的な Unix コマンドだけで動き、Node.js・pnpm などのランタイムに依存しません。検証手段は `AGENTS.md §6.1` に記録してください。

`make check` には **Node.js** が必要です（Biome と `agents-md-lint` の 2 フックが使うため）。バージョンは `.pre-commit-config.yaml` の `additional_dependencies` で固定しており、pre-commit が専用の環境を用意します。Node を使わないプロジェクトでは `SKIP=biome,agents-md-lint git commit` で一時的に外せます。

## どのツールで読まれるか

`AGENTS.md` は OpenAI が始め、2025-12 に Linux Foundation の **Agentic AI Foundation**（MCP・Goose と並ぶ）へ移管された公開標準です。Codex / Claude Code / Cursor / GitHub Copilot coding agent / OpenCode / Antigravity / Grok CLI / Kimi CLI など 24 以上のツールが原生で読み、60,000 以上のリポジトリで使われていると報告されています。

| ツール | 読むファイル | 注意 |
| :--- | :--- | :--- |
| Codex | `AGENTS.md` | git root から作業ディレクトリまで各ディレクトリの `AGENTS.md` を root→下の順に連結し、**近いものが勝つ**（1 ディレクトリ 1 ファイル）。既定 **32,768 bytes** で打ち切る |
| Claude Code | `CLAUDE.md`、無ければ `AGENTS.md` | v2.1.277（2026-09-18）以降フォールバックする。`.claude/` と `CLAUDE.md` を第一に探す |
| Cursor / Copilot coding agent / OpenCode ほか | `AGENTS.md` | ツール固有ファイル（`.cursorrules` 等）へ複製せず、symlink か参照で正本を 1 つに保つ |

このテンプレートが `CLAUDE.md` → `AGENTS.md`、`.claude/` → `.agent/` の **symlink** を置くのはそのためです。内容を複製すると必ずずれます。予算（bytes・行数・字数）と段階開示の詳しい考え方は [`agents-md-authoring`](.agent/skills/agents-md-authoring/SKILL.md) と [`context-budget`](.agent/skills/context-budget/SKILL.md) にあります。

## 使い方

### Agent に任せる（推奨）

1. GitHub の「Use this template」から新しいリポジトリを作成する
2. Agent に「初期設定して」と依頼する（手順の正本は [`.agent/skills/project-init/SKILL.md`](.agent/skills/project-init/SKILL.md)）
3. 質問に答え、提示された計画を承認する（承認するまでファイルは書き換えない）
4. 書き換え結果（`README.md` / `AGENTS.md §6` / `project-overview`）を確認する
5. 通常の作業を依頼する

### 自分で書く場合

1. GitHub の「Use this template」から新しいリポジトリを作成する
2. `README.md` をプロジェクトの内容に書き換える
3. `AGENTS.md §6` にプロジェクト固有のルールを書く（特に **§6.1 の検証コマンド**）
4. `.agent/skills/project-overview/SKILL.md` をプロジェクトに合わせて書き換える
5. `docs/task-list.md` にタスクを登録し、`docs/README.md` の目次を更新する
6. `make setup` で pre-commit を導入し、`make check` が通ることを確認する
7. Agent に作業を依頼する

## 運用の考え方

- **小さく実行 → 検証 → 記録 → 次へ** のサイクルを基本とする（`AGENTS.md §1〜§2`）。
- **進捗の正本は `docs/task-list.md`**。完了は自己申告ではなく、検証結果や成果物などの証拠で判定する。
- **Git は復元チェックポイント**として使う。検証が通った状態だけをコミットする（`AGENTS.md §4`）。
- **分野に合わせてスキルを選ぶ**。`.agent/skills/index.md` の「分野」列を見て、不要なものは削除してよい（削除は初期設定計画で承認してから）。

## ドキュメントの探し方

- 全体の目次: [`docs/README.md`](docs/README.md)
- 開発規約: [`AGENTS.md`](AGENTS.md)
- Agent の知識の入口: [`.agent/skills/index.md`](.agent/skills/index.md)
- Agent 設定の説明: [`.agent/README.md`](.agent/README.md)

## ライセンス

[LICENSE](LICENSE) を参照してください。
