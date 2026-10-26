# TEMPLATE_REPO

Agent の作業規約・記憶・進捗を備えた **Bun ベースのプロジェクトテンプレート**。Bun 1.4.4 以降を用意し、`bun install --frozen-lockfile` でツールを導入します。検査・CLI は TypeScript（Python 製の検査プログラムなし）。

## 含まれるもの

| パス | 役割 |
| :--- | :--- |
| `AGENTS.md` / `.agent/` | 作業規約・スキル・フック（`.claude` / `CLAUDE.md` は symlink） |
| `docs/` | 進捗・仕様・計画・監査の正本 |
| `package.json` / `bun.lock` | Bun の依存とコマンド（`bun run setup`、`bun run check`） |
| `scripts/setup.ts` / `scripts/setup_manifest.ts` | 対話・非対話の初期設定、プリセット・機能の選択、OS 検出と導入案内 |
| `scripts/check_*.ts` | 文書リンク・Mermaid・日本語/英語・AGENTS.md の品質チェック |
| `.githooks/` | Bun の検証・コミットメッセージの検査。既存フックがあるときは導入を拒否 |
| `.github/workflows/` | Bun の CI と gitleaks、依存差分レビュー、リリース |
| `Makefile` | `make check` 等の Bun コマンドへの互換入口 |

`full` ブランチの MIT ライセンスのブートストラップから、7 プリセット・17 機能のマニフェストという設計を参考にしています。現用 CLI は現在の軽量テンプレート向けに書き直したものです。

## どのツールで読まれるか

`AGENTS.md` は OpenAI が始め、2025-12 に Linux Foundation の **Agentic AI Foundation**（MCP・Goose と並ぶ）へ移管された公開標準です。Codex / Claude Code / Cursor / GitHub Copilot coding agent / OpenCode / Antigravity / Grok CLI / Kimi CLI など 24 以上のツールが原生で読み、60,000 以上のリポジトリで使われていると報告されています。

| ツール | 読むファイル | 注意 |
| :--- | :--- | :--- |
| Codex | `AGENTS.md` | git root から作業ディレクトリまで各ディレクトリの `AGENTS.md` を root→下の順に連結し、**近いものが勝つ**（1 ディレクトリ 1 ファイル）。既定 **32,768 bytes** で打ち切る |
| Claude Code | `CLAUDE.md`、無ければ `AGENTS.md` | v2.1.277（2026-09-18）以降フォールバックする。`.claude/` と `CLAUDE.md` を第一に探す |
| Cursor / Copilot coding agent / OpenCode ほか | `AGENTS.md` | ツール固有ファイル（`.cursorrules` 等）へ複製せず、symlink か参照で正本を 1 つに保つ |

このテンプレートが `CLAUDE.md` → `AGENTS.md`、`.claude/` → `.agent/` の **symlink** を置くのはそのためです。内容を複製すると必ずずれます。予算（bytes・行数・字数）と段階開示の詳しい考え方は [`agents-md-authoring`](.agent/skills/agents-md-authoring/SKILL.md) と [`context-budget`](.agent/skills/context-budget/SKILL.md) にあります。

## 使い方

```bash
bun install --frozen-lockfile
bun run setup --help
bun run setup --list-presets
bun run setup                                 # 対話式。最後に適用を確認
bun run setup --preset vite-app --name my-app --dry-run
bun run setup --yes --apply --preset next-app --name my-app
bun run setup --yes --apply --language go --template go-http --name my-api --no-install
bun run check                                 # CI と同じ入口（型・単体テスト含む）
```

`--yes` のみではファイルを変更しません。非対話式の適用には **`--yes --apply` の両方**が必要です。`--dry-run` は常に読み取り専用です。既存の生成対象ファイルは保持し、変更する `package.json` は `.setup-backup/` に退避します。OS パッケージは対話式で**コマンドごとに yes と入力したときだけ**実行し、非対話式では手順の表示のみです。**文書やスキルの削除は自動では行わず、候補だけ案内します**。

| 言語 | テンプレート |
| :--- | :--- |
| TypeScript / JavaScript | Plain、Vite + React、Next.js、Bun workspace + Turbo（TypeScript のみ） |
| Python | CLI / FastAPI |
| Go | CLI / HTTP |
| Rust | CLI / Axum |

セットアップと品質ツールは Bun で管理します。Python / Go / Rust の**生成先アプリ本体**はそれぞれの標準の言語ツールを使います（Bun で Python パッケージ等を管理することはできません）。Python FastAPI は生成先の `.venv` に pip で依存を導入し、Rust Axum は `cargo fetch` を実行します。Go テンプレートは現時点で標準ライブラリのみです。`--no-install` は Bun と言語別の依存導入を両方スキップします。Bun 自体が入っていない場合は事前に導入してください。OS の自動検出は apt、Homebrew、winget、Termux pkg に対応し、それ以外は導入方法の確認を案内します。

選択した言語やテンプレートに使えない機能は、明示指定時はエラーで停止し、プリセット由来なら除外した機能を表示します。`library` プリセットは型宣言・publint・size-limit を使える生成物を作りますが、公開やリリースは自動では行いません。Husky を選択した場合も Git フックは自動登録せず、生成先で既存フックを確認してから `bun run husky:install` を明示実行します（既存フックがあれば停止）。Vitest と Playwright の初期テストは生成物の動作確認用のスモークテストです。本格的なブラウザ操作やアプリ固有のテストは派生プロジェクト側で追加してください。

Git フックを導入する場合は `bun run hooks:install`（既存の commit-msg / pre-commit フックがある場合は上書きせず停止）。`make setup` も同じ操作です。こちらの作業環境には既存の commit-msg フックがあるため、導入は行っていません。

## 運用の考え方

- 目的を確認して小さく実装 → 検証 → 記録（`AGENTS.md §1.3`）。
- `bun run check` が検証の正本。個別には `bun run links` / `mermaid` / `lang` / `agents` / `test`。
- 進捗の正本は `docs/task-list.md`。検証結果と成果物の証拠を残します。
- このテンプレートの使い方は [`.agent/skills/project-init/SKILL.md`](.agent/skills/project-init/SKILL.md) も参照してください。

## ドキュメントの探し方

- [`docs/README.md`](docs/README.md) / [`AGENTS.md`](AGENTS.md) / [`.agent/README.md`](.agent/README.md)

## ライセンス

[LICENSE](LICENSE) を参照してください。
