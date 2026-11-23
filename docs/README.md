# ドキュメント索引

この `docs/` は派生プロジェクトの仕様・計画・進捗・判断を記録するための初期構成です。テンプレート自体を作ったときのタスクや監査履歴は含みません。概要と使い方は [README.md](../README.md) を参照してください。

| 場所 | 内容 |
|---|---|
| [`task-list.md`](./task-list.md) | 空の進捗表。初期設定後にプロジェクトのタスクと証拠を記入 |
| [`arch/`](./arch/README.md) | テンプレートの目的・構成。派生先の仕様に合わせて更新 |
| [`adr/`](./adr/README.md) | 新しいプロジェクトの設計判断を番号順に記録 |
| [`planning/`](./planning/README.md) | 計画書の作り方と [`_TEMPLATE.md`](./planning/_TEMPLATE.md) |
| [`research/`](./research/README.md) | 調査結果と採否の記録 |
| [`audit/`](./audit/index.md) | 新たに発見した問題・差分の記録 |
| [`ops/`](./ops/index.md) | Bun の品質ゲートと運用手順 |

## 利用時の手順

1. [`project-init`](../.agent/skills/project-init/SKILL.md) で目的と変更範囲を確認し、計画の承認後に文書を派生プロジェクト向けに書き換えます。
2. `task-list.md` に新しいタスクを登録します。テンプレートの過去のタスク ID を継承する必要はありません。
3. 新しい文書を追加・削除・移動したら、この索引を同じ変更で更新します。未確認の検証は PASS とせず、task-list の証拠に理由を残します。
