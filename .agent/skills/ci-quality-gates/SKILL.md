---
name: ci-quality-gates
description: GitHub Actionsのquality-gatesを唯一の正本として扱い、typecheck/lint/determinism/unit/coverage/build/E2E discoveryを段階的に実行するCIスキル。手動dispatch、threshold管理、artifact共有を含む。
---

# CI Quality Gates — quality-gatesを正本として扱うスキル

> 出典: cod-web `arena/01a0b161-cod-web` 最新arenaブランチの `ci-quality-gates/SKILL.md` をpnpm用に汎用化
> 正本: `.github/workflows/ci.yml`（本テンプレートではci.ymlが唯一の正本）、`docs/ops/`（あれば）

## 原則

- **`.github/workflows/ci.yml` が唯一の正本**。`docs/ops/github-actions-proposal.yml` のような提案ymlは採用後に削除、docsに再作成しない
- Agentは `.github/workflows/` を直接作成しない（提案→承認フローが基本）。ただしテンプレート整備やCI効率化のための直接書き込みは例外として許可
- `ci.yml` の解説は `docs/ops/` や `README.md` に書くが、workflow自体の複製はしない（正本は1つ）

## ci.yml構成（本テンプレート現行、DropMod + cod-web最新arena統合）

```yaml
name: ci
on:
  push: { branches: [main, 'arena/**'] }
  pull_request: { branches: [main] }
  workflow_dispatch:
    inputs:
      job:
        description: 'Run specific job (all/quality/e2e)'
        required: false
        default: 'all'

jobs:
  static-checks:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v6
      - uses: pnpm/action-setup@v4   # version非明示、packageManagerから解決
      - uses: actions/setup-node@v4
        with:
          node-version-file: .nvmrc
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm typecheck
      - run: pnpm lint
      - run: pnpm check:determinism   # 追加: 禁止API検出（本スキルで新設）
      - run: pnpm test:coverage       # threshold 85/85/85/85
      - run: pnpm test:e2e -- --list  # discoveryのみ、browser実行はe2e jobで

  build:
    runs-on: ubuntu-latest
    needs: static-checks
    steps:
      - uses: actions/checkout@v6
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with: { node-version-file: .nvmrc, cache: pnpm }
      - run: pnpm install --frozen-lockfile
      - run: pnpm build
      - run: tar ... # artifact tar化で高速化

  e2e:
    runs-on: ubuntu-latest
    needs: [static-checks, build]
    if: ${{ always() && (inputs.job == 'all' || inputs.job == 'e2e' || github.event_name != 'workflow_dispatch') }}
    steps:
      - uses: actions/checkout@v6
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with: { node-version-file: .nvmrc, cache: pnpm }
      - run: pnpm install --frozen-lockfile
      - run: pnpm exec playwright install --with-deps chromium
      - run: pnpm test:e2e
```

### inputs.job

- `all` (default): quality + e2e 両方
- `quality`: qualityのみ
- `e2e`: e2eのみ
- `workflow_dispatch` 手動実行時に選択可能

## 品質ゲート一覧（本テンプレート）

| コマンド | 目的 | 失敗時の典型 |
|---|---|---|
| `pnpm typecheck` | tsc --noEmit | 型エラー、import境界違反 |
| `pnpm lint` | biome lint | import制限、noConsole、any濫用 |
| `pnpm check:determinism` | 禁止API検出 | Math.random / Date.now / setTimeout が純粋関数に混入（determinismスキル参照） |
| `pnpm test:unit` | Vitest unit | 意味あるテスト失敗 |
| `pnpm test:coverage` | threshold 85/85/85/85 | Statements/Branches/Functions/Lines 未達 |
| `pnpm build` | 型+バンドル | importエラー、型エラー |
| `pnpm test:e2e -- --list` | E2E discovery | spec構文エラー、configエラー |

## Manual dispatch（手動実行）

- GitHub Actions UI → ci → Run workflow → job選択
- docs: https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax (on.workflow_dispatch.inputs)
- 公式docsで `inputs` の書き方を確認済み（cod-web 2026-09-22検証）

## Sandboxでの代替検証（AGENTS.md §3.1準拠）

- docs-only変更時は4検証をスキップ可能だが、リンクチェッカーとURL検証で代替
- pre-commit hook `git commit` without --no-verifyは typecheck+biome+determinism+vitest でtimeoutする可能性。docs-onlyなら `--no-verify` で回避可

## よくある失敗と対処

- `pnpm-lock.yaml` が古い: `pnpm install` → `git diff pnpm-lock.yaml` を確認、CIは `--frozen-lockfile` なので不一致で失敗
- `pnpm/action-setup` version固定: v4を使い、`with.version` は非明示（packageManagerから解決、重複エラー回避）
- Playwright browser未インストール: CIでは `pnpm exec playwright install --with-deps chromium` 必須、localでは `pnpm exec playwright install chromium`
- proposal ymlをdocsに再作成: しない、`.github/workflows/` が正本
- checkout version: v6が最新、v4でも動くが最新を使う

## 関連

- `.github/workflows/ci.yml` 正本
- `docs/README.md` 索引
- `scripts/check.ts` 並列品質ゲートスクリプト（check-all.tsから改名、cod-web最新arena由来）
- `scripts/check-determinism.ts` 禁止API検出スクリプト
- `.agent/skills/determinism/SKILL.md` 決定論スキル
- `.agent/skills/testing/SKILL.md` テストスキル
- cod-web `arena/01a0b161-cod-web` の `ci-quality-gates/SKILL.md`（元出典）
