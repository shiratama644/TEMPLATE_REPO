#!/bin/sh
# post_edit_verify.sh — 編集後の整合性を事後検証する PostToolUse フック
#
# 検証内容:
#   (A) 機密ファイル (.env) が追跡・ステージングされていないか
#   (B) docs/ 配下のファイル追加/削除時に docs/README.md が更新されているか（警告のみ）
#
# 終了コード: 0 = OK, 1 = NG（警告を含む場合も含む）

set -u
cd "$(dirname "$0")/../.." || exit 1

FAIL=0

echo "=== post_edit_verify ==="

# (A) 機密ファイルの混入チェック
SECRET_HITS=$(git diff --cached --name-only 2>/dev/null; git diff --name-only 2>/dev/null; git ls-files --others --exclude-standard 2>/dev/null | head -n 50)
if echo "$SECRET_HITS" | grep -q "^\.env$"; then
  echo "❌ (A) .env ファイルが追跡対象に含まれています。.gitignore を確認してください。" >&2
  FAIL=1
elif git diff --cached --name-only 2>/dev/null | grep -q "^\.env\."; then
  echo "❌ (A) .env.* ファイルがステージングされています。" >&2
  FAIL=1
else
  echo "✅ (A) 機密ファイル: OK"
fi

# (B) docs/ の追加/削除時に docs/README.md の目次更新を促す（警告レベル）
ADDED_OR_DELETED=$(git status --porcelain 2>/dev/null | grep -E "^(\?\?|A |D |R )" | grep "docs/" || true)
if [ -n "$ADDED_OR_DELETED" ]; then
  if git diff --name-only 2>/dev/null | grep -q "docs/README.md"; then
    echo "✅ (B) docs/README.md 更新: OK"
  else
    echo "⚠️ (B) docs/ に追加/削除がありますが docs/README.md が未更新です。目次の更新を検討してください。" >&2
  fi
else
  echo "✅ (B) docs/ 変更: 追加/削除なし"
fi

if [ "$FAIL" -eq 0 ]; then
  echo "=== 検証完了 ==="
  exit 0
fi

echo "=== 検証失敗（上の ❌ を確認）===" >&2
exit 1
