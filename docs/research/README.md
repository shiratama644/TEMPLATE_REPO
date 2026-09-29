# docs/research — 調査結果

ここは競合・関連技術の調査結果を置く場所です。仕様へ採用する場合は `../arch/` へ反映してから実装します。

> **参考**: `shiratama644/cod-web` の `arena/01a0b161-cod-web` ブランチ構成を参考に復旧（2026-09-27調査）。活発なリポジトリでは `research/` が調査の正本。

## 構成

```
research/
├── README.md          ← 本ファイル
├── TEMPLATE_REPO_RESEARCH.md  # 本テンプレートの技術選定調査（例）
└── <TOPIC>_RESEARCH.md        # 個別調査
```

## 運用ルール

- 調査は `RESEARCH.md` 形式で、目的・調査対象・結果・採用判断（採用/不採用/要確認）を書く
- 外部URLは公式ソースを優先、ミラーは排除
- 調査結果を `arch/` へ反映する際は、該当 `arch/*.md` を更新し、本ディレクトリの調査と相互リンク
- 過去の調査は書き換えず、新調査で追記

## 調査済み（TEMPLATE_REPO）

| 調査 | 結果 | 採用先 |
|---|---|---|
| cod-web arena/01a0b161-cod-web | docs/: arch/ + planning/ + research/ + ops/ + task-list.md が標準 | 本テンプレートの docs/構成に採用 |
| DropMod CI | pnpm/action-setup@v4 + cache:pnpm + checkout@v6 + static-checks + build + e2e | ci.ymlに採用 |
| PalmIDE | rules/トピック分割、agents/定義、hooks/POSIX sh | .agent/構成に採用 |
| ytdl | 検証キットUX (?probe=1 / 1 fetch) | sandbox-constraintsスキルに採用 |
| Termux 9種判定 | TERMUX_VERSION/PREFIX/com.termuxファイル/androidプラットフォーム等 | scripts/lib/termux.tsに採用 |
| Bootstrap CLI | Feature Manifestパターン、7プリセット、@clack/prompts | scripts/lib/bootstrap/に採用 |

## 次の調査候補

- Vite 7 / Next.js 16 のキャッシュ戦略
- Turborepo 2.x のリモートキャッシュ
- Biome 3.x の移行影響
