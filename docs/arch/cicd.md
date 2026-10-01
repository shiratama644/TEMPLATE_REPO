# cicd.md — CI/CDアーキテクチャ

## 概要

このテンプレートはCI/CDのベストプラクティスを網羅し、以下の機能を提供します。

## ワークフロー一覧

### 1. CI (`ci.yml`)

- **トリガー**: `main` / `arena/**` へのpush, PR, 手動
- **ジョブ**:
  - `static-checks`: typecheck, lint, security:check, determinism, cspell, knip, publint, size-limit, coverage (100% threshold), E2E discovery
  - `build`: pnpm build + キャッシュ (Next.js, Vite, Turbo)
  - `e2e`: Playwright (push時のみ, PRではスキップ)
- **最適化**: concurrency cancel, paths-ignore (docs等), build cache

### 2. Security (`security.yml`)

- Gitleaks secret scan, pnpm audit, SBOM (CycloneDX+SPDX via anchore), license check, OpenSSF Scorecard

### 3. CodeQL (`codeql.yml`)

- security-extended + security-and-quality, 週次スキャン

### 4. Dependency Review (`dependency-review.yml`)

- high以上ブロック, GPL/AGPL/SSPL拒否, Scorecard, PRコメント

### 5. Release (`release.yml`)

- Changesetsによるバージョン管理と自動リリース

### 6. Auto-merge (`automerge.yml`) — NEW

- **目的**: Renovate / Dependabot PRの自動マージ
- **トリガー**:
  - `pull_request` / `pull_request_target` (opened, synchronize, labeled)
  - `workflow_run` (CI, Security, Bundle Size, Lighthouse CI完了時)
  - `workflow_dispatch` (手動)
- **条件**:
  - Actor: `renovate[bot]`, `dependabot[bot]`, `github-actions[bot]`
  - Label: `dependencies`, `automerge`, `renovate`, `dependabot`
  - Title prefix: `chore:`, `chore(deps)`, `fix(deps)`, `deps:`
  - 除外: `major`, `BREAKING`, draft
- **動作**:
  - `gh pr merge --auto --squash` でauto-merge有効化
  - CI成功後に自動マージ
  - PRコメントで状態通知
- **安全策**:
  - major/BREAKINGはスキップ
  - draftはスキップ
  - `automerge`ラベルで明示的に許可も可能
- **設定**: `scripts/lib/cicd.ts` の `DEFAULT_AUTOMERGE_CONFIG`

```yaml
# Renovate側でもautomerge設定可能
# renovate.json
{
  "packageRules": [
    {
      "matchUpdateTypes": ["minor", "patch"],
      "automerge": true
    }
  ]
}
```

### 7. Preview Deploy (`preview.yml`) — NEW

- **目的**: PRごとのプレビュービルドとデプロイ
- **トリガー**: PR (opened, synchronize, reopened, ready_for_review)
- **検出**: フレームワーク自動検出 (Next.js, Vite, Astro, Nuxt)
  - Next.js → `.next`
  - Vite/Astro → `dist`
  - Nuxt → `.output/public`
- **ジョブ**:
  - `build-preview`: ビルド + preview artifact作成 (7日保持)
  - `comment-preview`: PRにプレビュー情報コメント
  - `deploy-pages-preview`: (無効化済み) GitHub Pagesへのデプロイ — Pages有効化時に `if: false` を外す
- **成果物**:
  - `preview-pr-<number>`: プレビュー用静的ファイル
  - `build-stats-pr-<number>`: ビルド統計
- **デプロイ先オプション** (コメントで案内):
  - GitHub Pages: Settings > Pages > Source: GitHub Actions
  - Vercel: GitHub App連携で自動PRデプロイ
  - Cloudflare Pages: `pnpm build` → `dist`
  - Netlify: `pnpm build` → `dist`
- **ローカル**:
  ```bash
  pnpm preview
  pnpm preview:build
  ```

### 8. Bundle Size (`bundle-size.yml`) — NEW

- **目的**: バンドルサイズの監視とPRコメント
- **トリガー**: PR, main push, 手動
- **ツール**: `size-limit` + `andresz1/size-limit-action@v1`
- **ジョブ**:
  - `size-limit`: `pnpm size`実行 + botコメント + artifact
  - `bundle-analysis`: srcサイズ、node_modules Top20、size-limit --why
- **設定**: `package.json` の `size-limit`
  ```json
  {
    "size-limit": [
      { "name": "template core", "path": "src/index.ts", "limit": "10 kB" }
    ]
  }
  ```
- **ローカル**:
  ```bash
  pnpm size
  pnpm size:why
  pnpm bundle:analyze
  ```
