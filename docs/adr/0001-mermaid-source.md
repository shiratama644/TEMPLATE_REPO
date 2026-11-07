# ADR-0001: 図の正本は Markdown 内の Mermaid ソースにする

**Date**: 2026-10-25
**Status**: accepted
**Deciders**: リポジトリ所有者（承認済み計画 `docs/planning/REPOFIX_PLAN.md` REPOFIX-3）、作業 Agent

## Context

フローチャートは `.md` 内の Mermaid で書き、PNG 化は `scripts/render_mermaid.py`（mermaidx + CJK フォントの外部取得）で行う運用だった。しかし実測した結果、次の 3 つが同時に起きていた。

- 生成物の `flowchart.png` / `flowchart-fact.png` が**どの文書からも参照されておらず**、正本ではないバイナリがリポジトリに残っていた。
- `render_mermaid.py` は「PNG リンクがある `.md`」だけを描くため、リンクが無い現状では `make diagrams` が exit 1 になり、`--all` でも出力名が `SKILL.png` / `SKILL-2.png` になって既存 PNG を再現できなかった。
- フォント取得が cone モードの `git sparse-checkout set <file>` を使うため、git 2.37 以降で `fatal: not a directory` になり、そもそも実行できなかった（この環境は git 2.39.5）。

つまり PNG は「生成手段が壊れていて、参照もされていない複製物」だった。一方で GitHub は Mermaid をそのまま描画するため、閲覧には PNG が不要になっている。

## Decision

**図の正本は `.md` 内の Mermaid ソースのみとする。** リポジトリに図の PNG を置かず、PNG 生成パイプライン（`make diagrams`・`scripts/render_mermaid.py`・`scripts/requirements-diagrams.txt`）を削除する。図の検証は Mermaid ソースに対する `scripts/check_mermaid.py`（`make mermaid`）で行う。

## Alternatives Considered

### Alternative 1: PNG を残し、`render_mermaid.py` を直して文書から参照する

- **Pros**: Mermaid を描画できない閲覧環境（一部の Wiki・スライド・PDF 出力）でも図が見える。既存の資産を捨てない。
- **Cons**: mermaidx と CJK フォントの外部取得という 2 つの依存が増える。生成物は正本の複製なので、ソースを変えるたびに再生成と差分の確認が必要になる。バイナリ差分はレビューできない。
- **Why not**: テンプレートは「派生先でそのまま動く」ことが価値で、外部取得に依存する生成手順は壊れやすい（現に git の版更新だけで壊れていた）。参照されていない PNG は保守されないまま古くなる。

### Alternative 2: `render_mermaid.py` を直して残すが、`make diagrams` からは外す（手動実行のみ）

- **Pros**: 必要になったときに PNG へ書き出せる能力は残る。既定の検証経路からは外れるので `make check` は壊れない。
- **Cons**: 消費者の無いスクリプトが残り、依存の pin（`requirements-diagrams.txt`）とフォント取得の保守が続く。動かなくなったときに誰も気づかない。
- **Why not**: 「使われていないが保守対象」を増やすのは、テンプレートとして最も避けたい状態。必要になった時点で追加し直す方が安い。

## Consequences

### Positive

- 図の変更が `.md` の 1 箇所で完結し、差分がレビューできる。
- 実行時依存が減る（mermaidx と CJK フォントの外部取得が不要になる）。
- `make check` のゲート（`check_mermaid.py`）が Mermaid ソースを直接検査するので、正本と検査対象が一致する。

### Negative

- Mermaid を描画できない閲覧環境には図が届かない（その場合は派生プロジェクト側で生成手段を追加する）。
- 過去に生成した PNG は履歴から参照できなくなる（履歴自体は書き換えないので `git show` では辿れる）。

### Risks

- **リスク**: 図が必要になったときに生成手段が無く、AI 画像生成で図を描いてしまう。
  **緩和**: `.agent/skills/writing-skills/SKILL.md` に「フローチャートは Mermaid で書く。AI 画像生成でフローを描かない」を明記して残す。
- **リスク**: Mermaid の構文エラーが再び混入する。
  **緩和**: `scripts/check_mermaid.py` を pre-commit と CI（`make check`）のゲートにしてある（REPOFIX-2）。
