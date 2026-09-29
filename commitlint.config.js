/**
 * commitlint config
 * Conventional Commitsを強制
 * https://commitlint.js.org/
 *
 * 許可するtype:
 * - feat: 新機能
 * - fix: バグ修正
 * - docs: ドキュメント
 * - style: フォーマット（コードの動作に影響しない）
 * - refactor: リファクタリング
 * - perf: パフォーマンス改善
 * - test: テスト追加・修正
 * - build: ビルドシステム・依存関係
 * - ci: CI設定
 * - chore: その他（雑務）
 * - revert: リバート
 */

export default {
  extends: ["@commitlint/config-conventional"],
  rules: {
    // 日本語も許可するため、subject-caseは無効化（英語小文字強制を無効）
    "subject-case": [0, "never"],
    // 本文の最大長
    "body-max-line-length": [1, "always", 200],
    // フッターの最大長
    "footer-max-line-length": [1, "always", 200],
    // typeの列挙を明示（config-conventionalのデフォルトを上書き、日本語説明付きでもOK）
    "type-enum": [
      2,
      "always",
      [
        "feat",
        "fix",
        "docs",
        "style",
        "refactor",
        "perf",
        "test",
        "build",
        "ci",
        "chore",
        "revert",
      ],
    ],
  },
}
