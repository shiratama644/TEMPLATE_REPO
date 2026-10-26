#!/usr/bin/env python3
"""ファイルとコミットメッセージの言語を検査する（日本語と英語のみを許可）。

分野を問わず使えるよう、標準ライブラリのみに依存する（check_doc_links.py / check_mermaid.py と同じ方針）。

なぜ必要か:
  日本語の文書に他の言語（とくに簡体字中国語）が混ざると、日本語の漢字に見えるため読者が気づきにくく、
  一度混入すると機械的に探す手段がない。実際に本リポジトリでも、計画書に U+951A（錨の簡体字）を
  使った語、ADR に U+8D56（頼の簡体字）を使った語、コミットメッセージに U+52A8（動の簡体字）を
  使った語が混入した。いずれも目視では見つけられなかった。

判定のしくみ:
  日本語で使う文字は EUC-JP / CP932（JIS X 0208 + NEC/IBM 拡張）で符号化できる。
  これを「日本語の文字かどうか」の判定に使う。英語はラテン文字なので常に許可する。
  言語は文字（letters）に宿るので、句読点・記号・数字は言語として判定しない。

  - error: 日本語でも英語でもない**文字体系**（ハングル・キリル・ギリシャ・アラビア・ヘブライ・
           タイ・デーヴァナーガリー ほか）
  - error: 基本多文種面（U+4E00-U+9FFF）と CJK 互換漢字（U+F900-U+FAFF）で、EUC-JP / CP932 の
           どちらでも符号化できないもの → 簡体字（U+52A8 など）や日本語で使わない漢字。
           日本語の「髙」(U+9AD9)「﨑」(U+FA11)「德」「禮」は CP932 の NEC/IBM 拡張に
           含まれるので誤検出しない
  - warn : 拡張領域（U+3400-U+4DBF / U+20000 以降）の漢字で符号化できないもの
           → 日本語の表外漢字（U+20B9F など）の可能性があるので error にはしない
  - 許容 : ラテン文字、ひらがな、カタカナ、CJK 記号・句読点、全角形、句読点・記号・数字全般、
           絵文字（✅ ⚠ など）、矢印（→）、罫線素片（├ ─）、約物（「」・。〜）

限界（正直に書いておく）:
  **文字単位**の検査なので、日本語と共通の漢字だけ（使・用・依・系・明 など）で書かれた
  中国語の文は検出できない。検出できるのは簡体字固有の字と、日本語に無い文字体系。
  語単位の検査（中国語の語を一覧と照合する方式）は誤検出が増えるため行わない。

自己検査:
  リポジトリ走査の前に、組み込みの fixture で判定ロジック自体を確認する。
  スクリプトを壊したときに「たまたま PASS」しないため。
  fixture の違反文字は \\uXXXX エスケープで書く（このファイル自身が検査に引っかからないように）。

使い方:
  python3 scripts/check_language.py                 # リポジトリ全体
  python3 scripts/check_language.py <path> ...      # 指定ファイル（pre-commit が渡す形）
  python3 scripts/check_language.py --commit-msg <path> ...  # コミットメッセージとして検査

対象外:
  - バイナリ（UTF-8 として復号できないファイル）
  - シンボリックリンク（CLAUDE.md → AGENTS.md など。二重検査を避けるため）
  - .git/ 配下、および IGNORE_PATHS に一致するパス
    （派生プロジェクトで他言語のファイルを正当に持つ場合は IGNORE_PATHS を編集する。
      一時的に外す場合は SKIP=language git commit）

終了コード: 0 = error なし（warn のみも含む）、1 = error あり（自己検査の失敗も含む）
"""

from __future__ import annotations

import os
import re
import sys
import unicodedata

# 派生プロジェクトで検査対象から外したいパス（正規表現、リポジトリ根からの相対）
IGNORE_PATHS = re.compile(r"(^|/)(\.git|node_modules|dist|build|coverage|__pycache__)(/|$)")

# 日本語でも英語でもない文字体系（Unicode の文字名に含まれるスクリプト名で判定する）
OTHER_SCRIPTS = (
    "HANGUL",
    "CYRILLIC",
    "GREEK",
    "ARABIC",
    "HEBREW",
    "THAI",
    "LAO",
    "KHMER",
    "MYANMAR",
    "TAMIL",
    "TELUGU",
    "KANNADA",
    "MALAYALAM",
    "SINHALA",
    "GEORGIAN",
    "ARMENIAN",
    "ETHIOPIC",
    "DEVANAGARI",
    "BENGALI",
    "GURMUKHI",
    "GUJARATI",
    "ORIYA",
    "TIBETAN",
    "MONGOLIAN",
    "BOPOMOFO",
    "CHEROKEE",
    "SYLLABICS",
    "RUNIC",
    "OGHAM",
)

