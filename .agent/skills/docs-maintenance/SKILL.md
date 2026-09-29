---
name: docs-maintenance
description: ドキュメント整理とURL検証のスキル。proposal yml削除、内部リンク整合性、外部URL有効性、ミラー排除、AGENTS.md読込順序の遵守を確実にする。
---

# Docs Maintenance — ドキュメント整理とURL検証スキル

> 出典: cod-web `arena/01a0b161-cod-web` 最新arenaブランチの `docs-maintenance/SKILL.md` を汎用化
> 正本: `AGENTS.md`（読込順序・5点出力・docs-only代替）、`docs/README.md` 索引、`.agent/logs/` 参照

## 読込順序（AGENTS.md最優先）

1. `AGENTS.md` → 2. `.agent/` recursively → 3. `README.md` → 4. `docs/` recursively 全文、部分読み禁止
2. `docs/README.md` 索引に無いファイルは孤児・混入・残骸を疑う（例: 旧 `docs/ARCH.md`, `ROADMAP.md`, `TECH_SELECTION.md` 等はPRで混入しやすい）
3. 正本は `docs/`（仕様: arch/, planning/, research/, ops/, examples/ + 進捗: task-list.md + 監査: audit/ + 完了: complete/） + `.agent/`（Agent設定） — cod-web arena/01a0b161-cod-web準拠で復旧（2026-09-27調査、arch/audit/planning/researchは必要）

## Proposal yml削除ルール（cod-web 2026-09-22確立を汎用化）

- `docs/ops/github-actions-proposal.yml` のような提案用ymlは一時的に作っても、採用後は `.github/workflows/*.yml` が唯一の正本
- 採用後は提案ymlを削除し、docs内の参照を全て `.github/workflows/` へ書き換える

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
- 自動リンクチェッカーで回すのが速い（cod-web DOC-4実績）

## 外部URL検証ルール

| カテゴリ | 正本URL例 | ミラー・旧URL | 対応 |
|---|---|---|---|
| Biome import制限 | https://biomejs.dev/linter/rules/no-restricted-imports/ | `.../javascript/` redirect OK | 公式pathを使う |
| Playwright | https://playwright.dev/docs/ | dzone / w3cub mirror | 公式に置換 |
| Vitest coverage | https://vitest.dev/config/coverage | https://v2.vitest.dev/... 404 | 公式に置換 |
| pnpm | https://pnpm.io/ | - | 公式 |
| setup-pnpm | https://github.com/pnpm/action-setup | - | 公式 |
| GitHub workflow syntax | https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax | - | 公式 |
| Claude Code | https://code.claude.com/docs/en/ | - | 公式 |

### 検証方法

```bash
# fetch_pageで200確認、anchorまで含めて取得できるか確認
# 例: https://playwright.dev/docs/mock#mock-websockets はanchor付きで取得可能
```

- Mirrors `aidoczh/w3cub` は機能するが非公式、primary usageからは排除、参考リンク程度に留める
- Truncated URL grep artifact `https://ago`, `https://bu` は bracket cutによる誤検出、better extractionで修正

## docs更新時の5点出力（AGENTS.md準拠）

1. 変更ファイル一覧
2. 内部リンク検証結果
3. 外部URL検証結果
4. 旧名称・proposal参照残存チェック
5. 次のTODO

## 運用ルール

- `docs/README.md` を索引として維持、新規ドキュメント追加時は必ず索引にも追記（arch/, planning/, research/, audit/, ops/, examples/, task-list.md）
- 設計の正本は `docs/arch/`（どう作るか）、進捗の正本は `docs/task-list.md`、計画は `docs/planning/`、調査は `docs/research/`、監査は `docs/audit/`、運用は `docs/ops/`、設定例は `docs/examples/` — cod-web arena準拠で復旧（2026-09-27調査、arch/audit/planning/researchは必要）
- 実装テクニックは `.agent/skills/`、作業規約は `AGENTS.md` / `.agent/rules/` を正とする
- 旧名称が残っていないか `grep -R "旧名称" docs/ --include="*.md"` で確認
- ファイル名は短く正確、ハイフン最大1つ

## 関連

- `docs/README.md` 索引（arch/ + planning/ + research/ + audit/ + ops/ + examples/ + task-list.md）— cod-web arena準拠で復旧
- `docs/task-list.md` 進捗正本
- `docs/arch/README.md` 仕様書一覧
- `AGENTS.md` 読込順序・5点出力
- `.agent/skills/verify-doc-integrity/SKILL.md` 機械検証スキル
- cod-web `arena/01a0b161-cod-web` の `docs-maintenance/SKILL.md`（元出典）
