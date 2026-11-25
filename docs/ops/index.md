# ops/ — 運用手順

このフォルダには、プロジェクトを運用するための手順を置きます（例: リリースの手順、定期的な確認作業、共有アカウントや権限の扱い）。

## 書くときの注意

- 手順は、誰が読んでも同じ結果になるように具体的に書く。
- 秘密情報（パスワード・トークン・個人情報）は書かない。保管場所だけを書く。
- 手順を変えたら、同じ変更の中で更新する。

## 現在の内容

品質ゲートと読み取り専用レポートの実行方法、GitHub 側の手動設定（`main` の ruleset 雛形 [`main-ruleset.json`](./main-ruleset.json) を含む）を以下に記載します。

## 品質ゲートと読み取り専用レポート

- `bun run check` は 10 ゲート、`bun run knip` は未使用コード/依存の独立ゲート。追加した 3 つは次のとおりです。
  - **POSIX sh**（`bun run shell`）: `.agent/hooks/*.sh` と `.githooks/*` の shebang・`dash -n`・bashism（`[[ ]]`・`${var/pat/rep}`・`&>`・`source`・`set -o` 等）を検査します。コメントは対象外で、`[[:space:]]` は POSIX の文字クラスとして許可します。Windows では skip を表示します。
  - **関数長**（`bun run length`）: `scripts/**/*.ts` の関数・メソッド・アロー関数を TypeScript の AST で数え、100 行超えたら失敗します（現状の最長は `setup.ts` の `run` 90 行）。テストはシナリオを上から読むため対象外です。
  - **テストとカバレッジ**（`bun run coverage`）: `bun test --coverage` を実行し、行カバレッジの合計が 100% を下回ったら失敗します（1 行でも取りこぼすと NG）。CLI として起動するモジュール（`setup.ts`・`setup-plan.ts`・`setup-apply.ts`・`setup-install.ts`・`setup-package.ts`・`verify-generated.ts`・`check.ts`・`check-agents.ts`・`github-settings.ts`・`git-report.ts`・`setup-init.ts`）は、実コマンドの実行・対話・OS 判定を差し替え可能な実行環境（`SetupUi` / `PlanEnv` / `InstallEnv` / `BuildEnv` / `Runner` / `LintRunner` / `GhRunner` / `Prompter`）として最後の引数に受け取り、テストから直接呼ぶので計測に含まれます。`process.exit` は入口関数（`setupEntry` / `verifyEntry` / `reportEntry`）に閉じ込め、`if (import.meta.main)` は 1 行だけ残します。数値は「全行が少なくとも一度は実行された」ことを示すだけで、検証の強さはテストの中身（アサーション）が決めます。Knip 6.43.0 は Node 環境の raw transfer で仮想メモリ確保に失敗するため `KNIP_DISABLE_RAW_TRANSFER=1` を固定。設定の例外は `knip.jsonc` に理由を記載。`--fix` は使わない。
