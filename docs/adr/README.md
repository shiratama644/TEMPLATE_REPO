# 個別 ADR（Architecture Decision Records）

設計判断を **1 判断 1 ファイル** で記録する場所。命名は `NNNN-<kebab-case-title>.md`（例: `0001-use-sqlite.md`）。

- 判断は、このディレクトリに 1 判断 1 ファイルで書く。
- 書式は `.agent/skills/architecture-decision-records/SKILL.md` に従う（決定・理由・代替案・影響）。
- 判断を取り消す場合は、古い ADR を書き換えず、新しい ADR で「置き換え」と明記する。

| 番号 | タイトル | 状態 |
|---|---|---|
| [0001](./0001-mermaid-source.md) | 図の正本は Markdown 内の Mermaid ソースにする | accepted |
