# TEMPLATE_REPO

Agent の作業規約・記憶・進捗を備えた **Bun ベースのプロジェクトテンプレート**。Bun 1.4.4 以降を用意し、`bun install --frozen-lockfile` でツールを導入します。検査・CLI は TypeScript（Python 製の検査プログラムなし）。

## 含まれるもの

| パス | 役割 |
| :--- | :--- |
| `AGENTS.md` / `.agent/` | 作業規約・スキル・フック（`.claude` / `CLAUDE.md` は symlink） |
| `docs/` | 進捗・仕様・計画・監査の正本 |
| `package.json` / `bun.lock` | Bun の依存とコマンド（`bun run setup`、`bun run verify:generated`、`bun run check`） |
| `scripts/setup.ts` / `scripts/setup_manifest.ts` / `scripts/setup_schema.ts` | Clack 対話 UI、Zod 設定検証、プリセット・機能の選択、OS 導入案内 |
| `scripts/check_*.ts` | 文書リンク・Mermaid・日本語/英語・AGENTS.md・コミットメッセージの品質チェック |
| `.githooks/` | Bun の検証・コミットメッセージの検査。対応する既存フックは維持して連鎖実行 |
| `.github/workflows/` | Bun の CI（check・gitleaks・actionlint/zizmor・OSV-Scanner）、依存差分レビュー、リリース |
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

## GitHub テンプレートとして使う

GitHub の公開リポジトリで **Use this template** → **Create a new repository** を選び、自分のリポジトリを作成してください。続いて Bun 1.4.4 以降を導入し、下のコマンドで依存を固定して検査・初期設定します。`.agent/` に個別の作業ログやローカルの秘密情報は含めません。新しいリポジトリで初期設定する際は `project-init` を参照してください。

このリポジトリは GitHub テンプレートで、npm パッケージではありません（`package.json` は `private: true`）。公開ブランチにまだ反映されていない変更は、GitHub のテンプレート作成ボタンには含まれません。

## 使い方

```bash
bun install --frozen-lockfile
bun run setup --help
bun run setup --list-presets
bun run setup                                 # 対話式。計画を表示し [y/N] で適用を確認
bun run setup --preset vite-app --name my-app --dry-run
bun run setup --plan-json --dir . --preset vite-app --name my-app
bun run setup --yes --apply --preset next-app --name my-app
bun run setup --yes --apply --language go --template go-http --name my-api --no-install
bun run verify:generated --dir . --template next
bun run verify:generated --dir . --template next --build # 明示した場合だけ実行
bun run check                                 # CI と同じ入口（型・単体テスト含む）
```

対話式は `@clack/prompts` で選択・入力し、Zod で CLI/JSON 設定を検証します。入力名の既定値は出力先フォルダ名を kebab-case に正規化します。計画の提示後に `[y/N]` を尋ね、`y` / `yes` を入力したときだけ適用します。`N` または Enter のみなら変更しません。`--apply` は対話式では不要で、指定しても確認を省略しません。`--yes` のみではファイルを変更しません。非対話式の適用には **`--yes --apply` の両方**が必要です。`--dry-run` は常に読み取り専用です。既存の生成対象ファイルは保持し、変更する `package.json` は `.setup-backup/` に退避します。OS パッケージは対話式で**コマンドごとに yes と入力したときだけ**実行し、非対話式では手順の表示のみです。**文書やスキルの削除は自動では行わず、候補だけ案内します**。

`--plan-json` は非対話の**読み取り専用**プレビューで、標準出力を単一 JSON（`schemaVersion: 1`）にし、エラーは標準エラーへ出します。`--yes` は不要、`--dry-run` は暗黙的に有効になり、`--apply` / `--save-config` との併用は拒否します。`files` は `create` / `retain` / `update` と `backupPlanned`、`selection` は実際の選択と除外機能、`prerequisites` は必要ツール・未導入ツールと OS パッケージの個別確認予定、`dependencies` は Bun 依存の導入予定と未実行を示します。**JSON は承認トークンではありません**。適用時にはファイルの状態と安全条件を再確認します。ファイル本文や秘密情報は出しません。

