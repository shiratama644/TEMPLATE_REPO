#!/usr/bin/env python3
"""Markdown 内の Mermaid ブロックの「図の宣言」を検査する。

分野を問わず使えるよう、標準ライブラリのみに依存する（check_doc_links.py と同じ方針）。
Mermaid の完全な構文検証は行わない。実際に起きた不具合（図の宣言行が 2 回あり、
描画できない）の再発防止に絞る。図の PNG 化はしない（正本は .md 内の Mermaid ソース。
docs/adr/0001-mermaid-source.md）。

検査内容（```mermaid フェンスごと）:
  - ブロックが空でないか
  - 先頭の非空行が図の宣言（`flowchart TD` など）か
  - 宣言がブロック内に 1 回だけか（重複宣言は Mermaid のパースエラーになる）

自己検査:
  リポジトリ走査の前に、組み込みの fixture（正常 / 宣言重複 / 宣言なし / 空）で
  判定ロジック自体を確認する。スクリプトを壊したときに「たまたま PASS」しないため。

対象外:
  - ```mermaid 以外のフェンス（```md 内の例示など）
  - シンボリックリンク（.claude → .agent など。二重検査を避けるため）
  - .git/ 配下

終了コード: 0 = すべて有効, 1 = 不備あり（自己検査の失敗を含む）
使い方: python3 scripts/check_mermaid.py [ルート] （省略時はリポジトリ直下）
"""

from __future__ import annotations

import os
import re
import sys

# 受理する図の宣言。行頭固定なので gitGraph を graph と誤判定しない。
DIAGRAM_TYPES = (
    "flowchart",
    "graph",
    "sequenceDiagram",
    "classDiagram",
    "stateDiagram",
    "erDiagram",
    "journey",
    "gantt",
    "pie",
    "gitGraph",
    "mindmap",
    "timeline",
    "quadrantChart",
    "xychart-beta",
    "sankey-beta",
    "C4Context",
)
DECLARATION = re.compile(
    r"^(?:" + "|".join(re.escape(name) for name in DIAGRAM_TYPES) + r")(?:\s|$)"
)
OPEN = re.compile(r"^```mermaid[ \t]*$")
CLOSE = re.compile(r"^```[ \t]*$")

# 自己検査用の fixture: (名前, ブロック本体, 期待する不備の件数)
SELF_TEST_FIXTURES = (
    ("正常（宣言 1 回）", 'flowchart TD\n  A["開始"] --> B{"判定"}\n', 0),
    ("正常（gitGraph）", "gitGraph\n  commit\n", 0),
    ("宣言が重複", "flowchart TD\nflowchart TD\n  A --> B\n", 1),
    ("宣言がない", 'classDef ok fill:#fff\n  A["開始"] --> B\n', 1),
    ("空ブロック", "\n", 1),
)


def check_block(body: list[str]) -> list[str]:
    """1 ブロック分の不備をメッセージのリストで返す（空なら不備なし）。"""
    lines = [(offset, text.strip()) for offset, text in enumerate(body) if text.strip()]
    if not lines:
        return ["Mermaid ブロックが空です"]

    problems: list[str] = []
    first_offset, first_text = lines[0]
    declarations = [(offset, text) for offset, text in lines if DECLARATION.match(text)]

    if not declarations:
        problems.append(
            f"{first_offset + 1} 行目が図の宣言ではありません"
            f"（`flowchart TD` / `sequenceDiagram` などを先頭に置く）"
        )
    elif len(declarations) > 1:
        where = ", ".join(str(offset + 1) for offset, _ in declarations)
        problems.append(f"図の宣言が {len(declarations)} 回あります（ブロック内 {where} 行目）")
    elif declarations[0][0] != first_offset:
        problems.append(
            f"図の宣言が先頭にありません（{declarations[0][0] + 1} 行目に `{first_text}` がある）"
        )
    return problems


def self_test() -> list[str]:
    """組み込み fixture で判定ロジックを確認する。失敗したらメッセージを返す。"""
    failures: list[str] = []
    for name, body, expected in SELF_TEST_FIXTURES:
        got = len(check_block(body.splitlines()))
        if got != expected:
            failures.append(f"自己検査 NG: {name} — 不備 {expected} 件の期待に対して {got} 件")
    return failures


def iter_markdown(root: str):
    for dirpath, dirnames, filenames in os.walk(root):
        dirnames[:] = [d for d in dirnames if d != ".git"]
        for name in filenames:
            path = os.path.join(dirpath, name)
            if name.endswith(".md") and not os.path.islink(path):
                yield path


def iter_blocks(path: str):
    """(フェンス開始行, ブロック本体の行リスト) を順に返す。"""
    body: list[str] | None = None
    start = 0
    with open(path, encoding="utf-8", errors="replace") as fh:
        for lineno, line in enumerate(fh, start=1):
            text = line.rstrip("\n")
            if body is None:
                if OPEN.match(text):
                    body = []
                    start = lineno
            elif CLOSE.match(text):
                yield start, body
                body = None
            else:
                body.append(text)
    if body is not None:
        # 閉じフェンスが無い場合はファイル末尾までを 1 ブロックとして扱う
        yield start, body


def main(argv: list[str]) -> int:
    root = argv[1] if len(argv) > 1 else os.path.join(
        os.path.dirname(os.path.abspath(__file__)), ".."
    )

    failures = 0
    for message in self_test():
        failures += 1
        print(message, file=sys.stderr)
    if failures:
        print("NG: 検査スクリプト自体が正しく動作していません", file=sys.stderr)
        return 1

    checked_files = 0
    checked_blocks = 0
    for path in iter_markdown(root):
        blocks = list(iter_blocks(path))
        if not blocks:
            continue
        checked_files += 1
        for start, body in blocks:
            checked_blocks += 1
            for problem in check_block(body):
                failures += 1
                print(
                    f"{os.path.relpath(path, root)}:{start}: {problem}",
                    file=sys.stderr,
                )

    if failures:
        print(
            f"NG: {failures} 件の不備（{checked_files} ファイル / {checked_blocks} ブロック中）",
            file=sys.stderr,
        )
        return 1
    print(
        f"OK: Mermaid {checked_blocks} ブロック（{checked_files} ファイル）を検査、"
        "図の宣言に不備はありません"
    )
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
