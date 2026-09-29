---
description: 変更内容をレビューし、バグ・セキュリティ・スタイルの問題を指摘する。Use when you want to review changes before merging.
---

# Review Command

変更内容をレビューする手順。`code-reviewer` エージェントを活用する。

## 手順

1. **変更範囲の確認**:
   ```bash
   git diff --stat HEAD~1 HEAD
   git diff HEAD~1 HEAD
   ```

2. **サブエージェントにレビューを依頼**:
   - `code-reviewer` エージェントに差分を渡し、レビューを依頼
   - Must / Should / Nit の3段階で指摘を分類してもらう

3. **レビュー観点**:
   - バグ: ロジックエラー、境界条件、null/undefined、非同期処理
   - セキュリティ: 機密情報のハードコード、XSS、権限チェック漏れ
   - スタイル: 命名規則、重複コード、AGENTS.md §6違反
   - テスト: 網羅性、エッジケース、モックの適切性

4. **レポート作成**:
   - 指摘事項を `docs/audit/review-{date}.md` に保存（必要に応じて）
   - 指摘がMustなら修正を促す

## 出力例

```markdown
## レビュー結果

### Must
- `src/auth/login.ts:45` — パスワードが平文でログ出力されている

### Should
- `src/auth/login.ts:30` — エラーハンドリングが不足

### 良い点
- バリデーションが丁寧に実装されている
```
