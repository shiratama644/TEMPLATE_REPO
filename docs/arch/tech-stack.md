# tech-stack.md — 技術スタック

## ランタイム

- Node.js v24 LTS (`.nvmrc` + `.node-version` 24, corepack)
- pnpm 12.6.0 (`packageManager`固定)
- TypeScript 6.0.3 (v6系, jsx preserve, paths @/*/@packages/*/@apps/*, allowImportingTsExtensions)

## Lint/Format/Test

- Biome 2.5.14 (ESLint撤去)
- Vitest 5.0.2 + coverage-v8 5.0.2 + Playwright 1.63.0 (threshold 100%)
- husky 9.1.7 + lint-staged 17.6.0 (pre-commit: biome + cspell)
- commitlint 21.2.3 + commitizen 4.3.2 (Conventional Commits)

## 品質ツール

- cspell 10.3.4 (スペルチェック)
- knip 6.38.0 (未使用コード検出, KNIP_DISABLE_RAW_TRANSFER=1)
- size-limit 14.0.1 + @size-limit/preset-small-lib 14.0.1 (10kB) + andresz1/size-limit-action@v1 (PRコメントbot)
- publint 0.3.24 (npm公開品質)
- taze 21.1.0 (依存更新確認)
- Lighthouse CI (@lhci/cli 0.15.1 + lighthouse 13.0.0 + treosh/lighthouse-ci-action@v12, lighthouserc.json)

## CI/CD強化

- Auto-merge (automerge.yml, renovate[bot]/dependabot[bot], gh pr merge --auto --squash, major/BREAKING除外)
- Preview Deploy (preview.yml, フレームワーク自動検出 Vite/Next/Astro/Nuxt, artifact 7日, PRコメント, Pages/Vercel/Cloudflare案内)
- Bundle Size Bot (bundle-size.yml, size-limit-action@v1, bundle-analysis, artifact 7日)
- Lighthouse CI (lighthouse.yml, 週次, mobile/desktop matrix, PRコメント, artifact 14日, temporary-public-storage)
- CI/CD Check (scripts/check-cicd.ts, scripts/lib/cicd.ts, preview.ts, bundle.ts, automerge.ts)

## セキュリティ

- CodeQL (github/codeql-action@v4, security-extended + security-and-quality, 週次スキャン)
- Dependency Review (actions/dependency-review-action@v4, high以上ブロック, ライセンスチェック)
- Gitleaks (gitleaks/gitleaks-action@v2, シークレットスキャン)
- Anchore SBOM (anchore/sbom-action@v0, CycloneDX + SPDX)
- OpenSSF Scorecard (ossf/scorecard-action@v2.4.2, SARIF)
- pnpm audit (moderate警告, high以上失敗)
- Custom security scan (scripts/check-security.ts, 15パターン, SBOM生成, ライセンス互換性)
- .gitleaks.toml (Allowlist, カスタムルール)

## リリース・自動化

- Renovate (pnpm対応, 9グループ化, Asia/Tokyo月曜3am)
- Changesets (@changesets/cli 3.0.3, privatePackages.version:true)
- GitHub Actions: pnpm/action-setup@v4 + setup-node@v4 cache:pnpm + checkout@v6

## インフラ

- Docker (Node 24 LTS, multi-stage, BuildKitキャッシュ)
- DevContainer (Node 24 LTS + pnpm, forwardPorts 3000/5173)

## 汎用スクリプト

- `scripts/lib/detector.ts` (312行) — ProjectDetector
- `scripts/lib/cache.ts` — ハッシュベースキャッシュ
- `scripts/lib/termux.ts` — 9種判定
- `scripts/lib/next-termux.ts` — Webpack強制
- `scripts/lib/bootstrap/` — Feature Manifest (types, manifest, presets, validator, backup, yaml-utils, engine, prompts, readme-generator)
- `scripts/setup.ts` — Bootstrap CLI v2 (@clack/prompts, 7プリセット)

## 参考

- cod-web arena/01a0b161-cod-web: 活発なリポジトリのtech-stack調査（2026-09-27）
- DropMod CI: static-checks + build + e2e, pnpm/action-setup
- PalmIDE: rules/トピック分割、hooks/POSIX sh