# 日本語の codecs で符号化できるかを見る
JP_CODECS = ("euc_jp", "cp932")

# コミットメッセージのコメント行とカットライン（git が付ける部分）を除くための正規表現
COMMENT_LINE = re.compile(r"^\s*(#|//)")
SCISSOR = re.compile(r"^-{8,}\s*>8\s*-{8,}$")

# 検査対象にしない Unicode の一般カテゴリ（書式・記号・句読点・数字・区切り）
NON_LETTER_CATEGORIES = ("Cc", "Cf", "Cs", "Co", "Cn", "So", "Sk", "Sm", "Sc", "Zs", "Zl", "Zp")
PUNCTUATION_PREFIXES = ("P", "N")

SELF_TEST_FIXTURES = (
    # (名前, 本文, 期待する error 文字, 期待する warn 文字)
    ("日本語と英語のみ", "日本語の文章です。English is allowed. 漢字・ひらがな・カタカナ、`code` と 12345。", "", ""),
    ("記号と絵文字", "✅ ❌ 🟡 🔴 ⚠️ 📌 → ← ├ ─ 「」・。〜 ①② ＡＢ 全角 · é", "", ""),
    ("CP932 にある異体字", "髙﨑 德 禮", "", ""),
    # 以下、違反文字は \uXXXX エスケープで書く（このファイル自身を検査にかけられるように）
    ("簡体字 1 字", "手\u52a8で実行する", "\u52a8", ""),
    # 限界の記録: 日中共通の漢字（説・明・使・用・依・系・個）は通る。固有の字だけ error になる
    ("簡体字の文（共通漢字は通る）", "\u8fd9\u4e2a\u8bf4明使用\u4f9d\u8d56\u5173\u7cfb", "\u5173\u8bf4\u8d56\u8fd9", ""),
    ("ハングル", "\ud55c\uad6d\uc5b4 \ud14c\uc2a4\ud2b8\uc785\ub2c8\ub2e4", "\ud55c\uad6d\uc5b4\ud14c\uc2a4\ud2b8\uc785\ub2c8\ub2e4", ""),
    ("キリル", "\u041f\u0440\u0438\u0432\u0435\u0442 \u043c\u0438\u0440", "\u041f\u0440\u0438\u0432\u0435\u0442\u043c", ""),
    ("表外漢字は warn", "\U00020b9fる（しかる）という日本語", "", "\U00020b9f"),
)


def is_japanese_char(ch: str) -> bool:
    """EUC-JP / CP932 のいずれかで符号化できれば日本語の文字とみなす。"""
    for codec in JP_CODECS:
        try:
            ch.encode(codec)
            return True
        except (UnicodeEncodeError, UnicodeDecodeError):
            continue
    return False


def classify(ch: str) -> tuple[str, str] | None:
    """文字 1 つを判定する。戻り値は (level, reason)。問題なければ None。"""
    if ch.isascii() or ch.isspace():
        return None

    codepoint = ord(ch)
    category = unicodedata.category(ch)

    # 書式文字・記号類は言語ではないので対象外
    if category in NON_LETTER_CATEGORIES:
        return None

    # 絵文字・矢印・罫線・約物・全角形・囲み英数字などのブロックも許容
    if (
        0x1F000 <= codepoint <= 0x1FAFF
        or 0x2600 <= codepoint <= 0x27BF
        or 0x2190 <= codepoint <= 0x21FF
        or 0x2500 <= codepoint <= 0x257F
        or 0x2000 <= codepoint <= 0x206F
        or 0x3000 <= codepoint <= 0x303F
        or 0xFE00 <= codepoint <= 0xFE0F
        or 0xFF00 <= codepoint <= 0xFFEF
        or 0x2460 <= codepoint <= 0x24FF
    ):
        return None

    name = unicodedata.name(ch, "")

    # 日本語でも英語でもない文字体系
    for script in OTHER_SCRIPTS:
        if script in name:
            return "error", f"{script.lower()} 系の文字"

    # ひらがな・カタカナは日本語
    if "HIRAGANA" in name or "KATAKANA" in name:
        return None

    # 基本多文種面の漢字と CJK 互換漢字: 日本語のコーデックで符号化できなければ簡体字など
    if 0x4E00 <= codepoint <= 0x9FFF or 0xF900 <= codepoint <= 0xFAFF:
        return None if is_japanese_char(ch) else ("error", "日本語で使わない漢字（簡体字など）")

    # 拡張領域の漢字: 日本語の表外漢字の可能性があるので warn
    if 0x3400 <= codepoint <= 0x4DBF or 0x20000 <= codepoint <= 0x2FFFF:
        return None if is_japanese_char(ch) else ("warn", "拡張領域の漢字（表外字か他言語か要確認）")

    # ラテン文字系（英語・欧米語の固有名）は許容
    if category.startswith("L") and "LATIN" in name:
        return None

    # 句読点・数字は言語の判定に使わない（例: U+00B7 MIDDLE DOT は英語の約物）
    if category.startswith(PUNCTUATION_PREFIXES):
        return None

    # ここに残るのは「日本語のコーデックに無い、ラテン以外の文字」
    if category.startswith("L"):
        if is_japanese_char(ch):
            return None
        return "error", f"日本語でも英語でもない文字（{name or 'unknown'}）"
    return None


