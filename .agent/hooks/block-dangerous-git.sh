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
# 終了コード: 0 = 許可, 2 = ブロック（理由は stderr）

set -u

INPUT="$(cat 2>/dev/null || true)"
CMD="$(printf '%s' "$INPUT" \
  | sed -n 's/.*"command"[[:space:]]*:[[:space:]]*"\(.*\)".*/\1/p' \
  | head -n1)"

[ -z "$CMD" ] && exit 0

# git を含まないコマンドは対象外
case "$CMD" in
  *git*) ;;
  *) exit 0 ;;
esac

block() {
  echo "BLOCKED: '$CMD' は破壊的な git 操作のため実行できません（$1）。必要なら人間に確認してください。" >&2
  exit 2
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
