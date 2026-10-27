#!/bin/sh
# block-dangerous-git.sh — PreToolUse(Bash) フック: 破壊的な git 操作をブロックする
#
# 出典: mattpocock/skills の git-guardrails-claude-code（MIT, Copyright 2026 Matt Pocock）を、
#       jq 非依存の sh 版に書き直したもの。
#
# ブロック対象（AGENTS.md §4.3 と整合）:
#   - git push --force / -f / --force-with-lease（履歴の書き換え）
#   - git push の main / master への直接 push
#   - git reset --hard / git clean -f* / git branch -D / git checkout . / git restore .
#   - git rebase / git commit --amend（deny 設定と合わせる）
# 通常の `git push origin <作業ブランチ>` は許可する。
#
# 例外（AGENTS.md §4.1.1 の sandbox 復旧手順）:
#   - `git reset --hard FETCH_HEAD` のみ許可。他の `reset --hard` はブロックする。
#   - settings.json の deny は `Bash(git reset --hard)`（完全一致）なので、
#     FETCH_HEAD 形は allow の `Bash(git reset --hard FETCH_HEAD)` で通す。
#
# 出力と終了コード（Claude Code Hooks reference 準拠）:
#   - 許可: 無出力・exit 0
#   - ブロック: hookSpecificOutput.permissionDecision = "deny" の JSON を stdout へ・exit 0
#     （PreToolUse の top-level "decision"/"reason" は非推奨。exit 2 と JSON は混ぜない）
#   - 手動実行で判定を確認する場合は、出力に "permissionDecision": "deny" があるかで見る
#     （exit code は常に 0 なので、exit code では判定できない）

set -u

INPUT="$(cat 2>/dev/null || true)"
CMD="$(printf '%s' "$INPUT" \
  | sed -n 's/.*"command"[[:space:]]*:[[:space:]]*"\(.*\)".*/\1/p' \
  | head -n1)"

# 引数運び（手動実行用）: 引数があればそれをコマンド文字列とみなす
if [ $# -ge 1 ] && [ -z "$CMD" ]; then
  CMD="$*"
fi

[ -z "$CMD" ] && exit 0

# git を含まないコマンドは対象外
case "$CMD" in
  *git*) ;;
  *) exit 0 ;;
esac

# JSON 文字列のエスケープ（バックスラッシュ・二重引用符。改行とタブは除去）
json_escape() {
  printf '%s' "$1" | sed -e 's/\\/\\\\/g' -e 's/"/\\"/g' | tr -d '\n\r\t'
}

block() {
  REASON="$(json_escape "'$CMD' は破壊的な git 操作のため実行できません（$1）。AGENTS.md §4.3 を参照。必要なら人間に確認してください。")"
  printf '{"hookSpecificOutput":{"hookEventName":"PreToolUse","permissionDecision":"deny","permissionDecisionReason":"%s"}}\n' "$REASON"
  exit 0
}

case "$CMD" in
  *"git push"*" --force"*|*"git push"*" -f "*|*"git push"*" -f")
    block "force push" ;;
  *"git push"*" main"*|*"git push"*" master"*|*"git push"*":main"*|*"git push"*":master"*)
    block "main/master への push" ;;
  *"git clean -f"*)     block "clean -f" ;;
  *"git branch -D"*)    block "branch -D" ;;
  *"git checkout ."*)   block "checkout ." ;;
  *"git restore ."*)    block "restore ." ;;
  *"git rebase"*)       block "rebase" ;;
  *"git commit --amend"*) block "commit --amend" ;;
esac

# reset --hard は AGENTS.md §4.1.1 が許可する `git reset --hard FETCH_HEAD` の 1 形だけ通す。
# push 系を先に判定しているので、`git reset --hard FETCH_HEAD && git push --force` のような
# 連結コマンドは上の force push で止まる。
case "$CMD" in
  *"git reset --hard"*)
    case "$CMD" in
      *"git reset --hard FETCH_HEAD"*) : ;;
      *) block "reset --hard（FETCH_HEAD 以外は禁止）" ;;
    esac ;;
esac

exit 0
