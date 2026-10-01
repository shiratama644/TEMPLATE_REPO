---
name: e2e
description: Playwright E2EをSandboxでも安全に扱うスキル。webServer配列、baseURL分岐、discovery検証、WebSocketモック、browser非捏造原則。
---

# E2E — PlaywrightをSandboxで安全に扱うスキル

> 出典: cod-web `arena/01a0b161-cod-web` 最新arenaブランチの `e2e/SKILL.md` を汎用化
> 正本: `docs/ops/quality-gates.md`（あれば）、`playwright.config.ts`、`AGENTS.md §6.2`

## Sandbox制約

- E2E browser実行をSandboxで捏造しない（PlaywrightのbrowserはSandboxのegress制限や依存不足で動かないことが多い）
- `pnpm test:e2e -- --list` はbrowserを起動しないdiscovery検証として有用（cod-web PH1.5-C/Dで確立）
- 本物のbrowser実行はCI (`ci.yml` e2e job) またはpreviewで

## playwright.config.ts 正しい構成（汎用テンプレート用）

```ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:5173',
  },
  webServer: process.env.PLAYWRIGHT_BASE_URL ? undefined : [
    {
      command: 'pnpm server',
      port: 3000,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
    {
      command: 'pnpm dev -- --host 0.0.0.0 --port 5173',
      port: 5173,
      url: 'http://localhost:5173',
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      stdout: 'pipe',
      stderr: 'pipe',
    },
  ],
  projects: [{ name: 'chromium', use: { browserName: 'chromium' } }],
});
```

### なぜ配列webServerか

- 単一commandでは `pnpm start`（install/build/server/previewまとめる）が使えるが、並列制御とgracefulShutdownが配列の方が明確
- `PLAYWRIGHT_BASE_URL` がある場合はpreview/CIの既存URLを対象にし、local `webServer` を起動しない構成にすると、同じspecをlocalとCI/previewで使い回せる
- `reuseExistingServer: !CI` でCIでは毎回fresh、localでは再利用

## 公式docs検証（cod-web PH1.5-C/Dで確認済み）

| 項目 | 公式URL | 要点 |
|---|---|---|
| CI | https://playwright.dev/docs/ci | `pnpm exec playwright install --with-deps chromium` が自然 |
| webServer | https://playwright.dev/docs/test-webserver | `command/url/reuseExistingServer/timeout/stdout/stderr/gracefulShutdown` と `use.baseURL` 併用推奨 |
| WebSocket | https://playwright.dev/docs/api/class-websocket | frameのinspect/manipulate |
| Mock | https://playwright.dev/docs/mock#mock-websockets | websocket mocking、page.route、HAR |

## E2E specの書き方（汎用）

- browser-facing codeにbackend `localhost` を書かず、app側の `/ws` same-origin proxyをユーザー可視HUD (`net: connected`) で検証
- `page.waitForSelector('[data-testid="net-connected"]')` のようにHUD経由
- WebSocketは `page.on('websocket', ws => ws.on('framereceived', ...))` で観測

```ts
test('connects via ws proxy and shows HUD', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('start-overlay')).toBeVisible();
  await page.getByTestId('start-button').click();
  await expect(page.getByTestId('net-connected')).toBeVisible({ timeout: 10_000 });
  // WebSocket frames
  page.on('websocket', ws => {
    ws.on('framereceived', ({ payload }) => {
      // payload instanceof ArrayBuffer | string
    });
  });
});
```

- `data-testid` を使うことで、テキスト変更に強いテストになる
- `toBeVisible({ timeout: 10_000 })` のようにタイムアウトを明示

## Discovery検証（Sandboxで実行可能）

```bash
pnpm test:e2e -- --list   # spec列挙のみ、browser起動なし
pnpm test:e2e -- --list 2>&1 | grep "test:"
```

- ci.ymlのe2e jobは `pnpm exec playwright install --with-deps chromium` 後に `pnpm test:e2e`
- `quality-gates` の `static-checks` では `--list` でdiscoveryのみ実行し、spec構文エラーやconfigエラーを早期検出

## よくある失敗

- `localhost:3000` 直叩き: ブラウザ側でlocalhost固定するとpreviewホストで動かない。相対URL + dev server proxyを使う
- `webServer.command` に `pnpm start` しか書かないと、server/clientのログが混ざってデバッグ困難。配列で分離
- `page.route` でwsをmockしようとしてhttpのみmock: `mock#mock-websockets` セクションを参照
- `baseURL` 未設定: `use.baseURL` を設定しないと `page.goto('/')` が失敗

## 関連

- `playwright.config.ts` 設定ファイル
- `tests/e2e/*.spec.ts` E2E spec
- `.github/workflows/ci.yml` e2e job
- `.agent/skills/ci-quality-gates/SKILL.md` CIスキル
- `.agent/skills/testing/SKILL.md` テストスキル
- `AGENTS.md §6.2` E2E制約
- cod-web `arena/01a0b161-cod-web` の `e2e/SKILL.md`（元出典）
