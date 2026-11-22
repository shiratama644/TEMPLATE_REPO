# FULLGATE-1: スキップのないネイティブ検証と OSV 実走査

> 対応 task-list ID: `FULLGATE-1`。TOOLING-2 / BUNSETUP-4 の未検証項目を可視化する後続作業。

## 目的と範囲

7 ゲートの exit 0 とテストの全件実行を混同しない。Go / Rust の実ビルドを CI で必須にし、`bun.lock` 全体の OSV スキャンを PR 上で実行・判定する。ローカルのツール不在、OSV の通信不能・既知脆弱性、定期ワークフロー未登録を成功扱いしない。

対象: `.github/workflows/ci.yml`、テストの CI 用必須モード、検証記録。既存の7ゲート・OSV 定期/手動・依存差分レビューは削除しない。PR のマージや default branch への直接 push は行わない。

## 安全境界

- OS パッケージの導入は Go (`golang-go`) と Rust (`rustc`, `cargo`) について利用者の今回の個別承認を得た範囲に限定する。取得できないときに `skip` / `continue-on-error` で隠さない。
- OSV は既知脆弱性の結果と通信失敗を区別する。検出結果を根拠なく ignore に追加しない。GitHub の workflow_dispatch を既定ブランチ未登録の状態で成功とみなさない。

## 実行と停止条件

1. 基準を計測: 7ゲート exit 0・54 pass / 2 skip。Go/Cargo 不在によるスキップを確認。
2. CI で Go/Cargo の存在を要求し、`CI_REQUIRE_NATIVE=1` の場合は `skipIf` を無効化する。ローカルでツール不在なら exit 1 の負例を確認する。
3. 既存の週次 OSV workflow と同じ再利用ワークフローを PR CI に追加し `bun.lock` を full scan。取得失敗・脆弱性検出で CI を失敗させる。
4. 全ゲート→差分レビュー→Conventional Commit→固定ブランチへ push→CI の結果を確認する。2回連続の外部制約で改善しないなら保留・未検証を明記する。

## 完了条件

- [ ] CI の Go/Rust テストで skip 0 をログから確認し、関連ジョブと PR 全チェックが PASS。
- [ ] OSV が PR 上で `bun.lock` を実走査して PASS。既知脆弱性があれば修正・再検証する。
- [ ] ローカルでもツールチェーンが導入できるなら skip 0。導入不能の場合は理由・承認・実施コマンドを記録し、完了と誤表示しない。
- [ ] 週次・手動 OSV workflow の実行は既定ブランチ反映後に確認。マージは別途明示的な依頼が必要。

## 実測

- ローカル基準: Bun 7ゲート exit 0、54 pass / 2 skip / 765 assertions、Knip exit 0。CI 強制モードの負例は Go/Cargo 不在で 2 fail、skip 0（exit 1）。
- 個別承認に基づく Debian `apt-get update` はネットワーク制限で3つの Debian 配布元すべてに接続失敗（apt 自体は警告のみで exit 0）。`golang-go` と `rustc cargo` の install は package index 不在でいずれも exit 100。**OS パッケージは導入されていない**。
- PR CI の OSV・ネイティブ実行と既定ブランチでの定期/手動スキャンは未検証。結果を得た時点で追記する。

- 初回 push `7c50154` の CI は起動前に失敗。公式の reusable workflow は `upload-sarif: false` でもネストされた job が `security-events: write` を要求し、呼び元の `contents: read` / `actions: read` では GitHub が拒否。権限を拡大せず、同じ v2.7.0 の scanner action を読取専用 job で直接実行する方式へ変更。次の CI で実動を確認する（無条件の成功扱いはしない）。