- **テンプレート初期化**（`bun run init` = `bun run setup --init-only`）は、`scripts/init-detect.ts` が作者の痕跡（作者のリポジトリ名・著作権者名・プレースホルダの例示・実測日付・出典リンク）と実物（`package.json` のコマンド・`scripts/check.ts` のゲート名・`docs/` の構成・Git remote）を検出し、`scripts/init-docs.ts` / `init-agents.ts` / `init-arch.ts` が文書を生成して `scripts/setup-init.ts` が計画・承認・適用・検証を行います。`--dry-run` は読み取り専用、`--plan-json` は単一 JSON、`--yes --apply` で非対話適用。退避ディレクトリは作らず（復元は `git restore`）、初期化ログ `docs/planning/INIT_PLAN.md` / `INIT_STATE.md` は Git 管理下のときだけ削除します。適用後は痕跡が 0 件であることを同じコマンドが確認し、残っていれば exit 1 です。同じ答えでの再実行は何も書き換えません。
- `bun run git:report -- --json`（または `bun scripts/git-report.ts --json`）は現在の Git 状態のみ。`bun scripts/git-report.ts --branch <期待ブランチ> --repo owner/name --pr <番号> --json` は `GITHUB_TOKEN` があるときだけ PR を GET で参照する。`pass` / `fail` / `unknown` を分け、未確認時は exit 1。出力を共有するときはコミット件名に秘密がないか確認すること。トークンをコマンド引数に渡さない。
- CI（`ci.yml`）は main への push・PR・merge queue（`merge_group`）・手動で実行します。PR の連続 push は前の実行を打ち切り、main への push は打ち切りません。`check` ジョブは `bun run check`（`CI_REQUIRE_NATIVE=1`）と `bun run knip` を実行し、Go/Cargo を必須として実ビルドのスキップを禁止します。ローカルでは両ツールがなければ 2 テストが skip になるため、CI 成功をローカルの実行済み証拠と混同しないでください。
- actionlint 1.7.12（配布バイナリを SHA-256 で固定）と zizmor は CI の `workflow-audit` で正常系と負例（`.github/fixtures/`）を実行します。zizmor は `zizmorcore/zizmor-action` 経由で、ハッシュ検証済みの wheel を PyPI から取ります。zizmor の版は action の版に同梱される lock で決まるので、Dependabot が action の SHA を更新したときに一緒に上がります。監査条件は通信なし（`online-audits: false`）・`strict-collection`・`min-severity: medium`・`advanced-security: false`（GHAS への SARIF 提出は findings で失敗しないため、findings でジョブを失敗させる）。actionlint のダウンロード/検査失敗、zizmor の wheel 取得失敗はジョブ失敗。
- OSV-Scanner v2.7.0 は 2 つの役割に分かれます。PR では CI の `osv-pr`（`osv-scanner-reusable-pr.yml`）が base との差分で**新規**の脆弱性だけを失敗させます（SARIF なし）。`bun.lock` 全体は `osv-scan.yml` が main への push（`bun.lock` / `package.json` の変更時）・毎週月曜 04:23 UTC・手動で走査し、SARIF を Code scanning へ提出します（`security-events: write`。GHAS の無い private repository では `upload-sarif: false` に変えてください）。PR の dependency-review は Dependency graph 上の差分を検査する別の役割です。DB 通信不能・スキャン失敗を「脆弱性 0 件」と読まない。定期/手動 workflow はデフォルトブランチに反映された後に実行を確認すること。
- `dependency-submission.yml` は main への push（`bun.lock` / `package.json` の変更時）・手動で `charpeni/bun-lock-submission` に `bun.lock` を Dependency graph へ提出させます。GitHub は `bun.lock` を解析しないため、推移依存の Dependabot alert はこれが出します。**前提**: Settings → Code security and analysis の Dependabot alerts が有効であること（無効なら提出しても alert は出ません。下の「GitHub リポジトリ設定」参照）。`contents: write` はスナップショット API に必要で、提出ジョブだけに渡します。この workflow は `main` に反映されて初めて登録されるため、PR ブランチにしか無い間は Actions の一覧にも CLI dispatch にも出ません（404。2026-11-23 実測）。`main` への push で `bun.lock` / `package.json` が変わっていれば自動実行され、出ない場合だけ `gh workflow run "Dependency Submission"` で 1 回実行してください（画面なら Actions → 「Dependency submission」→ Run workflow）。Dependabot は Bun に security 更新 PR を出さないので、alert は人手または月次の version 更新で対処します。
- `dependabot.yml` は `github-actions`（version 更新と security 更新をそれぞれ 1 グループ）と `bun`（version 更新のみ）を月次で更新し、cooldown 7 日でリリース直後の版を避けます（security 更新は cooldown の対象外）。`dependabot-auto-merge.yml` は Dependabot の PR で `CI` が成功したあと、全チェックの完了を待って squash merge します（`workflow_run` は main のこの workflow を書き込み権限で動かしますが、PR のコードを checkout も実行もしません。失敗するチェックがあれば何もせず終わります）。`main` の保護規則で必須チェックを設定している場合は、ジョブ名の変更（`OSV bun.lock full scan` → `OSV bun.lock 新規脆弱性（PR 差分）`）を反映してください。Renovate は未導入です（Bun の security 更新 PR など Dependabot で足りなくなった機能が出たら移行を検討）。
- `release.yml` はタグ `v*.*.*` で `verify`（CI と同じ check + knip。`contents: read`）→ `release`（`gh release create --verify-tag --generate-notes`。`contents: write` はこのジョブだけ）の順に実行します。タグ名にハイフンが入る版（`v1.2.3-rc.1` など）は `--prerelease` を付けて pre-release にします。

## GitHub リポジトリ設定（手動で有効化）

