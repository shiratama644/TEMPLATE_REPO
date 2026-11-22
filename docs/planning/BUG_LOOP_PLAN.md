# BUGLOOP-1: 反復監査と過去ログの知見反映

> 対応 task-list ID: `BUGLOOP-1`。`docs/planning/_TEMPLATE.md` の項目に沿う。

## 1. 開始前確認

固定ブランチ・リモート HEAD と現物の全ファイル内容・mode・symlink を照合した後、再構築された Git 管理状態のみ復旧。`bun install --frozen-lockfile`、`bun run check`（7 ゲート・54 pass / 2 skip）、`bun run knip` の基準値 PASS。指定された `.agent/log/` は存在せず、記録の正本 `.agent/logs/`（16 ファイル）を調査する。

## 2. 目的

「すべてのバグが無い」ことは有限の検査では証明できない。代わりに、重大な入力境界・失敗の誤表示・自動フック・生成セットアップを複数の方法で調べ、見つけた再現可能な不具合を回帰テストから修正する。繰り返し得られた知見を既存の skill / rule へ取り込み、古い記録を上書きしない。

## 3. 範囲

`scripts/`・`.githooks/`・`tests/` の現在の挙動、Git/PR 読取レポート、設定/生成物検証、CI の結果表示を対象とする。`.agent/logs/` を読んで `.agent/skills/ci-quality-gates/SKILL.md`・`sandbox-constraints/SKILL.md` と `.agent/rules/04_verification.md` の実測との差を確認。必要なら最小限の修正と `docs/` 索引・進捗を同期。

変更しない: 過去ログの本文、PR のマージ、OS パッケージ、未確認の macOS・Windows・Termux 結果。

## 4. 禁止事項

テスト削除・SKIP 追加・エラー隠蔽・`continue-on-error`・脆弱性 ignore・無検証の成功宣言は行わない。`git reset` は復旧時に現物とリモート内容の一致を証明した一回以外は行わない。外部への書込・権限拡大・別ブランチへの変更を行わない。

## 5. 完了条件

- [x] 4反復: 探索/仮説→負例・現象再現→最小修正→全ゲート・差分レビュー。実際に見つからなければ「発見なし」と明示する。
- [x] 変更した判定には失敗/保留/成功の回帰試験を追加し、既存 7 ゲートと Knip が PASS。
- [x] ログから採用した教訓の出典を示し、現用 skill / rule を事実に合わせる。過去ログは追記以外で触らない。
- [x] PR CI を確認し、実環境の未検証（Go/Rust ローカル・別 OS・週次/手動 OSV）を PASS としない。

## 6. テスト方法

| 層 | 内容 |
|---|---|
| Unit | Git/PR 状態の混在・欠落・API 失敗、CLI の負例・正常例を固定入力で検査 |
| Component | 実一時 Git repository、フック、生成物の検査・文書のリンク |
| E2E | `bun run check` / `bun run knip`、PR の5チェック |
| 実環境 | macOS/Windows/Termux・ローカル Go/Rust・週次/手動 OSV は別環境待ち |

## 7. 停止条件

各反復で 2 回連続改善がなく、新事実を得られなければ対象を保留して次へ進む。最大4反復で終了。安全境界の変更、テスト環境の外部パッケージ導入、破壊的変更が必要なら止めて相談。曖昧な事実は未確認とする。

## 8. 完了時

差分と試験を再確認し固定ブランチへ commit/push、PR の結果を確認。ログは新規ファイルに時点記録し、未完了タスクを維持。

## 9. 反復の観点

1. 既存ログ・索引・スキル/ルールの実態差を列挙。基準ゲートと異常入力の候補を確認。
2. Git/PR の失敗・未完了の混在、HTTP/API 欠落、誤った PASS/unknown の分類を負例で検査・修正。
3. 生成 CLI、フック、文書ゲートの信頼境界・副作用を再検証して必要な不具合を修正。
4. 全体の回帰・Knip・CI・最終自己レビュー。未検証範囲を記録。

## 10. 結果

| 反復 | 探索・RED | 修正と GREEN | 残り |
|---|---|---|---|
| 1 | 基準7ゲート 54 pass / 2 skip。16ログから実際の実行経路、no-op と環境依存を照合 | 監査対象の優先順位と停止条件を記録。実装上の新しい不具合はこの反復では発見なし | Go/Rust ローカルは未実施 |
| 2 | PR check failure + queued が `unknown` になる。ローカル branch mismatch + API unavailable が `unknown` に上書きされる（負例 RED） | 既知 FAIL が unknown より優先。負例 GREEN | API実走査は push 後に確認 |
| 3 | check runs 成功でも commit status failure を未参照のため `pass`、closed PR も pass（status RED） | commit status と PR state を取得・分類し成功/保留/失敗の回帰を追加 | API スコープの個別実測なし |
| 4 | completed/null は誤 FAIL、skipped/neutral は誤 PASS、100件超の部分取得は全件の証拠がない（各負例 RED） | null/skip は unknown、既知 failure は fail、途中で切れた結果は unknown。部分取得で見えた failure は残す。59 pass / 2 skip / 780 assertions、7ゲート・Knip・diff check exit 0 | 週次/手動OSV、別OS、ローカルGo/Rustは未検証 |

再探索: `scripts/setup.ts` の安全パス、`check_agents.ts` の実体起動、`check_doc_links.ts` のゲート境界を点検したが、範囲内で追加の再現可能な不具合は確認できなかった。既存ログの教訓を `.agent/skills/bug-audit-loop/SKILL.md`、`ci-quality-gates/SKILL.md`、`.agent/rules/04_verification.md` に反映。PR #5 の `8824651` で CI run `45044912821`（OSV full scan、actionlint/zizmor、Bun 全ゲート+Knip、gitleaks）と Dependency Review `45044912843` が全5チェック PASS。Git/PR CLI は初回 Bun の信頼ストア欠損で unknown を返した（無検証成功とはしなかった）。`NODE_EXTRA_CA_CERTS=/etc/ssl/certs/ca-certificates.crt` を明示して再実行し、PR #5 の branch/HEAD/checks 一致、verdict `pass` を確認。Go/Rust ローカル 2 skip は未解消。
