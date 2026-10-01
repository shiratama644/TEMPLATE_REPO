# security.md — セキュリティアーキテクチャ

## 概要

このテンプレートは多層防御（Defense in Depth）を採用し、以下のセキュリティ機能を提供します。

## セキュリティ機能一覧

### 1. CodeQL Analysis (`codeql.yml`)

- **対象**: JavaScript/TypeScript
- **クエリ**: `security-extended` + `security-and-quality`
- **実行タイミング**:
  - `main` / `arena/**` への push
  - PR (main向け)
  - 毎週月曜 3AM JST (定期スキャン)
  - 手動実行
- **設定**: `.github/codeql/codeql-config.yml`
- **除外**: `node_modules`, `dist`, `.next`, `coverage`, `*.test.ts`, `sbom/`

### 2. Dependency Review (`dependency-review.yml`)

- **対象**: PR時の依存関係変更
- **機能**:
  - 高深刻度以上の脆弱性をブロック
  - 非互換ライセンスをブロック (GPL-2.0, GPL-3.0, AGPL, SSPL)
  - 許可ライセンス: MIT, Apache-2.0, BSD, ISC, CC0等
  - OpenSSF Scorecard表示
  - PRにサマリーコメント
- **追加**: `pnpm audit` (moderate以上警告、high以上で失敗)

### 3. Security Workflow (`security.yml`)

#### 3.1 Secret Scanning
- **Gitleaks**: `gitleaks/gitleaks-action@v2` で全履歴スキャン
- **Custom Scan**: `scripts/check-security.ts --no-audit --no-licenses`
  - 15種類のパターン検出 (AWS, GitHub Token, NPM Token, Private Key, Slack, Stripe, Google API, Password, DB URL, JWT等)
  - Allowlist対応 (example, test, placeholder等)
  - 除外ファイル: `node_modules`, `dist`, `*.test.ts`, `*.md`, `pnpm-lock.yaml`

#### 3.2 Vulnerability Audit
- **pnpm audit**: `moderate`以上を警告、`high`以上で失敗
- **security:check**: カスタム監査スクリプト
  - JSON出力対応
  - `--audit-level` で閾値調整
  - `--fix` で自動修正

#### 3.3 SBOM Generation
- **Anchore SBOM Action**: CycloneDX + SPDX形式
- **Custom Script**: `security:sbom`
  - CycloneDX 1.5 + SPDX 2.3
  - `sbom/sbom.cyclonedx.json` + `sbom/sbom.spdx.json`
  - 依存関係グラフへアップロード
  - Artifactとして30日保持

#### 3.4 License Check
- **pnpm licenses**: 依存関係のライセンス確認
- **license-checker**: 許可リスト検証
- **互換性判定**: `scripts/lib/security.ts` の `checkLicenseCompatibility()`

#### 3.5 OpenSSF Scorecard
- **Scorecard Action**: `ossf/scorecard-action@v2.4.2`
- **SARIF Upload**: CodeQLと統合
- **Publish**: OpenSSF APIへ結果公開

### 4. GitHub Security Features (自動有効化推奨)

以下の機能はリポジトリ設定で有効化してください（テンプレート利用者向け）:

- **Dependabot Alerts**: 脆弱性アラート
- **Dependabot Security Updates**: 自動修正PR
- **Secret Scanning**: シークレット検出 (GitHubネイティブ)
- **Push Protection**: シークレットのpushブロック
- **Code Scanning**: CodeQL結果の表示
- **Private Vulnerability Reporting**: 非公開報告

### 5. Local Security Checks

```bash
# 全チェック
pnpm security:check

# 個別
pnpm security:audit      # npm auditのみ
pnpm security:secrets    # シークレットスキャンのみ
pnpm security:licenses   # ライセンスチェックのみ
pnpm security:sbom       # SBOM生成のみ

# オプション
pnpm security:check --audit-level high --verbose
pnpm security:check --sbom --all
pnpm security:check --fix  # audit自動修正
```

### 6. Scripts

- `scripts/lib/security.ts`: セキュリティユーティリティ
  - `SECRET_PATTERNS`: 15種類のシークレットパターン
  - `scanFileForSecrets()`: ファイルスキャン
  - `scanDirectoryForSecrets()`: ディレクトリスキャン
  - `parsePnpmAuditOutput()`: audit結果パース
  - `generateCycloneDxSbom()`: SBOM生成
  - `checkLicenseCompatibility()`: ライセンス互換性

- `scripts/check-security.ts`: 統合セキュリティチェック
  - Secret scanning + Audit + License + SBOM
  - JSON出力 + ログファイル (`logs/security.json`)
  - CI統合対応

### 7. Configuration

- `.gitleaks.toml`: Gitleaks設定
  - Allowlist: `pnpm-lock.yaml`, `*.md`, `*.test.ts`, example/test/placeholder
  - Custom rules: API key detection

- `.github/codeql/codeql-config.yml`: CodeQL設定
  - Queries: security-extended + security-and-quality
  - Ignore: node_modules, dist, coverage, tests, sbom

## セキュリティベストプラクティス

### 開発者向け

1. **シークレット管理**
   - `.env` はGitに含めない (`.gitignore`で除外済み)
   - `.env.example` を使用
   - GitHub Secretsを使用 (Actions用)

2. **依存関係**
   - `pnpm audit` を定期実行
   - Renovateで自動更新 (設定済み)
   - `pnpm outdated` で確認

3. **コード**
   - `eval()`, `Function()` 等の危険なAPIを避ける
   - ユーザー入力のバリデーション
   - CodeQLの警告を修正

4. **CI/CD**
   - `CODEOWNERS` で重要ファイルのレビュー必須化
   - Branch protection (main)
   - Required status checks (CI, Security, CodeQL)

### テンプレート利用者向け

1. **初期設定**
   ```bash
   # GitHubリポジトリ設定で有効化
   # Settings > Code security and analysis
   # - Dependency graph: Enable
   # - Dependabot alerts: Enable
   # - Dependabot security updates: Enable
   # - Secret scanning: Enable
   # - Secret scanning push protection: Enable
   # - Code scanning: Enable (CodeQL)
   ```

2. **定期実行**
   ```bash
   pnpm security:check --all
   pnpm audit
   ```

3. **SBOM**
   - リリース時にSBOMを添付
   - `sbom/` ディレクトリをArtifactとして保存

## 脅威モデル

| 脅威 | 対策 | 検出 |
|------|------|------|
| 脆弱な依存関係 | Renovate + pnpm audit + Dependency Review | CI, Security workflow |
| シークレット漏洩 | .gitignore + Gitleaks + Secret Scanning + Push Protection | CI, GitHub |
| ライセンス違反 | License Check + Dependency Review | CI |
| コードインジェクション | CodeQL + Biome lint | CI, CodeQL |
| サプライチェーン攻撃 | SBOM + Scorecard + Dependency Review | Security workflow |
| シークレットのハードコード | Custom secret scan + Gitleaks | CI, Security workflow |

## 参考

- [CodeQL Documentation](https://codeql.github.com/docs/)
- [Dependency Review Action](https://github.com/actions/dependency-review-action)
- [Gitleaks](https://github.com/gitleaks/gitleaks)
- [Anchore SBOM Action](https://github.com/anchore/sbom-action)
- [OpenSSF Scorecard](https://github.com/ossf/scorecard)
- [CycloneDX](https://cyclonedx.org/)
- [SPDX](https://spdx.dev/)
- [GitHub Security Best Practices](https://docs.github.com/en/code-security)

## 更新履歴

- 2026-09-29: 初版作成 (CodeQL, Dependency Review, Security, SBOM, Scorecard)
