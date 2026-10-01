---
description: テストを実行し、カバレッジを確認する。Use when you want to run tests and check coverage.
---

# Test Command

テストを実行し、結果を確認する手順。

## 手順

1. **単体テスト**:
   ```bash
   pnpm test:unit
   ```
   - watchモードではなく `vitest run` 相当のスクリプトを使う

2. **カバレッジ**:
   ```bash
   pnpm test:coverage
   ```
   - 意味のあるカバレッジか確認（数字だけのshallow testを避ける）
   - 新規コードのカバレッジが80%以上あるか

3. **E2Eテスト** (必要な場合、CI上のみ):
   ```bash
   pnpm test:e2e
   ```
   - Sandboxで実行不可の場合はCI上のみ実行

4. **結果の確認**:
   - 失敗したテストがあれば原因を特定して修正
   - フレイキーテストがあれば原因を特定して修正
   - カバレッジが低い場合は `test-writer` エージェントにテスト追加を依頼

## 品質基準

- 既存テストを壊さない
- テストを通すためだけに `any` を使ったり、アサーションを緩めたりしない
- 境界値・エッジケース・異常系を必ずテスト
