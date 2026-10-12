# docs/arch — 仕様書

ここは **どう作業するか・どういう構成か** の正本です。進捗は `../task-list.md`、個別の計画は `../planning/`。

TEMPLATE_REPO は、AI Agent に作業を任せる際の**規約・知識・進捗管理・ドキュメントの土台**を提供するテンプレートです。ソフトウェア開発に限らず、文書作成・調査・データ整理・設定作業など、分野を問わず使えることを目指しています。

## 実装・変更時に守ること

1. **仕様と実物を一致させる**。構成を変えたら、本ディレクトリと `../README.md`・`../../AGENTS.md` を同じ変更で更新する。
2. **ADR に反する変更をしない**。覆す場合は `../adr/` に新しい ADR を追加してから変える。
3. **分野固有の内容を共通部分に混ぜない**。特定の言語・ツール・分野の手順は、`AGENTS.md §6` またはプロジェクト側の文書に書く。
4. **ファイル名は短く正確に**。ハイフンは最大 1 つ。

## 読み方

| 状況 | 最初に読むもの |
|---|---|
| テンプレートの目的を知りたい | [product.md](./product.md) |
| 構成と読み込みの流れを知りたい | [architecture.md](./architecture.md) |
| 新規プロジェクトを実プロジェクトへ合わせたい | [`../../.agent/skills/project-init/SKILL.md`](../../.agent/skills/project-init/SKILL.md) |
| なぜそうなっているか知りたい | [`../adr/`](../adr/README.md) |
| 今どの段階か知りたい | [milestones.md](./milestones.md) → `../task-list.md` |

## 仕様書一覧

| ファイル | 内容 |
|---|---|
| [product.md](./product.md) | テンプレートの目的・対象・用語 |
| [architecture.md](./architecture.md) | ディレクトリ構成・Agent の読み込みの流れ・責務の分担 |
| [milestones.md](./milestones.md) | 段階ごとの完了条件 |
