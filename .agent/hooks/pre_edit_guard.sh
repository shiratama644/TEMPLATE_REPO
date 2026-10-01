#!/bin/sh
# pre_edit_guard.sh — 編集禁止領域への変更をブロックする PreToolUse フック
# TEMPLATE_REPO用に一般化。PalmIDEの設計をベースに、テンプレートとして再利用可能な形に調整。
#
# ブロック対象:
#   .git/ 以下、node_modules/ 以下、dist/ 以下、.next/ 以下、coverage/ 以下
#   .agent/logs/ の既存ファイルの直接編集（追加は log-task.md 経由）
#
# 終了コード:
#   0 = 許可, 2 = ブロック

set -u

TARGET=""

# 1) 引数運び（手動実行用）
if [ $# -ge 1 ]; then
  TARGET="$1"
else
  # 2) Claude Code hooks（stdin JSON）から tool_input.file_path を抜く
  INPUT=$(cat 2>/dev/null || true)
  TARGET=$(printf '%s' "$INPUT" \
    | sed -n 's/.*"file_path"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' \
    | head -n1)
fi

# 空なら許可（ファイルパスが取れないツール呼び出し）
case "$TARGET" in
  "") exit 0 ;;
esac

# 正規化: ./ プレフィックス除去
case "$TARGET" in
  ./*) TARGET="${TARGET#./}" ;;
esac

# 絶対パスが来た場合はリポジトリ相対にしようと試みる（簡易）
# /home/.../TEMPLATE_REPO/... -> 相対化
case "$TARGET" in
  */.agent/logs/*)
    # logsは新規作成は許可、既存の上書きはブロックしたいが、ここでは簡易的に許可
    # 実際のブロックは post_edit で「追加のみ」を検証
    ;;
esac

is_protected() {
  case "$1" in
    .git/*|.git) return 0 ;;
    node_modules/*|node_modules) return 0 ;;
    dist/*|dist) return 0 ;;
    .next/*|.next) return 0 ;;
    coverage/*|coverage) return 0 ;;
    .turbo/*|.turbo) return 0 ;;
    *.tgz|*.zip) 
      # 一時ファイルの直接編集はブロック
      case "$1" in
        uploads/*) return 1 ;;
        *) return 0 ;;
      esac
      ;;
    *) return 1 ;;
  esac
}

if is_protected "$TARGET"; then
  {
    echo "⛔ [pre_edit_guard] 編集禁止領域です: $TARGET"
    echo "   .git/, node_modules/, dist/, .next/, coverage/ への直接編集は禁止されています。"
    echo "   必要な場合はタスク完了後にビルド成果物として生成してください。"
  } >&2
  exit 2
fi

exit 0