- **しきい値**: 現状は警告のみ (non-blocking)。厳格化する場合は `bundle-size.yml` の `exit 1` を有効化

### 9. Lighthouse CI (`lighthouse.yml`) — NEW

- **目的**: パフォーマンス、アクセシビリティ、SEOの自動監査
- **トリガー**: PR, main push, 手動, 週次 (月曜2AM JST)
- **ツール**: `treosh/lighthouse-ci-action@v12` + `@lhci/cli@0.15.1` + `lighthouse@13`
- **設定**: `lighthouserc.json`
  ```json
  {
    "ci": {
      "collect": {
        "numberOfRuns": 3,
        "staticDistDir": "./dist",
        "url": ["http://localhost:3000/"],
        "startServerCommand": "pnpm dlx serve dist -l 3000 ..."
      },
      "assert": {
        "preset": "lighthouse:recommended",
        "assertions": {
          "categories:performance": ["warn", { "minScore": 0.7 }],
          "categories:accessibility": ["warn", { "minScore": 0.8 }],
          "categories:best-practices": ["warn", { "minScore": 0.8 }],
          "categories:seo": ["warn", { "minScore": 0.8 }]
        }
      }
    }
  }
  ```
- **チェック項目**:
  - Performance: FCP <3s, LCP <4s, CLS <0.15, TBT <500ms
  - Accessibility: 0.8以上
  - Best Practices: 0.8以上
  - SEO: 0.8以上
  - PWA: off (テンプレートでは任意)
- **ジョブ**:
  - `lighthouse`: 静的ビルドを `serve` で配信して監査、PRコメント、artifact (14日)
  - `lighthouse-matrix`: 手動/週次で mobile/desktop マトリクス
- **ローカル**:
  ```bash
  pnpm lighthouse
  pnpm lighthouse:ci
  pnpm lighthouse:mobile
  pnpm lighthouse:desktop
  ```

### 10. Label, Stale

- `label.yml`: PRラベル自動付与
- `stale.yml`: 古いIssue/PRの自動クローズ

## ローカルCI/CDチェック

```bash
# 全チェック
pnpm cicd:check

# 個別
pnpm automerge:check
pnpm preview
pnpm bundle:analyze
pnpm lighthouse
```

`scripts/check-cicd.ts` が以下を検証:
- 必須ワークフロー存在 (9個)
- 必須設定存在 (lighthouserc.json, package.json size-limit, gitleaks, codeql)
- Auto-mergeロジック
- Preview検出
- Bundleサイズパース
- Lighthouseしきい値

## 補助スクリプト

- `scripts/lib/cicd.ts`: CI/CDユーティリティ
  - `shouldAutomerge()`: 自動マージ判定
  - `detectPreviewConfig()`: フレームワーク検出
  - `parseSizeLimitOutput()`, `parseSizeToBytes()`, `formatBytes()`, `calculateDiff()`
  - `checkLighthouseThresholds()`: しきい値判定
  - `generatePreviewUrl()`, `generateBundleSizeComment()`, `generateLighthouseComment()`
- `scripts/lib/preview.ts`: プレビュー生成
- `scripts/lib/bundle.ts`: バンドル分析
- `scripts/lib/automerge.ts`: 自動マージ判定ヘルパー
- `scripts/check-cicd.ts`: 統合チェック

## セキュリティ考慮

- `pull_request_target` 使用時は `actions/checkout` を慎重に (コード実行を避ける)
- `GITHUB_TOKEN` の権限は最小限 (contents: read, pull-requests: write 等)
- Auto-mergeはbotとdependenciesのみ、major/BREAKINGは除外
- Preview deployは `if: false` でPagesデプロイを無効化 (有効化は利用者が判断)
- Bundle sizeは警告のみでブロックしない (テンプレートの柔軟性)

## 今後の拡張

- [ ] Vercel/Cloudflare Pagesのネイティブ統合 (現在はコメントで案内)
- [ ] Lighthouse CIのLHCIサーバー連携 (private server)
- [ ] Bundle sizeのベースライン比較 (mainブランチとの差分)
- [ ] Previewのコメントに実際のデプロイURLを含める (Pages/Vercel URL)
- [ ] Auto-mergeの承認数チェック (minApprovals)

## 参考

- [Auto-merge Action](https://github.com/peter-evans/enable-pull-request-automerge)
- [Size Limit Action](https://github.com/andresz1/size-limit-action)
- [Lighthouse CI Action](https://github.com/treosh/lighthouse-ci-action)
- [GitHub Pages Deploy](https://github.com/actions/deploy-pages)
- [Renovate Automerge](https://docs.renovatebot.com/key-concepts/automerge/)