workflow だけでは担保できない設定です。管理者権限を持つアカウントで **Settings → Code security**（旧画面では Code security and analysis）から有効化するか、管理者 token の `gh api` で行います。Agent の token に管理者権限が無い場合は変更できず、確認だけを行って報告します。

**画面から設定する場合は [GITHUB_SETTINGS.md](./GITHUB_SETTINGS.md) にクリック先・設定値・確認方法をまとめてあります。**

gh で一括設定するなら `bun run github:settings` を使います（管理者権限のあるアカウントで `gh auth login` 済みであること）。

- 既定は dry-run で、実行する 5 コマンドを表示するだけです。
- `--apply` で適用し、続けて現在の状態を検証します（`pass` / `fail` / `unknown` を表示、未達成なら exit 1）。
- `--check` は書き込まずに現在の状態だけを確認します。
- `--repo owner/name` で対象を指定（既定は `git remote get-url origin` から判定）。ruleset は同名（`main-protection`）が既にあれば更新（PUT）、無ければ作成（POST）します。

下の表は API で同じことをする場合の一覧です。

| 設定 | 有効にするもの | 管理者 token でのコマンド |
| :--- | :--- | :--- |
| Dependabot alerts | `dependency-submission.yml` の提出と OSV の結果を alert として受け取る。これが無いと提出しても何も起きない | `gh api -X PUT repos/<owner>/<repo>/vulnerability-alerts` |
| Dependabot security updates | `dependabot.yml` の `github-actions-security` group が security 更新 PR を出す | `gh api -X PUT repos/<owner>/<repo>/automated-security-fixes` |
| Secret scanning + Push protection | 公開 repository は無料で**既定で有効**。commit / push の時点で秘密情報を止める。`GET /repos/<owner>/<repo>` の `security_and_analysis` は公開 repository では `null` のままなので API では確認できない（2026-11-23 実測） | `gh api -X PATCH repos/<owner>/<repo> -f 'security_and_analysis[secret_scanning][status]=enabled' -f 'security_and_analysis[secret_scanning_push_protection][status]=enabled'` |
| Private vulnerability reporting | Security タブの「Report a vulnerability」（`.github/SECURITY.md` の窓口） | `gh api -X PUT repos/<owner>/<repo>/private-vulnerability-reporting` |
| `main` の ruleset | 削除・force push の禁止、PR の必須化、CI チェックの必須化。`AGENTS.md §2` の「main 直接 push 禁止」を GitHub 側でも強制する | `gh api -X POST repos/<owner>/<repo>/rulesets --input docs/ops/main-ruleset.json` |

`main-ruleset.json` の必須チェック名は CI のジョブ名と一致させます（reusable workflow を呼ぶ job は ` / <job>` が付く）。ジョブ名を変えたら同じ変更で更新してください。`strict_required_status_checks_policy` は `false` です（Dependabot の自動マージは `gh pr checks --watch` で全チェックを待つため、branch を最新に保つ要件は設けません）。merge queue を使うときは `ci.yml` と `dependency-review.yml` の `merge_group` トリガーが必須チェックを揃えます。`osv-pr` と `依存関係の差分レビュー` は PR の base/head を読むため merge queue では skip し（skip は必須チェックとして成功扱い）、merge 結果の全体スキャンは main への push 時の `osv-scan.yml` が担います。

## コミットメッセージの形式ゲート

`.githooks/commit-msg` は日本語/英語ゲートの後で `conventional-commits-parser` による形式検証を実行し、失敗時は commit を拒否します。見出しは `feat` / `fix` / `docs` / `test` / `refactor` / `perf` / `chore` / `build` / `ci` のいずれか、任意の英数字・`_`・`-` の scope、任意の `!`、`: ` と空でない件名。本文・Git コメント・scissors 以下は形式検証対象外です。

`bun run commit:check <コミットメッセージファイル>` は形式だけを手動検査します。`bun install` の postinstall は Git repository のルートであるとき `.githooks` を自動有効化します。既存の `.git/hooks/commit-msg` と `pre-commit` は書き換えず、新フックから検査成功後に連鎖実行します（既存の trailer 等も維持）。再実行は `bun run hooks:install`。他の実行可能な Git フックや別の `core.hooksPath` がある場合は安全のため導入を失敗させ、既存設定を変えません。Git 管理外のアーカイブでは postinstall は何も変更せず終了します。`--ignore-scripts` で依存導入した場合は自動導入されないので、`bun run hooks:install` を明示実行してください。
