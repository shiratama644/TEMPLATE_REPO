#!/bin/sh
# block-secret-read.sh — PreToolUse(Bash) フック: 秘密情報ファイルへのアクセスと再帰削除をブロックする
#
# 役割: settings.json の deny（Read(.env) / Read(**/secrets/**) / rm -rf）は Bash 経由
#   （cat / head / grep / source / git show など）で迂回できる。このフックはコマンド文字列を
#   見て、同じ境界を Bash にも適用する。ファイルの内容は読まない（パスの参照だけを見る）。
#
# ブロック対象:
#   - `.env` / `.env.*` を参照するコマンド（`.env.example` と `.env.template` は除く。
#     書き込み (`> .env`) も同じパターンに含まれる。agent が .env を作る運用は想定しない）
#   - パス成分 `secrets`（`secrets/` 配下、`secrets.json` など）を参照するコマンド
#   - `rm` の再帰フラグ（-r / -R / --recursive。`-rf` `-f -r` などの併記を含む）。
#     `git rm -r --cached` は対象外。`rm file` や `rm -f file` は許可
#
# 出力と終了コード（Claude Code Hooks reference 準拠。block-dangerous-git.sh に同じ）:
#   - 許可: 無出力・exit 0
#   - ブロック: hookSpecificOutput.permissionDecision = "deny" の JSON を stdout へ・exit 0
#   - 手動実行: `sh .agent/hooks/block-secret-read.sh 'cat .env'`（引数をコマンド文字列とみなす。
#     判定は出力の "permissionDecision": "deny" で見る。exit code は常に 0）

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

# JSON 文字列のエスケープ（バックスラッシュ・二重引用符。改行とタブは除去）
json_escape() {
  printf '%s' "$1" | sed -e 's/\\/\\\\/g' -e 's/"/\\"/g' | tr -d '\n\r\t'
}

block() {
  REASON="$(json_escape "'$CMD' は実行できません（$1）。AGENTS.md §2 の境界表と settings.json の deny を参照。秘密情報は読み取らず、削除はファイル単位で行い、必要なら人間に確認してください。")"
  printf '{"hookSpecificOutput":{"hookEventName":"PreToolUse","permissionDecision":"deny","permissionDecisionReason":"%s"}}\n' "$REASON"
  exit 0
}

# 1) 秘密情報ファイルへの参照。許可された雛形 (.env.example / .env.template) を先に取り除いてから判定する。
case "$CMD" in
  *.env*|*secrets*)
    STRIPPED="$(printf '%s' "$CMD" | sed -e 's/\.env\.example//g' -e 's/\.env\.template//g')"
    # `.env` または `.env.<suffix>`。`.envrc` や `foo.environment` は対象外。
    if printf '%s' "$STRIPPED" | grep -Eq '(^|[^A-Za-z0-9_])\.env([.][A-Za-z0-9_-]+)?($|[^A-Za-z0-9_.-])'; then
      block ".env へのアクセス"
    fi
    # パス成分としての `secrets`（`secrets/`、`./secrets`、`config/secrets.json`）。`mysecrets` は対象外。
    if printf '%s' "$STRIPPED" | grep -Eq '(^|[^A-Za-z0-9_])secrets([^A-Za-z0-9_]|$)'; then
      block "secrets へのアクセス"
    fi
    ;;
esac

# 2) rm の再帰フラグ。単語へ分割して、`rm` の直後に続くフラグ群を調べる（引用符は考慮しない簡易版）。
set -f
set -- $CMD
set +f
state=0   # 1 = rm の引数を読んでいる
prev=""
for w in "$@"; do
  if [ "$state" = 1 ]; then
    case "$w" in
      --) state=0 ;;
      --*) case "$w" in *recursive*) block "rm の再帰削除" ;; esac ;;
      -*) case "$w" in *[rR]*) block "rm の再帰削除" ;; esac ;;
      *) state=0 ;;
    esac
  fi
  if [ "$w" = "rm" ] && [ "$prev" != "git" ]; then
    state=1
  fi
  prev="$w"
done

exit 0
