# TEMPLATE_REPO

Agent の作業規約・記憶・進捗を備えた **Bun ベースのプロジェクトテンプレート**。Bun 1.4.4 以降を用意し、`bun install --frozen-lockfile` でツールを導入します。検査・CLI は TypeScript（Python 製の検査プログラムなし）。

## 含まれるもの

| パス | 役割 |
| :--- | :--- |
| `AGENTS.md` / `.agent/` | 作業規約・スキル・フック（`.claude` / `CLAUDE.md` は symlink） |
| `docs/` | 進捗・仕様・計画・監査の正本 |
| `package.json` / `bun.lock` | Bun の依存とコマンド（`bun run setup`、`bun run verify:generated`、`bun run check`） |
| `scripts/setup.ts` / `scripts/setup-manifest.ts` / `scripts/setup-schema.ts` | Clack 対話 UI、Zod 設定検証、プリセット・機能の選択、OS 導入案内 |
| `scripts/check_*.ts` | 文書リンク・Mermaid・日本語/英語・AGENTS.md・コミットメッセージの品質チェック |
| `.githooks/` | Bun の検証・コミットメッセージの検査。対応する既存フックは維持して連鎖実行 |
| `.github/workflows/` | Bun の CI（check・gitleaks・actionlint/zizmor・OSV-Scanner の PR 差分）、依存差分レビュー、`bun.lock` の依存提出、Dependabot PR の自動マージ、リリース |
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

新しいリポジトリでは **`bun run setup --init-only`**（対話式 TUI）を実行してください。数問に答えると `README.md`・`LICENSE`・`package.json`・`AGENTS.md §6`・`docs/`（`README` / `task-list` / `arch/` / `ops/` / `planning/_TEMPLATE`）・`.agent/skills/project-overview/`・`.agent/rules/project-template.md`・`.github/SECURITY.md` が**生成され**、テンプレート作者の痕跡（`TEMPLATE_REPO`・著作権者名・実測日付・出典リンク・`（例）` のプレースホルダ）と初期化ログ（`docs/planning/INIT_PLAN.md` / `INIT_STATE.md`）が消えます。**手で書き換えるファイルはありません。** 目的・対象・非目標を Agent と掘り下げてから決めたい場合は [`.agent/skills/project-init/SKILL.md`](.agent/skills/project-init/SKILL.md) の手順を使い、答えをこのコマンドに渡します。

## 使い方

```bash
bun install --frozen-lockfile
bun run setup --help
bun run setup --list-presets
bun run setup                                 # 対話式。計画を表示し [y/N] で適用を確認
bun run init                                  # テンプレート初期化だけ（= setup --init-only）
bun run init -- --dry-run                     # 生成する内容を確認するだけ（読み取り専用）
bun run setup --init-only --plan-json         # 計画を単一 JSON で出す（書き込みなし）
bun run init -- --cleanup none                # テンプレート専用ファイルを何も削除しない
bun run init -- --cleanup tests,gates         # 削除する候補を id で指定する（対話を省く）
bun run setup --init-only --yes --apply --init-name my-app --owner octocat/my-app --purpose "問い合わせ対応を自動化する"
bun run setup --preset vite-app --name my-app --dry-run
bun run setup --plan-json --dir . --preset vite-app --name my-app
bun run setup --yes --apply --preset next-app --name my-app
bun run setup --yes --apply --language go --template go-http --name my-api --no-install
bun run verify:generated --dir . --template next
bun run verify:generated --dir . --template next --build # 明示した場合だけ実行
bun run check                                 # CI と同じ入口（型・単体テスト含む）
```

**初期化フェーズ**は、対象ディレクトリがテンプレート（`AGENTS.md` と `docs/arch/product.md` と `.agent/skills/project-init/` がある）のとき自動的に先に走り、それ以外では何もしません（`--no-init` で明示的にスキップ）。計画（`~` 書き換え / `=` 変更なし / `-` 削除 / `!` 触らない。補足は `注意:` 行）を表示し、`[y/N]` の承認後に適用します。退避ディレクトリは作らず、復元は Git（`git restore`）が担います。初期化ログの削除は Git 管理下のときだけ行います（Git 管理外では `!` と表示して残します）。同じ答えで再実行すると「初期化済みです」となり、ファイルは変わりません。非対話式は `--yes --apply` と `--init-name` / `--owner` / `--license-holder` / `--purpose` など、または `--config` の `init`（Zod で検証）で答えを渡します。

**テンプレート専用ファイルの削除**も初期化の一部で、**すべて選択制**です（強制削除はありません）。セットアップに使う対話式 TUI も、生成先のプロジェクトには残さないほうがよいテストも、候補から選んだ物だけ消えます。対話式は候補の複数選択（スペースで選択、Enter で確定）、非対話式は既定の候補 **template-tools** / **tests** / **workspace** を削除します。`--cleanup none` は削除なし、`--cleanup all` は全候補、`--cleanup tests,gates` は id 指定です（`--config` では `cleanup: ["tests", "gates"]`）。

