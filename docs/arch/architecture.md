# architecture.md — レイヤー・リポジトリ・依存規則

## レイヤー

```
L0: Runtime (Node 24 LTS + pnpm 12.6.0 + TypeScript 6)
L1: Tooling (Biome, Vitest, Playwright, husky, cspell, knip, size-limit, publint, stryker, axe-core, tinybench, fast-check, dep-cruiser, jscpd, type-coverage)
L2: Scripts (detector, cache, termux, bootstrap, execute, check, dev, build, quality, a11y, visual, bench, check-e2e)
L3: App (src/index.ts, _tests_/, docs/, .agent/, e2e/, bench/)
```

## リポジトリ構成

```
TEMPLATE_REPO/
├── .agent/          # Agent設定（公式.claude/準拠）
│   ├── rules/       # トピック別ルール（pathsで発火）
│   ├── skills/      # コードベース知識（project-overview, tech-stack等 14個）
│   ├── agents/      # サブエージェント定義（explore, plan, doc-editor, code-reviewer, test-writer）
│   ├── hooks/       # フック手順 + 実行スクリプト（pre-task, verify-commit, log-task, sandbox-recovery, restore-env.sh, pre_edit_guard.sh, post_edit_verify.sh）
│   ├── commands/    # 旧commands互換（commit, review, test）
│   ├── output-styles/ # 出力スタイル（concise, detailed）
│   └── workflows/   # 動的ワークフロー（implement-task.js）
├── .github/         # GitHub設定
│   ├── workflows/   # CI/CD 13種（ci, security, codeql, dependency-review, release, automerge, preview, bundle-size, lighthouse, mutation, a11y, visual, benchmark, quality, label, stale）
│   ├── ISSUE_TEMPLATE/ # bug_report, feature_request, question, config
│   ├── CODEOWNERS, PULL_REQUEST_TEMPLATE.md, SECURITY.md, FUNDING.yml, labeler.yml
│   └── codeql/      # codeql-config.yml
├── .husky/          # Git hooks（pre-commit: lint-staged + typecheck, commit-msg: commitlint）
├── .changeset/      # Changesets設定
├── .devcontainer/   # DevContainer（Node 24 LTS + pnpm）
├── docs/            # ドキュメント一式
│   ├── README.md    # 目次（arch/ + planning/ + research/ + audit/ + complete/ + ops/ + examples/ + task-list.md）
│   ├── task-list.md # 進捗正本（唯一の正本）
│   ├── arch/        # 仕様書 13種（product, architecture, tech-stack, bootstrap, detector, cache, termux, cicd, quality, security, engineering, adr, milestones）
│   ├── planning/    # 計画書（_TEMPLATE.md形式, robustness-plan.md, complete/）
│   ├── research/    # 調査結果
│   ├── audit/       # 差分・バグ監査（activity.md, index.md）
│   ├── complete/    # 完了レポート（migration.md）
│   ├── ops/         # 運用（index.md）
│   └── examples/    # Vite/Next設定例（vite.config.example.ts, next.config.example.mjs）
├── scripts/         # 汎用スクリプト
│   ├── lib/         # 16種: a11y, automerge, bench, bootstrap/*(7), bundle, cache, cicd, detector, errors, logger, next-termux, preview, quality, security, termux, visual
│   ├── execute.ts   # install→build(機能差分スキップ+キャッシュ)→start(色分け並列)
│   ├── check.ts     # 品質ゲート 13タスク（install先行→残り並列, publint/size-limitはnon-blocking, security:check含む）
│   ├── check-e2e.ts # E2E discovery fallback（browsers未インストール時はfile listing）
│   ├── check-cicd.ts # CI/CD統合チェック
│   ├── check-determinism.ts # 禁止API検出
│   ├── check-env.ts # 環境チェック（Termux検出）
│   ├── check-security.ts # セキュリティ統合チェック
│   ├── dev.ts       # 汎用ランチャー（Vite/Next/Turbo/Monorepo自動検出, Termux対応）
│   ├── build.ts     # 汎用ビルド（同上）
│   ├── setup.ts     # Bootstrap CLI v2（@clack/prompts, 7プリセット）
│   └── verify-docs.ts # ドキュメント整合性検証
├── src/             # エントリ（size-limit計測対象 10kB）
│   ├── cache/lru.ts
│   ├── detector/project.ts
│   ├── utils/result.ts, string.ts, validation.ts
│   └── index.ts     # templateVersion, hello(), createProjectConfig()
├── _tests_/         # テスト 88 files / 1088 tests（coverage 100%）
│   ├── src/         # src/と同じ構造（lib/quality.test.ts, a11y.test.ts, visual.test.ts, bench.test.ts, utils/property.test.ts, smoke.test.ts 等）
│   └── scripts/     # robustness, auto-detect, cache-invalidation, new-repo, execute, template-e2e, setup, bootstrap-improvements
├── bench/           # Benchmark（lru.bench.ts, detector.bench.ts, security.bench.ts, vitest bench + tinybench）
├── e2e/             # E2E（a11y.e2e.ts @a11y 4 tests, visual.e2e.ts @visual 4 tests, Playwright）
├── bin/             # create-template.mjs
├── Dockerfile, docker-compose.yml, .dockerignore
├── package.json     # pnpm 12.6.0, scripts 50+, size-limit, lint-staged
├── pnpm-workspace.yaml, pnpm-lock.yaml
├── tsconfig.json, vitest.config.ts, vitest.bench.config.ts, playwright.config.ts
├── biome.json, cspell.json, knip.json, dependency-cruiser.config.cjs, jscpd.config.json
├── lighthouserc.json, stryker.config.json, renovate.json, commitlint.config.js
└── AGENTS.md, README.md, CONTRIBUTING.md, LICENSE
```

## 依存規則

- `src/` → `scripts/lib/` 禁止（srcは独立）
- `scripts/` → `src/` 禁止（scriptsは汎用）
- `docs/` → コード 禁止（docsは仕様のみ）
- `.agent/skills/` → `docs/` はOK（事実参照）
- `scripts/lib/bootstrap/` → `scripts/lib/` の他ファイルはOK

## 検出優先順位

`scripts/lib/detector.ts` の `detectRootProject()`:

1. `turbo.json` → Turbo
2. `pnpm-workspace.yaml` + `packages/*` or `apps/*` with content → Monorepo
3. `vite.config.*` → Vite
4. `next.config.*` → Next.js
5. `tsc` → Plain TS

空の `packages/` は無視（誤爆防止）。混在（apps/web:next + apps/docs:vite）は個別検出 `detectApps()` で対応。

## 参考

- cod-web arena/01a0b161-cod-web: `docs/arch/architecture.md` — L0-L3、モノレポ、依存規則