`verify:generated` は生成先を指定して実行する**別コマンド**です。`--template` は必須（曖昧な自動推測をしません）。既定は全テンプレートの必須ファイルと manifest の存在・形式を確認する静的チェックで、外部コマンドは起動しません。`--build` を明示したときだけ標準ビルド手順を試します。Go はオフラインの `go build`、Rust はオフラインの `cargo check`、Python CLI は実行、FastAPI は既存 `.venv` から import、JS/TS は生成時の標準スクリプトのみ実行します。**依存・OS パッケージは導入しません**。前提不足や変更された build スクリプトは `blocked`、壊れた生成物やビルド失敗は `failed` と区別し、exit code は `passed=0` / `failed=1` / `blocked=2` です。ビルドは成果物・キャッシュを生成し得ます。利用者が信頼するプロジェクトだけに `--build` を指定してください。静的検査はアプリの意味的正しさまでは保証しません。

| 言語 | テンプレート |
| :--- | :--- |
| TypeScript / JavaScript | Plain、Vite + React、Next.js、Bun workspace + Turbo（TypeScript のみ） |
| Python | CLI / FastAPI |
| Go | CLI / HTTP |
| Rust | CLI / Axum |

セットアップと品質ツールは Bun で管理します。Python / Go / Rust の**生成先アプリ本体**はそれぞれの標準の言語ツールを使います（Bun で Python パッケージ等を管理することはできません）。Python FastAPI は生成先の `.venv` に pip で依存を導入し、Rust Axum は `cargo fetch` を実行します。Go テンプレートは現時点で標準ライブラリのみです。`--no-install` は Bun と言語別の依存導入を両方スキップします。Bun 自体が入っていない場合は事前に導入してください。OS の自動検出は apt、Homebrew、winget、Termux pkg に対応し、それ以外は導入方法の確認を案内します。

選択した言語やテンプレートに使えない機能は、明示指定時はエラーで停止し、プリセット由来なら除外した機能を表示します。`library` プリセットは型宣言・publint・size-limit を使える生成物を作りますが、公開やリリースは自動では行いません。Husky を選択した場合も Git フックは自動登録せず、生成先で既存フックを確認してから `bun run husky:install` を明示実行します（既存フックがあれば停止）。Vitest と Playwright の初期テストは生成物の動作確認用のスモークテストです。本格的なブラウザ操作やアプリ固有のテストは派生プロジェクト側で追加してください。

`bun install` の postinstall で、このリポジトリの `.githooks` を自動有効化します（再実行は冪等）。既存の `.git/hooks/commit-msg` と `pre-commit` はファイルを上書きせず、検査後に連鎖実行します。別の `core.hooksPath` や引き継げない種類の実行可能フックがある場合は停止して理由を表示します。Git 管理外のアーカイブでは導入を省略します。再実行は `bun run hooks:install`。形式だけを調べる場合は `bun run commit:check <メッセージファイル>`。派生プロジェクトの Husky は別の設定で、こちらの自動導入の対象ではありません。

## 運用の考え方

- 目的を確認して小さく実装 → 検証 → 記録（`AGENTS.md §1.3`）。
- `bun run check` が既存 8 ゲートの正本。独立した未使用コード検査は `bun run knip`。Actions の構文/安全監査と PR・毎週の `bun.lock` 既知脆弱性スキャンは CI で実行します。CI では Go/Rust ツールチェーンを要求し、実ビルドの skip を許可しません（ローカルにツールがない場合はスキップと明示します）。読み取り専用 Git/PR レポートは `bun run git:report --json`。使い方と未確認時の扱いは [`docs/ops/index.md`](docs/ops/index.md)。個別には `bun run links` / `mermaid` / `lang` / `agents` / `index` / `test`。
- `fast-check` は開発用依存で、名前・パス保護の再現可能な生成テストに使います（生成先アプリへ自動追加はしません）。
- `agents-md-lint@1.0.1` は npm bin の無出力成功を防ぐ依存パッチを Bun の `patchedDependencies` で適用します。`bun install --frozen-lockfile` 後に利用してください。`bun run check` の回帰テストでは Node.js 18 以降で npm bin を起動します（上流の npm パッケージ自体には未反映）。
- 進捗の正本は `docs/task-list.md`。検証結果と成果物の証拠を残します。
- このテンプレートの使い方は [`.agent/skills/project-init/SKILL.md`](.agent/skills/project-init/SKILL.md) も参照してください。

## ドキュメントの探し方

- [`docs/README.md`](docs/README.md) / [`AGENTS.md`](AGENTS.md) / [`.agent/README.md`](.agent/README.md)

## ライセンス

[LICENSE](LICENSE) を参照してください。
