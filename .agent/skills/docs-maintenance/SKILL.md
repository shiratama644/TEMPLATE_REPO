---
name: docs-maintenance
description: Use when docs change, before commit, or when cleaning duplicate docs. Check internal links, TOC, secrets, and external URLs.
---

# Docs Maintenance — ドキュメント整理とURL検証スキル

> 正本: `AGENTS.md`（読込順序・5点出力・docs-only代替）、`docs/README.md` 索引、`.agent/logs/` 参照

## 読込順序（AGENTS.md最優先）

1. `AGENTS.md` → 2. `.agent/` recursively → 3. `README.md` → 4. `docs/` recursively 全文、部分読み禁止
2. `docs/README.md` 索引に無いファイルは孤児・混入・残骸を疑う（例: 旧 `docs/ARCH.md`, `ROADMAP.md`, `TECH_SELECTION.md` 等はPRで混入しやすい）
3. 正本は `docs/`（仕様: arch/ + 計画: planning/ + 調査: research/ + 運用: ops/ + 進捗: task-list.md + 監査: audit/）と `.agent/`（Agent設定）

## 提案ファイルの後始末ルール

- 「提案」として作った一時ファイル（例: `docs/ops/*-proposal.md`）は、採用後に正本の場所へ移し、提案ファイルは削除する
- 採用後は docs 内の参照を正本の場所へ書き換える

```bash
ls docs/ops/  # README.md + quality-gates.md 等のみであることを確認
grep -R "github-actions-proposal" docs/ --include="*.md"  # 0件
```

## 内部リンク整合性チェック

コードスパン除外してMarkdownリンクを抽出し、相対パス解決で存在確認:

```python
# コードスパン除外してMarkdownリンク抽出（汎用）
import re, pathlib
for md in pathlib.Path('docs').rglob('*.md'):
    text = md.read_text(errors='ignore')
    text = re.sub(r'```.*?```', '', text, flags=re.DOTALL)  # fenced code除外
    text = re.sub(r'`[^`]*`', '', text)  # inline code除外
    for m in re.finditer(r'\[.*?\]\(#?([^)]+)\)', text):
        url = m.group(1)
        if url.startswith('http'): continue
        if url.startswith('#'): continue
        if url.startswith('mailto:'): continue
        target = (md.parent / url.split('#')[0]).resolve()
        if not target.exists():
            print(f"BROKEN {md}: {url}")
```

- 階層変更時（例: `docs/` → `docs/arch/`）は `../` / `../../` がずれる。`git mv` + 中身修正を同時に行うと解決先を深くする必要がある
- 自動リンクチェッカーで回すのが速い

## 外部URL検証ルール

| カテゴリ | 正本URL例 | ミラー・旧URL | 対応 |
|---|---|---|---|
| Biome import制限 | https://biomejs.dev/linter/rules/no-restricted-imports/ | `.../javascript/` redirect OK | 公式pathを使う |
| pre-commit | https://pre-commit.com/ | - | 公式 |
| gitleaks | https://github.com/gitleaks/gitleaks | - | 公式 |
| GitHub workflow syntax | https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax | - | 公式 |
| Claude Code | https://code.claude.com/docs/en/ | - | 公式 |

### 検証方法

外部 URL は `fetch_page` で本文が取れるか確認する。

```json
{
  "url": "https://biomejs.dev/linter/rules/no-restricted-imports/"
}
```

内部リンクは `bash` で正本チェッカーを使う（自前 grep は使わない）。

```bash
bun run links
```

`verify-doc-integrity` は本スキルへ統合した。機密の混入は `bash` で `git diff --cached --name-only` を見る。目次は `docs/` の追加・削除と `docs/README.md` を `read_file` で突き合わせる。

- Mirrors `aidoczh/w3cub` は機能するが非公式、primary usageからは排除、参考リンク程度に留める
- 途中で切れた URL（例: 末尾が欠けた `https://` のみの文字列）は grep の切り出しによる誤検出。抽出方法を直して再検査する

## docs更新時の5点出力（AGENTS.md準拠）

1. 変更ファイル一覧
2. 内部リンク検証結果
3. 外部URL検証結果
4. 旧名称・proposal参照残存チェック
5. 次のTODO

## 運用ルール

- `docs/README.md` を索引として維持、新規ドキュメント追加時は必ず索引にも追記（arch/, planning/, research/, audit/, ops/, task-list.md）
- 設計の正本は `docs/arch/`（どう作るか）、進捗の正本は `docs/task-list.md`、計画は `docs/planning/`、調査は `docs/research/`、監査は `docs/audit/`、運用は `docs/ops/`
- 実装テクニックは `.agent/skills/`、作業規約は `AGENTS.md` / `.agent/rules/` を正とする
- 旧名称が残っていないか `grep -R "旧名称" docs/ --include="*.md"` で確認
- ファイル名は短く正確、ハイフン最大1つ

## 関連

- `docs/README.md` 索引（arch/ + planning/ + research/ + audit/ + ops/ + task-list.md）
- `docs/task-list.md` 進捗正本
- `docs/arch/README.md` 仕様書一覧
- `AGENTS.md` 読込順序・5点出力
- 機械検証は本スキルの「検証方法」。内部リンクは `bash`、外部 URL は `fetch_page`
