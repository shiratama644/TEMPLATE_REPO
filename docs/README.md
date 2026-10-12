# ドキュメント索引

このフォルダは、プロジェクトの**進捗・仕様・計画・調査・監査・運用**の文書を種類ごとに分けて置く場所です。ルートの [`README.md`](../README.md) からプロジェクトの概要に入れます。

## ディレクトリ構成

```
docs/
├── README.md          ← 本ファイル（全体の目次）
├── task-list.md       ★ 進捗管理の唯一の正本（状態・証拠）
├── arch/              仕様（どう作るか・どういう構成か）
│   ├── README.md      仕様書の一覧と読み方
│   ├── product.md     目的・対象・用語
│   ├── architecture.md ディレクトリ構成・読み込みの流れ
│   └── milestones.md  段階と完了条件
├── adr/               個別の ADR（1 判断 1 ファイル。今後の新規判断はここに書く）
│   └── README.md      書き方と番号規則
├── planning/          計画書（タスクごとの範囲と完了条件）
│   ├── README.md      計画書の一覧と作り方
│   └── _TEMPLATE.md   計画書の書式
├── research/          調査結果
│   └── README.md      調査の一覧と書き方
├── audit/             差分・問題の監査
│   ├── index.md       説明
│   └── activity.md    作業の時系列の記録（追加のみ）
└── ops/               運用手順
    └── index.md       説明
```

## 用途別の参照

| 知りたいこと | 見る文書 |
|---|---|
| 今どの作業が進んでいるか | [`task-list.md`](./task-list.md) |
| テンプレートの目的と使い方 | [`arch/product.md`](./arch/product.md)、[`../README.md`](../README.md) |
| 構成と Agent の読み込みの流れ | [`arch/architecture.md`](./arch/architecture.md) |
| なぜこの構成なのか | [`adr/`](./adr/README.md)（個別 ADR） |
| 次に何をするか・段階の状況 | [`arch/milestones.md`](./arch/milestones.md) |
| タスクの詳細計画 | [`planning/README.md`](./planning/README.md) |
| 作業規約・検証手段 | [`../AGENTS.md`](../AGENTS.md) |
| 新規プロジェクトの初期設定 | [`../.agent/skills/project-init/SKILL.md`](../.agent/skills/project-init/SKILL.md) |
| Agent の知識・手順 | [`../.agent/skills/index.md`](../.agent/skills/index.md) |

## 運用ルール

- **進捗の正本は `task-list.md`**。チャットや他の文書と矛盾したら `task-list.md` を正とする。
- 文書を追加・削除・移動したら、**この目次を同じ変更の中で更新する**。
- 判断を変える場合は新しい ADR を追加する（過去の ADR は書き換えない）。新規は `adr/NNNN-title.md` に書く。
- 作業の事実は `audit/activity.md` と `.agent/logs/` に追記する（書き換えない）。
- ファイル名は短く正確に。ハイフンは最大 1 つ。
