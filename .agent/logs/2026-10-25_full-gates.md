# ネイティブ全件検証と OSV 全走査

> Date: 2026-10-25 / Task: FULLGATE-1

## 基準と障害

- ローカル `bun run check` は 7 ゲート exit 0 だが 54 pass / 2 skip（Go/Rust 不在）/ 765 assertions。`CI_REQUIRE_NATIVE=1` の負の検証は両ツール欠損で 2 fail / skip 0、exit 1。skip を PASS と誤表示しない。
- Go (`golang-go`) と Rust (`rustc`, `cargo`) の OS パッケージについてそれぞれ今回の利用者承認を得た。Debian 配布元3件へ接続できず apt update は警告つき exit 0、各 install はリスト不在で exit 100。どちらも導入していない。

## CI と脆弱性スキャン

- CI の Go/Cargo 必須チェックと `CI_REQUIRE_NATIVE=1` を導入。Python も利用可能確認を追加。PR CI でネイティブテストの欠損を成功に偽装しない。
- OSV-Scanner v2.7.0 の PR `bun.lock` full scan を追加。最初の `7c50154` は公式 reusable workflow が upload-sarif=false でも security-events: write を要求して startup_failure。権限拡大を避けて読取専用の公式 scanner action を直に利用。
- `4737e30` の PR #5 CI run `44969429250` は OSV full scan・Go/Cargo 必須・Bun 全ゲート・Knip・actionlint/zizmor・gitleaks・dependency-review PASS。週次/手動 OSV は既定ブランチに未登録で未検証。

## 残事項

ローカル Go/Rust の実ビルドはこの環境では不可。CI の正常をローカル実測と混同しない。OSV の週次/手動 workflow は別途 PR のマージ許可と既定ブランチへの反映後に検証する。

## 後続判断・CI（追記）

- `99e8cac` の PR #5 run `44969604062` で OSV full scan と Go/Rust/Python 必須チェックを含む全5チェックが PASS。条件付き PTTY テストにも未確認の skip を残さないよう `script --version`・`stty --version` を CI 必須チェックに追加。
- ユーザーは PR #5 を今回はマージしないと回答。週次/手動 OSV workflow は既定ブランチ未登録のため未検証。ローカル Go/Rust は別環境で検証する方針を選択（第三者 npm 配布物は使わない）。現サンドボックスの 54 pass / 2 skip は 56 pass と表記しない。
