#!/usr/bin/env python3
"""Markdown の内部リンク（相対パス）の実在を検査する。

分野を問わず使えるよう、標準ライブラリのみに依存する。

検査内容:
  - `[text](relative/path.md)` や `[text](path#anchor)` のリンク先ファイルが存在するか
  - コードブロック（```）とインラインコード（`...`）内のリンクは対象外

対象外:
  - http(s):, mailto: などの外部リンク（外部 URL の有効性は別途確認する）
  - シンボリックリンク（.claude → .agent など。二重検査を避けるため）
  - .git/ 配下

終了コード: 0 = すべて有効, 1 = 切れたリンクあり
使い方: python3 scripts/check_doc_links.py [ルート] （省略時はリポジトリ直下）
"""

from __future__ import annotations

import os
import re
import sys

LINK = re.compile(r"\[[^\]]*\]\(([^)\s]+)(?:\s+\"[^\"]*\")?\)")
INLINE_CODE = re.compile(r"`[^`]*`")
EXTERNAL = re.compile(r"^(?:[a-zA-Z][a-zA-Z0-9+.-]*:|#)")


def iter_markdown(root: str):
    for dirpath, dirnames, filenames in os.walk(root):
        dirnames[:] = [d for d in dirnames if d != ".git"]
        for name in filenames:
            path = os.path.join(dirpath, name)
            if name.endswith(".md") and not os.path.islink(path):
                yield path


def broken_links(path: str) -> list[tuple[int, str]]:
    problems: list[tuple[int, str]] = []
    in_fence = False
    with open(path, encoding="utf-8", errors="replace") as fh:
        for lineno, line in enumerate(fh, start=1):
            if line.lstrip().startswith("```"):
                in_fence = not in_fence
                continue
            if in_fence:
                continue
            text = INLINE_CODE.sub("", line)
            for match in LINK.finditer(text):
                target = match.group(1)
                if EXTERNAL.match(target):
                    continue
                target_path = target.split("#", 1)[0]
                if not target_path:
                    continue
                resolved = os.path.normpath(os.path.join(os.path.dirname(path), target_path))
                if not os.path.exists(resolved):
                    problems.append((lineno, target))
    return problems


def main(argv: list[str]) -> int:
    root = argv[1] if len(argv) > 1 else os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")
    failures = 0
    checked = 0
    for path in iter_markdown(root):
        checked += 1
        for lineno, target in broken_links(path):
            failures += 1
            print(f"{os.path.relpath(path, root)}:{lineno}: 切れたリンク -> {target}", file=sys.stderr)
    if failures:
        print(f"NG: {failures} 件の切れたリンク（{checked} ファイル中）", file=sys.stderr)
        return 1
    print(f"OK: 内部リンク {checked} ファイルを検査、切れたリンクはありません")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
