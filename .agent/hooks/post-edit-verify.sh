#!/bin/sh
# post-edit-verify.sh — 編集後の整合性を事後検証する PostToolUse フック
#
# 検証内容:
#   (A) 機密ファイル (.env) が追跡・ステージングされていないか → ブロック（モデルに理由を返す）
#   (B) docs/ 配下のファイル追加/削除時に docs/README.md が更新されているか → 警告のみ
#
# 出力と終了コード（Claude Code Hooks reference 準拠）:
#   - OK: 検査結果を stdout へ・exit 0
#   - (A) 失敗: top-level "decision": "block" + "reason" の JSON を stdout へ・exit 0
#     PostToolUse ではこれがモデルに返り、モデル自身が修正できる。
#     以前の exit 1 は「非ブロッキングエラー」で stderr がユーザーにしか表示されず、
#     指摘がモデルに届かなかった（本フックの実質的な不具合だった）。
#   - exit 2 と JSON は混ぜない（exit 2 のとき JSON は無視される）
#   - (B) は「検討してください」 수준의促しなのでブロックしない（stderr へ警告）

set -u
cd "$(dirname "$0")/../.." || exit 1

FAIL=0
REASONS=""

# JSON 文字列のエスケープ（バックスラッシュ・二重引用符。改行とタブは除去）
json_escape() {
  printf '%s' "$1" | sed -e 's/\\/\\\\/g' -e 's/"/\\"/g' | tr -d '\n\r\t'
}

echo "=== post-edit-verify ==="

# (A) 機密ファイルの混入チェック
SECRET_HITS=$(git diff --cached --name-only 2>/dev/null; git diff --name-only 2>/dev/null; git ls-files --others --exclude-standard 2>/dev/null | head -n 50)
if echo "$SECRET_HITS" | grep -q "^\.env$"; then
  echo "❌ (A) .env ファイルが追跡対象に含まれています。" >&2
  REASONS=".env が変更対象に含まれています。秘密情報を commit しないよう、.gitignore に .env を追加し、既に追跡済みなら git rm --cached .env で追跡から外してください（AGENTS.md §2 の境界表）。"
  FAIL=1
elif git diff --cached --name-only 2>/dev/null | grep -q "^\.env\."; then
  echo "❌ (A) .env.* ファイルがステージングされています。" >&2
  REASONS=".env.* がステージングされています。秘密情報を commit しないよう、git restore --staged で外し、.gitignore に該当パターンを追加してください（AGENTS.md §2 の境界表）。"
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

# 失敗: モデルに理由を返す（PostToolUse の block 形式）
ESC="$(json_escape "$REASONS")"
printf '{"decision":"block","reason":"%s"}\n' "$ESC"
exit 0
