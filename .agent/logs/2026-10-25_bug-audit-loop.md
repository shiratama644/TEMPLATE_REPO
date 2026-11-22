# 有界なバグ監査ループと PR 判定の修正

> Date: 2026-10-25 / Task: BUGLOOP-1 / PR: 5

## 1. 指示内容

全バグの不存在は保証できない。対象と停止条件を定め、発見→再現→修正→全ゲート→隣接経路の再監査を4反復実行し、`.agent/logs/` を skill/rule に取り込む。指定の `.agent/log/` は存在しない。

## 2. 実行と証拠

- `docs/planning/BUG_LOOP_PLAN.md` §10 に各反復の RED/GREEN/未検証を記録。`tests/git_report.test.ts` の負例を先に実行し、混在 failure+queued、status failure、completed/null、skipped/neutral、truncated page で誤分類を再現した。
- `scripts/git_report.ts`: 既知失敗を unknown より優先し、GitHub commit status と PR state を取得。skip/neutral/未完了/部分取得を成功としない。局所的な失敗も API 未取得で消さない。
- `.agent/skills/bug-audit-loop/SKILL.md` に反復手順、停止条件、no-op 負例、プレビュー後の再検証、実機境界を記載。既存の ci-quality-gates skill と verification rule へ統合。古いログは変更しない。
- `bun run check`: 7 ゲート、59 pass / 2 skip / 0 fail、780 assertions。`bun run knip` と `git diff --check`: exit 0。Go/Rust ローカル・非 Linux 実機・既定ブランチ週次/手動 OSV は未検証。PR CI は push 後に確認する。

## 3. 知見

- 完了・成功の単一判定に fail と pending/skip が混在した場合は fail を優先する。API 障害は失敗の根拠を消してはいけない。
- 成功を証明するには、check runs の一覧だけでなく commit status・PR state・ページの完全性が必要。部分的に見えた失敗は保持する。
- exit 0 の no-op を防ぐため、実際の symlink/ラッパー経路、正常系の有出力と異常系の exit 非 0 を固定した負例で確認する（過去ログから抽出）。

## 4. 残り

PR #5 はユーザーの意向によりマージしない。PR CI とローカル Go/Rust・別OS・既定ブランチのOSV実行はそれぞれ区別して報告する。
