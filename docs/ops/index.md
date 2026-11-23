# ops/ — 運用手順

このフォルダには、プロジェクトを運用するための手順を置きます（例: リリースの手順、定期的な確認作業、共有アカウントや権限の扱い）。

## 書くときの注意

- 手順は、誰が読んでも同じ結果になるように具体的に書く。
- 秘密情報（パスワード・トークン・個人情報）は書かない。保管場所だけを書く。
- 手順を変えたら、同じ変更の中で更新する。

## 現在の内容

品質ゲートと読み取り専用レポートの実行方法を以下に記載します。

## 品質ゲートと読み取り専用レポート

- `bun run check` は既存の 8 ゲート、`bun run knip` は未使用コード/依存の独立ゲート。Knip 6.43.0 は Node 環境の raw transfer で仮想メモリ確保に失敗するため `KNIP_DISABLE_RAW_TRANSFER=1` を固定。設定の例外は `knip.jsonc` に理由を記載。`--fix` は使わない。
- `bun run git:report -- --json`（または `bun scripts/git_report.ts --json`）は現在の Git 状態のみ。`bun scripts/git_report.ts --branch <期待ブランチ> --repo owner/name --pr <番号> --json` は `GITHUB_TOKEN` があるときだけ PR を GET で参照する。`pass` / `fail` / `unknown` を分け、未確認時は exit 1。出力を共有するときはコミット件名に秘密がないか確認すること。トークンをコマンド引数に渡さない。
- CI（`ci.yml`）は main への push・PR・手動で実行します。PR の連続 push は前の実行を打ち切り、main への push は打ち切りません。`check` ジョブは `bun run check`（`CI_REQUIRE_NATIVE=1`）と `bun run knip` を実行し、Go/Cargo を必須として実ビルドのスキップを禁止します。ローカルでは両ツールがなければ 2 テストが skip になるため、CI 成功をローカルの実行済み証拠と混同しないでください。
- actionlint 1.7.12（配布バイナリを SHA-256 で固定）と zizmor は CI の `workflow-audit` で正常系と負例（`tests/fixtures/`）を実行します。zizmor は `zizmorcore/zizmor-action` 経由で、ハッシュ検証済みの wheel を PyPI から取ります。zizmor の版は action の版に同梱される lock で決まるので、Dependabot が action の SHA を更新したときに一緒に上がります。監査条件は通信なし（`online-audits: false`）・`strict-collection`・`min-severity: medium`・`advanced-security: false`（GHAS への SARIF 提出は findings で失敗しないため、findings でジョブを失敗させる）。actionlint のダウンロード/検査失敗、zizmor の wheel 取得失敗はジョブ失敗。
- OSV-Scanner v2.7.0 は 2 つの役割に分かれます。PR では CI の `osv-pr`（`osv-scanner-reusable-pr.yml`）が base との差分で**新規**の脆弱性だけを失敗させます（SARIF なし）。`bun.lock` 全体は `osv-scan.yml` が main への push（`bun.lock` / `package.json` の変更時）・毎週月曜 04:23 UTC・手動で走査し、SARIF を Code scanning へ提出します（`security-events: write`。GHAS の無い private repository では `upload-sarif: false` に変えてください）。PR の dependency-review は Dependency graph 上の差分を検査する別の役割です。DB 通信不能・スキャン失敗を「脆弱性 0 件」と読まない。定期/手動 workflow はデフォルトブランチに反映された後に実行を確認すること。
- `dependency-submission.yml` は main への push（`bun.lock` / `package.json` の変更時）・手動で `charpeni/bun-lock-submission` に `bun.lock` を Dependency graph へ提出させます。GitHub は `bun.lock` を解析しないため、推移依存の Dependabot alert はこれが出します。`contents: write` はスナップショット API に必要で、提出ジョブだけに渡します。paths フィルタ付き workflow は新規 repository の最初の push では動かないので、導入直後に 1 回は手動実行してください。Dependabot は Bun に security 更新 PR を出さないので、alert は人手または月次の version 更新で対処します。
- `dependabot.yml` は `github-actions`（version 更新と security 更新をそれぞれ 1 グループ）と `bun`（version 更新のみ）を月次で更新し、cooldown 7 日でリリース直後の版を避けます（security 更新は cooldown の対象外）。`dependabot-auto-merge.yml` は Dependabot の PR で `CI` が成功したあと、全チェックの完了を待って squash merge します（`workflow_run` は main のこの workflow を書き込み権限で動かしますが、PR のコードを checkout も実行もしません。失敗するチェックがあれば何もせず終わります）。`main` の保護規則で必須チェックを設定している場合は、ジョブ名の変更（`OSV bun.lock full scan` → `OSV bun.lock 新規脆弱性（PR 差分）`）を反映してください。Renovate は未導入です（Bun の security 更新 PR など Dependabot で足りなくなった機能が出たら移行を検討）。
- `release.yml` はタグ `v*.*.*` で `verify`（CI と同じ check + knip。`contents: read`）→ `release`（`gh release create --verify-tag --generate-notes`。`contents: write` はこのジョブだけ）の順に実行します。

## コミットメッセージの形式ゲート

`.githooks/commit-msg` は日本語/英語ゲートの後で `conventional-commits-parser` による形式検証を実行し、失敗時は commit を拒否します。見出しは `feat` / `fix` / `docs` / `test` / `refactor` / `perf` / `chore` / `build` / `ci` のいずれか、任意の英数字・`_`・`-` の scope、任意の `!`、`: ` と空でない件名。本文・Git コメント・scissors 以下は形式検証対象外です。

`bun run commit:check <コミットメッセージファイル>` は形式だけを手動検査します。`bun install` の postinstall は Git repository のルートであるとき `.githooks` を自動有効化します。既存の `.git/hooks/commit-msg` と `pre-commit` は書き換えず、新フックから検査成功後に連鎖実行します（既存の trailer 等も維持）。再実行は `bun run hooks:install`。他の実行可能な Git フックや別の `core.hooksPath` がある場合は安全のため導入を失敗させ、既存設定を変えません。Git 管理外のアーカイブでは postinstall は何も変更せず終了します。`--ignore-scripts` で依存導入した場合は自動導入されないので、`bun run hooks:install` を明示実行してください。
