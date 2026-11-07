---
description: 変更を検証し、Conventional Commits形式でコミットする。Use when you want to commit changes after verification.
---

# Commit Command

変更を検証し、コミットする手順。先に [`../hooks/verify-commit.md`](../hooks/verify-commit.md) と `AGENTS.md §1.3` の目的達成条件を確認し、未実施検証を成功扱いしない。

## 手順

1. **現状確認**:
   ```bash
   git status
   git diff --stat
   git log -5 --oneline
   ```

2. **検証** (AGENTS.md §6.1 の記録に合わせる):
   ```bash
   <型チェック>
   <Lint>
   <単体テスト>
   <ビルド>
   ```
   1つでも失敗したら原因を特定して修正し、再検証。

3. **差分確認**:
   ```bash
   git diff
   # 意図しない変更が含まれていないか確認
   ```

4. **コミット**:
   ```bash
   git add <対象ファイル>
   git commit -m "feat: <日本語で変更内容>"
   ```
   - Conventional Commits形式
   - 日本語で書く
   - 例: `feat(auth): ログイン機能を追加`

5. **プッシュ** (検証PASS後):
   ```bash
   git push origin <現在のブランチ>
   ```

## 禁止事項

- 検証がFAILした状態でコミットしない
- `git reset --hard` / `git push --force` は使わない
- 意図しないファイルをコミットに含めない
