# Planning Index — TEMPLATE_REPO

計画書（`docs/planning/`）は、`docs/task-list.md` の各タスクを **どの順で、どの範囲で、何をもって完了とするか** に分解する場所です。仕様そのものの正本は `../arch/` です。完了済み計画は `complete/` に置きます。

> **参考**: `shiratama644/cod-web` arena/01a0b161-cod-web ブランチの `planning/README.md` 構成を参考（2026-09-27調査）。

## まず読むもの

| 順 | 文書 | いつ読むか | 内容 |
|---:|---|---|---|
| 1 | `../task-list.md` | 常に最初 | 状態・依存・次に着手できるタスクの唯一の正本 |
| 2 | 対象タスクの `*_PLAN.md` | 実装/調査に入る前 | 変更範囲、禁止事項、DoD、停止条件、検証方法 |
| 3 | `../research/README.md` | 外部技術・調査の根拠が必要な時 | 調査の入口 |
| 4 | `../arch/README.md` | 仕様確認が必要な時 | 仕様書一覧 |

## 計画書一覧（TEMPLATE_REPO）

| 文書 | 対応 ID | 状態 | 役割 |
|---|---|---|---|
| `_TEMPLATE.md` | — | 現用 | 新規計画書の必須形式 |
| `robustness-plan.md` | TEMPLATE-11 | 完了 | 堅牢性テスト・ProjectDetector・Bootstrap強化設計 |
| `complete/README.md` | — | 現用 | 完了済み計画の索引 |

## 次に着手可能なタスク

| 優先 | ID | 内容 | 事前に読むもの |
|---:|---|---|---|
| 1 | — | なし（全タスク完了） | `../task-list.md` |

## 計画書を書く/更新する時のルール

- 新規タスクは先に `../task-list.md` へ ID を追加する
- 新規計画書は `_TEMPLATE.md` の §1〜§9 を最低限満たす
- 実装範囲、禁止事項、DoD、停止条件を必ず書く
- 計画書と `../arch/` が矛盾したら、勝手に片方を正にせずユーザーへ確認する
- 完了後は「実績と証拠」に commit / validation を書く
- ファイル名は短く正確、ハイフン最大1つ

## 完了済み計画の扱い

完了した計画書は `complete/` へ移動。過去の記録は書き換えない。新規は `_TEMPLATE.md` 準拠で作成。
