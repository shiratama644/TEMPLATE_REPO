#!/usr/bin/env python3
"""Markdown 内の Mermaid を mermaidx で PNG にする。

AI 画像生成は使わない。フローチャート PNG の正本はこのスクリプト。

使い方:
  python3 scripts/render_mermaid.py                       # PNG リンクがある Mermaid を全部描く
  python3 scripts/render_mermaid.py path/to/SKILL.md      # 指定ファイルだけ
  python3 scripts/render_mermaid.py --all path/to/dir     # リンクの有無に関わらず描く

依存: pip install mermaidx
日本語は Noto Sans CJK JP を使う（無ければ GitHub から取得してキャッシュする）。
"""

from __future__ import annotations

import argparse
import os
import re
import subprocess
import sys
from pathlib import Path

FENCE = re.compile(r"```mermaid\s*\n(.*?)```", re.DOTALL)
IMG = re.compile(r"!\[[^\]]*\]\(([^)]+\.png)\)")
MAX_KB = 1024

FONT_REPO = "https://github.com/minoryorg/Noto-Sans-CJK-JP.git"
FONT_REGULAR = "NotoSansCJKjp-Regular.ttf"
FONT_BOLD = "NotoSansCJKjp-Bold.ttf"
FONT_FAMILY = "Noto Sans CJK JP"


def repo_root() -> Path:
    here = Path(__file__).resolve().parent
    if (here.parent / ".git").exists() or (here.parent / "AGENTS.md").exists():
        return here.parent
    return Path.cwd()


def cache_dir() -> Path:
    env = os.environ.get("XDG_CACHE_HOME")
    base = Path(env) if env else Path.home() / ".cache"
    return base / "template-repo" / "fonts"


def ensure_cjk_fonts() -> tuple[Path, Path]:
    """Regular / Bold の TTF パスを返す。無ければ GitHub から sparse clone する。"""
    cached = cache_dir()
    regular = cached / FONT_REGULAR
    bold = cached / FONT_BOLD
    if regular.is_file() and bold.is_file():
        return regular, bold

    # 作業マシンに既にある場合
    local = Path.home() / ".local" / "share" / "fonts" / FONT_REGULAR
    local_bold = Path("/tmp/noto-jp/fonts") / FONT_BOLD
    if local.is_file() and local_bold.is_file():
        cached.mkdir(parents=True, exist_ok=True)
        if not regular.is_file():
            regular.write_bytes(local.read_bytes())
        if not bold.is_file():
            bold.write_bytes(local_bold.read_bytes())
        return regular, bold

    cached.mkdir(parents=True, exist_ok=True)
    work = cached / "src"
    if work.exists():
        subprocess.run(["rm", "-rf", str(work)], check=False)
    print(f"CJK フォントを取得します: {FONT_REPO}", file=sys.stderr)
    subprocess.run(
        [
            "git",
            "clone",
            "--depth",
            "1",
            "--filter=blob:none",
            "--sparse",
            FONT_REPO,
            str(work),
        ],
        check=True,
    )
    subprocess.run(
        ["git", "-C", str(work), "sparse-checkout", "set", f"fonts/{FONT_REGULAR}", f"fonts/{FONT_BOLD}"],
        check=True,
    )
    src_reg = work / "fonts" / FONT_REGULAR
    src_bold = work / "fonts" / FONT_BOLD
    if not src_reg.is_file():
        sys.exit(f"フォントが見つからない: {src_reg}")
    regular.write_bytes(src_reg.read_bytes())
    if src_bold.is_file():
        bold.write_bytes(src_bold.read_bytes())
    else:
        bold.write_bytes(src_reg.read_bytes())
    return regular, bold


def patch_mermaidx(regular: Path, bold: Path) -> None:
    """bundled DejaVu では日本語が欠けるので、計測と raster の両方を CJK に差し替える。"""
    import mermaidx.font_metrics as fm
    import mermaidx.raster as raster

    def get_font(weight=None):
        try:
            if int(weight or 0) >= 600:
                return fm.Font(bold)
        except (TypeError, ValueError):
            pass
        if str(weight).strip().lower() in ("bold", "bolder"):
            return fm.Font(bold)
        return fm.Font(regular)

    fm.get_font = get_font  # type: ignore[method-assign]
    raster._FONT_FILES = [str(regular), str(bold)]
    raster._FAMILY = FONT_FAMILY


def iter_markdown(paths: list[Path], root: Path) -> list[Path]:
    files: list[Path] = []
    if not paths:
        paths = [root]
    for p in paths:
        if p.is_file() and p.suffix == ".md":
            files.append(p)
        elif p.is_dir():
            for md in sorted(p.rglob("*.md")):
                if ".git" in md.parts:
                    continue
                files.append(md)
    return files


def blocks_and_pngs(md: Path) -> list[tuple[str, Path]]:
    text = md.read_text(encoding="utf-8")
    fences = FENCE.findall(text)
    pngs = [md.parent / Path(m).name if "/" not in m else (md.parent / m)
            for m in IMG.findall(text)]
    out: list[tuple[str, Path]] = []
    for i, src in enumerate(fences):
        if i < len(pngs):
            dest = pngs[i]
        else:
            dest = md.parent / (md.stem if i == 0 else f"{md.stem}-{i + 1}")
            dest = dest.with_suffix(".png")
        out.append((src.strip() + "\n", dest))
    return out


def render_one(source: str, dest: Path, scale: float) -> None:
    import mermaidx

    dest.parent.mkdir(parents=True, exist_ok=True)
    diagram = mermaidx.render(
        source,
        theme="neutral",
        config={"fontFamily": FONT_FAMILY, "flowchart": {"htmlLabels": False}},
    )
    used_scale = scale
    png = diagram.png(scale=used_scale, background="white")
    # check-added-large-files --maxkb=1024 を超えない
    while len(png) > MAX_KB * 1024 and used_scale > 0.8:
        used_scale = round(used_scale - 0.25, 2)
        png = diagram.png(scale=used_scale, background="white")
    dest.write_bytes(png)
    kb = len(png) / 1024
    print(f"{dest}  {kb:.1f} KiB  scale={used_scale}")
    if len(png) > MAX_KB * 1024:
        sys.exit(f"{dest} が {MAX_KB} KiB を超えている")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("paths", nargs="*", type=Path)
    parser.add_argument(
        "--all",
        action="store_true",
        help="PNG リンクが無い Mermaid も隣に PNG を書く",
    )
    parser.add_argument("--scale", type=float, default=1.5)
    args = parser.parse_args()

    try:
        import mermaidx  # noqa: F401
    except ImportError:
        print("mermaidx が必要です: pip install mermaidx", file=sys.stderr)
        return 1

    root = repo_root()
    regular, bold = ensure_cjk_fonts()
    patch_mermaidx(regular, bold)

    targets = iter_markdown(args.paths, root)
    rendered = 0
    for md in targets:
        pairs = blocks_and_pngs(md)
        if not pairs:
            continue
        text = md.read_text(encoding="utf-8")
        has_png_link = bool(IMG.search(text))
        if not has_png_link and not args.all:
            continue
        for source, dest in pairs:
            if not has_png_link and args.all:
                pass
            elif not has_png_link:
                continue
            render_one(source, dest, args.scale)
            rendered += 1
    if rendered == 0:
        print("描画対象の Mermaid がありません", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
