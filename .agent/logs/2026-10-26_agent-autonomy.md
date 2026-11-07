# 自律ルールを Agent システムへ統合

> Date: 2026-10-26(JST) / Commit: 92b9b75 / PR: 5

## 1. 指示内容 (Task Summary)

ユーザーが提示した自律的なタスク遂行の 5 原則を、`AGENTS.md §1.3` の宣言だけでなく Agent の実際の作業導線に組み込む。

## 2. 実行内容 (Executed Actions)

| 対象 | 実施内容・証拠 |
| :--- | :--- |
| `.agent/hooks/session-start.sh` | 既存 `SessionStart` に目的・完了条件・安全境界・報告の要点を注入。実行結果の JSON を解析して内容を確認 |
| `.agent/hooks/pre-task.md` | 目的と完了条件、足りない作業、事前確認が必要な操作を作業開始時に確認 |
| `.agent/hooks/verify-commit.md` / `log-task.md` | 目的の達成と再検証、追加で判断した作業、未解決と未実施の検証をそれぞれ確認・記録 |
| `.agent/workflows/implement-task.js` | 実装・検証を行わない準備用ワークフローが `ok` を返す誤表示を修正。準備時は `ready_for_implementation`、探索・計画・検証計画の失敗時は `blocked`。目的を計画の必須項目にした |
| 索引と運用規則 | `hooks/index.md`、`.agent/README.md`、`commands/commit.md`、`rules/04_verification.md`、`docs/arch/architecture.md` を実際の導線に合わせた |
| 検証 | SessionStart の JSON と 3 原則への案内を実測。Node の mock ランナーで未指定・探索失敗・計画失敗・検証計画失敗・正常準備の 5 ケースを実行。`make check` 18 フック全 PASS、`make links` 138 ファイル OK、`make lang` 168 ファイル OK |

## 3. 気づいたこと・知見 (Insights & Lessons Learned)

- **追加で判断した修正**: `implement-task.js` はメインエージェントに実装を任せているにもかかわらず、実装済みを想定した検証項目と `status: ok` を返していた。ユーザーの「未確認を完了と報告しない」を満たすには、計画段階の状態を明確に区別する必要があった。
- `SessionStart` は `settings.json` に登録済みなので、新しいイベントや権限を増やさずに毎セッションの案内を届けられる。手順 `.md` は自動で強制されず、エージェントが参照する運用規則である。
- 動的ワークフローの実環境ランタイムはこの sandbox にない。Node の mock ランナーは制御フローを確認するが、実エージェントの外部連携までは確認できない。

## 4. 次にすべきこと (Next Actions)

- 実際の動的ワークフローが利用できる環境で、`ready_for_implementation` の受け手と `planned` / `blocked` の表示を確認する（この環境では未検証）。
- 過去の保留項目 LANGGATE-2（第三者リポジトリへの issue 投稿）は本タスクの対象外。
