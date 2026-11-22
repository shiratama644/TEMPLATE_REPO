# docs/planning — プロジェクトの計画書

利用者が新しいプロジェクトで決めた作業の目的・範囲・完了条件を記録します。テンプレート本体の開発計画は同梱しません。

1. [`../task-list.md`](../task-list.md) に新しいタスク ID と完了条件を登録します。
2. [`_TEMPLATE.md`](./_TEMPLATE.md) をコピーし、対象タスクの計画書を作ります。ファイル名は `{TOPIC}_PLAN.md`。まだ計画の承認を得ていない場合、[`project-init`](../../.agent/skills/project-init/SKILL.md) の手順に従います。
3. 検証結果と残事項を `task-list.md` に記録します。

## 計画書一覧

| 文書 | 用途 |
|---|---|
| [`_TEMPLATE.md`](./_TEMPLATE.md) | 新しい計画書の書式 |

プロジェクト固有の計画書はまだありません。初期設定時に必要なら `INIT_STATE.md`（承認前の作業記憶）と `INIT_PLAN.md`（承認された計画）を作成します。これらはテンプレート本体には含めません。