def strip_commit_message(text: str) -> str:
    """コミットメッセージからコメント行とカットライン以降を除く。"""
    kept = []
    for line in text.splitlines():
        if SCISSOR.match(line):
            break
        if COMMENT_LINE.match(line):
            continue
        kept.append(line)
    return "\n".join(kept)


def find_issues(text: str) -> list[tuple[int, str, str, str, str]]:
    """本文から検出を集める。戻り値は (行番号, level, 文字, 理由, 行の内容)。"""
    issues = []
    for lineno, line in enumerate(text.splitlines(), 1):
        seen = set()
        for ch in line:
            if ch in seen:
                continue
            seen.add(ch)
            verdict = classify(ch)
            if verdict:
                level, reason = verdict
                issues.append((lineno, level, ch, reason, line.strip()[:80]))
    return issues


def self_test() -> list[str]:
    """組み込み fixture で判定ロジックを確認する。失敗メッセージのリストを返す。"""
    failures = []
    for name, body, want_error, want_warn in SELF_TEST_FIXTURES:
        issues = find_issues(body)
        got_error = "".join(sorted({ch for _, level, ch, _, _ in issues if level == "error"}))
        got_warn = "".join(sorted({ch for _, level, ch, _, _ in issues if level == "warn"}))
        if got_error != "".join(sorted(set(want_error))):
            failures.append(f"{name}: error 期待 {sorted(set(want_error))!r} 実際 {sorted(got_error)!r}")
        if got_warn != "".join(sorted(set(want_warn))):
            failures.append(f"{name}: warn 期待 {sorted(set(want_warn))!r} 実際 {sorted(got_warn)!r}")
    return failures


def iter_files(root: str):
    """リポジトリ内の検査対象ファイルを列挙する（symlink と対象外パスは除く）。"""
    for dirpath, dirnames, filenames in os.walk(root):
        dirnames[:] = sorted(
            d for d in dirnames if d != ".git" and not os.path.islink(os.path.join(dirpath, d))
        )
        for filename in sorted(filenames):
            path = os.path.join(dirpath, filename)
            if os.path.islink(path):
                continue
            rel = os.path.relpath(path, root).replace(os.sep, "/")
            if IGNORE_PATHS.search(rel):
                continue
            yield path, rel


def read_text(path: str) -> str | None:
    """UTF-8 のテキストとして読む。バイナリなら None。"""
    try:
        with open(path, encoding="utf-8") as handle:
            return handle.read()
    except (UnicodeDecodeError, OSError):
        return None


def main(argv: list[str]) -> int:
    args = [a for a in argv[1:] if a not in ("--all", "--commit-msg")]
    commit_msg_mode = "--commit-msg" in argv
    root = os.getcwd()

    failures = self_test()
    for message in failures:
        print(f"NG: 自己検査に失敗 -> {message}", file=sys.stderr)
    if failures:
        return 1

    if args:
        targets = [(p, os.path.relpath(p, root) if os.path.isabs(p) else p) for p in args]
    else:
        targets = list(iter_files(root))

    errors = 0
    warns = 0
    checked = 0

    for path, rel in targets:
        if not os.path.isfile(path) or os.path.islink(path):
            continue
        if not commit_msg_mode and IGNORE_PATHS.search(rel.replace(os.sep, "/")):
            continue
        text = read_text(path)
        if text is None:
            continue
        if commit_msg_mode:
            text = strip_commit_message(text)
        checked += 1
        for lineno, level, ch, reason, excerpt in find_issues(text):
            codepoint = f"U+{ord(ch):04X}"
            if level == "error":
                errors += 1
                print(
                    f"{rel}:{lineno}: 日本語・英語以外の文字 {codepoint} {reason} | {excerpt}",
                    file=sys.stderr,
                )
            else:
                warns += 1
                print(f"{rel}:{lineno}: 要確認の文字 {codepoint} {reason} | {excerpt}")

    if errors:
        print(f"NG: {errors} 件の違反文字（{checked} ファイル中、要確認 {warns} 件）", file=sys.stderr)
        return 1

    note = f"、要確認 {warns} 件" if warns else ""
    label = "コミットメッセージ" if commit_msg_mode else "ファイル"
    print(f"OK: {label} {checked} 件を検査、日本語と英語以外の文字はありません{note}")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
