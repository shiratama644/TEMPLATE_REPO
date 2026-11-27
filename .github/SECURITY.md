# Security Policy / セキュリティポリシー

> このファイルはテンプレートです。派生プロジェクトでは支援対象・報告先を自分の運用に書き換えてください。

## 支援対象のバージョン

| 対象 | 支援 |
| :--- | :--- |
| `main` ブランチの最新 | 脆弱性の修正を受け付けます |
| 過去のタグ / リリース | 個別には修正しません。`main` に修正したあと、利用者が更新してください |

## 脆弱性を報告する

GitHub の **Security** タブ → **Report a vulnerability**（Private vulnerability reporting）で報告してください。公開 Issue や PR には脆弱性の詳細を書かないでください。この窓口が使えない場合は、Issue に「security について相談したい」とだけ書いてください。詳細は非公開でやり取りします。

- **対象**: `.github/workflows/` のワークフロー、`.agent/hooks/` の Agent フック、`scripts/` の検査プログラム、`bun.lock` の依存
- **対象外**: 利用者が派生プロジェクトに追加したコードや設定。依存の既知の脆弱性は OSV-Scanner（Code scanning）と Dependabot alerts が通知します
- **対応**: 受領から 7 日以内に確認し、修正の見込みを返します（SLA ではありません）。修正は `main` への PR とタグで公開します

## 秘密情報の扱い

`.env` / `secrets/**` は読み取らず commit しません（`AGENTS.md §2` と `.agent/settings.json` の deny）。誤って秘密情報を commit した場合は、履歴の整理より先に **その秘密情報を無効化（ローテーション）** してください。履歴の書き換えを force push で行わない運用は `AGENTS.md §4.3` に従います。
