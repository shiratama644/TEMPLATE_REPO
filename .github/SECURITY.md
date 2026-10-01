# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| main    | :white_check_mark: |
| < 0.1   | :x:                |

このテンプレートリポジトリは常に `main` ブランチが最新です。セキュリティ修正は `main` に直接適用されます。

## Reporting a Vulnerability

セキュリティ脆弱性を見つけた場合は、**公開のIssueではなく**以下の方法で非公開に報告してください。

### 報告方法

1. **GitHub Security Advisories**（推奨）:
   - https://github.com/shiratama644/TEMPLATE_REPO/security/advisories/new
   - 「Report a vulnerability」から非公開で報告できます

2. **Email**（代替）:
   - リポジトリオーナーのプロフィールに記載の連絡先、または
   - GitHubのSecurityタブから連絡

### 報告に含めてほしい情報

- 脆弱性の種類（例: XSS, 脆弱な依存関係, シークレット漏洩等）
- 影響範囲と再現手順
- 可能であればPoCや修正案
- あなたの連絡先（対応状況をお知らせするため）

### 対応プロセス

1. **受領確認**: 48時間以内に受領確認を返信
2. **検証**: 3営業日以内に検証と影響評価
3. **修正**: 影響度に応じて7-30日以内に修正版をリリース
4. **公開**: 修正後、GitHub Security Advisoryとして公開（報告者クレジット含む、希望者のみ）

### スコープ

- ✅ このテンプレートリポジトリ自体のコード
- ✅ CI/CDワークフロー
- ✅ Dockerfile / devcontainer
- ✅ 依存関係の脆弱性（`pnpm audit` で検出されるもの）
- ❌ このテンプレートを使って作成された派生プロジェクト（各プロジェクトのオーナーが対応）

### 謝辞

セキュリティ向上にご協力いただいた方には、希望に応じて `SECURITY.md` やリリースノートで謝辞を掲載します。ありがとうございます！

## セキュリティベストプラクティス（利用者向け）

このテンプレートを使う際は以下を推奨：

- `pnpm audit` を定期的に実行
- Renovate / Dependabot で依存関係を最新化
- `.env` やシークレットをGitに含めない（`.gitignore` で除外済み）
- GitHubのSecret scanningとDependabot alertsを有効化
- `CODEOWNERS` で重要ファイルのレビューを必須化