| id | 消す物 | 既定 |
| :--- | :--- | :--- |
| `template-tools` | `scripts/setup*.ts`・`init-*.ts`・`verify-generated.ts`・`safe-path.ts` とそのテスト、`bun run setup` / `init` / `verify:generated` | ON |
| `tests` | `_tests_/` 一式・`scripts/check-coverage.ts`・`knip.jsonc`、ゲート「テストとカバレッジ」と CI の knip・native toolchain step | ON |
| `gates` | `scripts/check*.ts`（`check-agents.ts` を除く）・`walk.ts`・`install-hooks.ts`・`.githooks/`・`Makefile`、CI の `bun run check` | off |
| `repo-ops` | `scripts/github-settings.ts`・`git-report.ts`・`docs/ops/GITHUB_SETTINGS.md`・`docs/ops/main-ruleset.json` | off |
| `ci` | `.github/workflows/`・`dependabot.yml`・`.github/fixtures/`・`.gitleaks.toml`（`SECURITY.md` は残る） | off |
| `workspace` | `.tmp/`・`.setup-backup/`（再生成できる作業用ディレクトリ） | ON |

**Agent の資産（`.agent/`・`AGENTS.md`・`.claude`・`CLAUDE.md`）と AGENTS.md の品質ゲート（`scripts/check-agents.ts`・`patches/`・`agents-md-lint`）は、どの候補にも入りません。** 削除に合わせて `package.json`（scripts と、使うファイルが全て消えた依存。残るスクリプトが叩く `typescript`（`tsc`）や `knip` は残します）・`scripts/check.ts`（import とゲート）・`.github/workflows/ci.yml`（step）・`Makefile`（ターゲットと `.PHONY`）を書き換え、生成する文書（`README.md`・`AGENTS.md §6`・`docs/`）は削除後に実在するコマンドだけを載せます。残すスクリプトが import するファイルは消さず `=`（保持）と表示し、Git 管理外のパスは復元できないので `!`（削除しません）と表示します（`.tmp/`・`.setup-backup/` は例外として消せます）。削除後に手で読んでほしい文書は `!` で一覧します。テンプレート本体（このリポジトリ）で初期化をやり直すときは `--cleanup none` を指定してください。

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
- `bun run check` が 10 ゲート（文書・言語・入口整合・POSIX sh・関数長 100 行・Biome・型・テストと行カバレッジ 100%）の正本。独立した未使用コード検査は `bun run knip`。Actions の構文/安全監査と `bun.lock` の既知脆弱性スキャン（PR では新規脆弱性のみ、main への push と毎週では全体）は CI で実行します。依存更新は Dependabot（月次・リリースから 7 日待つ・1 PR にグループ化）が PR を出し、CI が成功した Dependabot PR は自動マージします。CI では Go/Rust ツールチェーンを要求し、実ビルドの skip を許可しません（ローカルにツールがない場合はスキップと明示します）。読み取り専用 Git/PR レポートは `bun run git:report --json`。使い方と未確認時の扱いは [`docs/ops/index.md`](docs/ops/index.md)。個別には `bun run links` / `mermaid` / `lang` / `agents` / `index` / `shell` / `length` / `coverage` / `test`。
- `fast-check` は開発用依存で、名前・パス保護の再現可能な生成テストに使います（生成先アプリへ自動追加はしません）。
- `agents-md-lint@1.0.1` は npm bin の無出力成功を防ぐ依存パッチを Bun の `patchedDependencies` で適用します。`bun install --frozen-lockfile` 後に利用してください。`bun run check` の回帰テストでは Node.js 18 以降で npm bin を起動します（上流の npm パッケージ自体には未反映）。
- 進捗の正本は `docs/task-list.md`。検証結果と成果物の証拠を残します。
- 脆弱性の報告窓口は [`.github/SECURITY.md`](.github/SECURITY.md)（派生プロジェクトでは書き換える）。Dependabot alerts・secret scanning・`main` の ruleset など GitHub 側の手動設定は [`docs/ops/GITHUB_SETTINGS.md`](docs/ops/GITHUB_SETTINGS.md) に Web UI の手順があります（API での同じ設定と `main-ruleset.json` の雛形は [`docs/ops/index.md`](docs/ops/index.md)）。gh で一括設定するなら `bun run github:settings --apply`（管理者権限と `gh auth login` が必要、`--check` で状態確認）。Agent は `.env` / `secrets/**` を読み取らず、再帰的な `rm` も実行しません（`.agent/hooks/block-secret-read.sh`）。
- このテンプレートの使い方は [`.agent/skills/project-init/SKILL.md`](.agent/skills/project-init/SKILL.md) も参照してください。

## ドキュメントの探し方

- [`docs/README.md`](docs/README.md) / [`AGENTS.md`](AGENTS.md) / [`.agent/README.md`](.agent/README.md)

## ライセンス

[LICENSE](LICENSE) を参照してください。
