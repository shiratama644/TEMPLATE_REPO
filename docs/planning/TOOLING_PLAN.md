# TOOLING-1〜3: 検証ツールと読み取り専用 Git レポートの導入

> 対応 task-list ID: `TOOLING-1`〜`TOOLING-3`（`docs/task-list.md`）
> 計画書テンプレート: `docs/planning/_TEMPLATE.md` 準拠

## 1. 開始前確認

- 固定ブランチの作業状態を確認。再構築でローカル HEAD が起点に戻ったが、FETCH_HEAD の 202 ファイル・mode・symlink をすべて現物と比較し、差分・余分なファイル 0 を確認してから `git reset --hard FETCH_HEAD` の既存例外を実行した。
- Bun 1.4.4 をリポジトリ外で復旧し `bun install --frozen-lockfile` 成功。`AGENTS.md §6.1`、`docs/task-list.md`、既存 7 ゲート・PR チェックを確認。

## 2. 目的 (Why)

Actions 構文・ワークフローの危険設定・未使用依存・既知脆弱性を独立したゲートで検査し、ローカル Git 状態と PR の状況・Conventional Commits を変更なしで照合できるようにする。ライブラリを入れるだけの空実装を避け、負のテストと出力の可視性で効果を測る。

## 3. 変更範囲 (Scope)

`.github/workflows/`、`scripts/check.ts` と新規検査・レポート、`package.json`・`bun.lock`、Knip 設定、テスト、README・アーキテクチャ・第三者通知・タスク・計画・ログ。CI は Bun と独立した検査ジョブを追加できる。

変更しない: 既存の承認/安全ゲート、過去のログ・ADR、生成先プロジェクトの自動公開、main への push/PR の自動マージ。

## 4. 禁止事項

- 自動実行される Git 書込（reset/checkout/add/commit/push）・PR 投稿・マージは導入しない。GitHub 権限は読取専用。秘密情報は出力/保存しない。
- Knip の `--fix` は使わず、動的参照・生成文字列を理由なく削らない。OSV の無結果/通信失敗を脆弱性 0 件として扱わない。
- ツール取得/CI のエラーを `continue-on-error` で隠さない。追加 OS パッケージは毎回個別承認なしに導入しない。

## 5. 完了条件 (DoD)

- [ ] actionlint が workflow の構文・式の負の fixture を止め、zizmor が危険な workflow fixture を検出する。固定バージョンで CI 実行できる。
- [ ] Knip は本テンプレートの CLI エントリを認識し、根拠を記録した設定でゲート化。既存生成テンプレートは削除しない。
- [ ] OSV-Scanner は `bun.lock` を対象として定期・手動実行でき、既存 PR の dependency-review と役割が分離される。通信不能は未検証と報告する。
- [ ] simple-git + @octokit/rest + conventional-commits-parser による読み取り専用レポートを実装。ローカルのみ・PR 参照の双方にテスト、ブランチ/HEAD 不一致・CI 未完了・未解析のコミットを区別する。
- [ ] `bun run check` と PR CI 成功。証拠・実環境未検証を `docs/task-list.md` とログへ記録する。

## 6. テスト方法

| 層 | 実施 | 確認内容 |
|---|---|---|
| Unit | Bun test | 一時 Git リポジトリ、コミット分類、固定ブランチ guard、Octokit のモック応答、失敗と欠落の区別 |
| Component | 各 CLI の fixture | workflow の正常・負例、Knip の結果、OSV の解析対象と通信失敗 |
| E2E | `bun run check` / PR CI | Bun ゲートと独立した workflow/security ジョブ、破損した入力で exit 非 0 |
| 実環境 | 別タスク | macOS / Windows / Termux と OS パッケージ導入は BUNSETUP-4 |

## 7. 停止条件

復旧照合に不一致、外部への書込/公開や権限拡大の必要、新規 OS パッケージの導入、通信が必須なのに検証不能な部分は作業を保留し、実測を記録する。

## 8. 完了時に行うこと

小単位で全ゲート→差分確認→Conventional Commit→固定ブランチへ push。PR CI と OSV の定期/手動経路を検証し、ログを追記する。

