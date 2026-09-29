---
name: testing
description: Vitest unit/coverageで意味あるテストを書くスキル。include-all方針、handlers分離、facade分離、mock戦略、threshold ratchet、意味あるassertionの実践。
---

# Testing — 意味あるテストでcoverage 100%を達成するスキル

> 出典: cod-web `arena/01a0b161-cod-web` 最新arenaブランチの `testing/SKILL.md` を汎用化
> 正本: `vitest.config.ts`、`docs/ops/quality-gates.md`（あれば）、`AGENTS.md §3`

## 原則

- 数字稼ぎの浅い snapshot / render存在確認ではなく、壊れるとプロダクトが壊れる経路を優先
- import-only test、実装詳細だけのshallow test、難しいproduction fileの安易なexcludeをしない
- assertion弱体化をしない、意味あるテストのみ
- `bun test`（bun:test）は使わない場合もある（jsdom + @testing-library/react のDOMテスト資産との互換を優先する場合はVitest維持）。本テンプレートはpnpn + Vitest

## Coverage方針（cod-web EM02で確立を汎用化）

### include-all方針

- `server/index.ts` 0%、`App.tsx` 0%のようなエントリーポイントも含めて100%を目指す
- テスト可能にリファクタ（handlers.ts分離、depsファサード分離）し、モックで意味あるテストを書く、除外で数字を作らない

### baseline → meaningful → ratchet

| Phase | Statements | Branches | Functions | Lines | Threshold |
|---|---|---:|---:|---:|---:|
| baseline | 66% | 57% | 64% | 68% | 0% |
| after meaningful | 79% | 73% | 79% | 80% | 79/73/79/80 |
| after handlers split + facade | 95% | 87% | 90% | 96% | 85/85/85/85 |

- 最初は0% thresholdでbaseline計測 → 意味あるテスト追加 → handlers分離やfacade分離でテスト容易性向上 → thresholdを100%にratchet

### 公式ルール: テストファイル命名と配置

> **命名**: `<name>.test.ts` 形式に統一（`test-*.ts` 禁止）
> **配置**: `_tests_/` に同じディレクトリ構造で配置（例: `src/index.ts` → `_tests_/src/index.test.ts`）

詳細は `.agent/rules/04_verification.md` §5 を参照。

### vitest.config.ts（本テンプレート用）

```ts
import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    // NOTE: _tests_/scripts は node --experimental-strip-types のスタンドアロンRunner（vitestではない）ため include しない
    include: ['src/**/*.{test,spec}.ts', 'tests/**/*.{test,spec}.ts', '_tests_/src/**/*.{test,spec}.ts'],
    exclude: ['**/node_modules/**', '**/.git/**'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        '**/dist/**',
        '**/*.d.ts',
        '**/vite-env.d.ts',
        // entrypoint / type-only / generated は理由付きで除外可
      ],
      thresholds: {
        statements: 85,
        branches: 85,
        functions: 85,
        lines: 85,
      },
      reporter: ['text', 'json-summary', 'lcov'],
    },
  },
});
```

- reporterは `text`, `json-summary`, `lcov` を基本、HTMLはローカル確認用
- coverage/ はartifact、Gitに入れない（.gitignore）

## 低カバレッジファイルの改善パターン（cod-web EM02実績を汎用化）

| File | Before | After | 方法 |
|---|---|---|---:|
| `server/index.ts` | 0% | ~80% | `handlers.ts`分離 + `index.test.ts`でserveモック + ws handlers呼び出し + interval loop |
| `handlers.ts` | 新規 | 97% stmts | 純粋ハンドラ分離、open/message/drain/close/fetchをunitでテスト |
| `App.tsx` | 0% | 100% | `App.test.tsx`で子コンポーネントをモックしてApp統合テスト |
| `Engine.ts` | 2% | 96% | `engineDeps.ts`ファサード分離 + `vi.mock`でWebGL非依存モック + lifecycle/resizeテスト |
| `InputController.ts` | 72% | ~95% | WASD/矢印、deadzone/normalize、pointer、attach/detach |

### パターン1: handlers分離

```ts
// Before: index.ts に直接 server + handlers が混在
// After:
// handlers.ts - 純粋関数として分離、副作用なし
export function handleOpen(ws) { ... }
export function handleMessage(ws, msg) { ... }
// index.ts - 配線のみ
import { handleOpen, handleMessage } from './handlers';
```

### パターン2: depsファサード分離

```ts
// Before: 直接 new Engine(canvas)
// After:
// engineDeps.ts - 外部依存をファサード化
export function createEngine(canvas) { return new Engine(canvas); }
export function createScene(engine) { return new Scene(engine); }
// Engine.ts - ファサード経由
import { createEngine, createScene } from './engineDeps';
// テストでは vi.mock('./engineDeps')
```

## モック戦略

### Serverモック

```ts
vi.stubGlobal('Bun', {
  serve: vi.fn((opts) => {
    // opts.websocket.open/message/drain/closeを保存してテストから呼ぶ
    return { stop: vi.fn() };
  }),
});
// pnpm版では Node http server をモック
vi.mock('node:http', () => ({ createServer: vi.fn() }));
```

### WebGL / Canvasモック（jsdomでも動く）

```ts
vi.mock('@babylonjs/core/Engines/engine', () => ({
  Engine: vi.fn(() => ({
    resize: vi.fn(),
    runRenderLoop: vi.fn(),
    dispose: vi.fn(),
  })),
}));
vi.mock('../engineDeps', () => ({
  createEngine: vi.fn(),
  createScene: vi.fn(),
}));
```

### App.tsxモック

```ts
vi.mock('./components/GameCanvas', () => ({ default: vi.fn(() => <div data-testid="game-canvas" />) }));
vi.mock('./components/Hud', () => ({ default: () => <div /> }));
```

## 意味あるテストの例

- `broadcastExcept` はexceptId以外に送ることを検証、単に呼ぶだけではない
- `MAX_QUEUED_INPUTS`超過は「古い入力が捨てられ遅延が防がれる」を検証
- grace期間は「不一致かつGRACE_MS超過でdisposeされる」を検証
- deadzoneは中心ブレで斜めジグザグにならないことを検証

## 監査コマンド

```bash
pnpm test:coverage  # Statements 100%+ / Branches 100%+ / Functions 100%+ / Lines 100%+
pnpm test:unit      # 全テスト実行
pnpm test:e2e -- --list  # E2E discovery
```

## よくある失敗

- `any`濫用でカバレッジを稼ぐ → 禁止、`@ts-expect-error` や `vi.mock` の型は最小限に
- `server/index.ts` をimportするとserver起動 → handler抽出のseamが必要
- `App.tsx` のnull ref branchはjsdomでは再現しにくい → factory注入とplaceholderテストでカバー
- snapshotテストの乱用 → 意味あるassertionを優先、snapshotはUIの回帰検出のみ

## 関連

- `vitest.config.ts` coverage設定
- `.github/workflows/ci.yml` quality gates
- `.agent/skills/ci-quality-gates/SKILL.md` CIスキル
- `.agent/skills/e2e/SKILL.md` E2Eスキル
- `AGENTS.md §3` テスト・品質保証ルール
- cod-web `arena/01a0b161-cod-web` の `testing/SKILL.md`（元出典）