## 9. サブタスク分割

| ID | テーマ | 主な成果物 | 依存 |
|---|---|---|---|
| TOOLING-1 | actionlint / zizmor | Actions 品質・安全ゲート、負の fixture | — |
| TOOLING-2 | knip / OSV-Scanner | 未使用依存ゲート・脆弱性の定期スキャン | TOOLING-1 |
| TOOLING-3 | simple-git / Octokit / commit parser | 読取専用のローカル・PR レポート | TOOLING-1 |

## 10. 設計詳細・自己改善ループ

各サブタスクで **最大 4 反復**（探索・実装→正常/負の fixture→全ゲート/CI→差分自己レビュー）を行う。失敗はログ/fixture で再現し原因を修正して再実行。2 回連続で改善せず外部制約が原因ならその経路を保留して停止し、勝手に skip/緩和しない。小さな成功はチェックポイントとして commit / push する。7 候補の採用だけを成功基準とせず、誤った成功表示が無いことと既存のゲートの維持を最後に確認する。

Git レポートは `--json` と人向け表示を共有する内部データ構造とし、ローカルでは `status`・HEAD・ブランチ・直近コミットの分類のみ。PR 参照は明示フラグ＋環境の読み取り専用 GitHub 認証がある場合に限る。API 失敗は不明/未確認とし PASS にしない。ネットワークや書込権限がないテストでは注入した API クライアントをモックする。

## 11. リスク・Gotchas

7 候補は JS ライブラリと Go/Rust 製 CLI の混在。固定バージョン・配布経路・署名/チェックサムを記録し、ビルドや CI のランタイムを確認する。OSV の完全スキャンは PR の差分レビューと異なり既存脆弱性で失敗し得る。CI 外部接続不能と脆弱性なしを混同しない。Agent フックや Git 操作を自動化して安全境界を変えない。

## 12. 実績と証拠

- 反復 1（探索）: actionlint v1.7.12 リリース資産の SHA-256 を公開 API で照合。サンドボックスからのバイナリ取得は EOF で失敗。zizmor 1.31.1 の初回監査で unpinned-uses・artipacked・Dependabot cooldown・cache-poisoning を検出し、SHA 固定・権限・設定で修正。既存の診断を ignore で隠していない。
- 反復 2（負例）: zizmor オフライン正常 exit 0、意図的な template-injection fixture は exit 14。Knip 6.43.0 は Node 上の oxc-parser 6 GiB 仮想バッファ確保が失敗。`KNIP_DISABLE_RAW_TRANSFER=1` で根の exit 0、独立した未使用ファイル fixture の exit 1 を確認。Knip の個別例外は外部 Lace サンプル、パッチ済み CLI の動的呼出、util-linux の `script(1)` に限定。
- 反復 3（単体/統合）: Git/PR の読み取り専用レポートは一時 Git repo と API モックで正常、branch/HEAD 不一致、未完了/失敗 checks、通信不能を区別。Linux の `bun run check` は 7 ゲート・48 pass / 2 skip / 716 assertions、`bun run knip` exit 0。actionlint の実バイナリ、OSV の DB 照会・定期/手動実行と今回の PR CI は**未検証**。未確認を成功としない。
- 反復 4（差分レビュー/実環境）は CI 実行後に続行。GitHub Releases や GHCR への接続障害が続く場合は保留とする。

- 反復 4（実 CI と差分確認）: `ee2df51` の PR #5 push / pull_request CI で actionlint の固定資産検証・正常/負例、zizmor、Bun 全ゲート、Knip、gitleaks、dependency-review が PASS（PR CI run `44930666010`、push run `44930660916`）。Git/PR 実 API は PR #5 の head とチェックをローカルから読取専用照合して pass。サンドボックスの Bun TLS は信頼する CA 設定がないと unknown / exit 1（証明書検証は無効化せず、`NODE_EXTRA_CA_CERTS` に検証済み環境 CA を指定して再試験）。OSV 手動起動は既定ブランチに workflow が無いため HTTP 404、実走査は未検証。TOOLING-2 はデフォルトブランチ反映後まで保留。
