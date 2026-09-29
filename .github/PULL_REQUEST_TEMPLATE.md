# 概要

<!-- このPRで何を変更したか、なぜ変更したかを簡潔に -->

## 変更内容

- [ ] 機能追加 / バグ修正 / リファクタ / ドキュメント / CI / その他

### 詳細

- ...

## 関連Issue

- Closes #<!-- issue番号 -->

## チェックリスト

### 品質ゲート

- [ ] `pnpm typecheck` が通る
- [ ] `pnpm lint` が通る（Biome）
- [ ] `pnpm check:determinism` が通る
- [ ] `pnpm cspell` が通る
- [ ] `pnpm knip` が通る
- [ ] `pnpm test:unit` が通る
- [ ] `pnpm test:coverage` が閾値(100%)を満たす
- [ ] `pnpm build` が通る
- [ ] `pnpm check`（品質ゲート10タスク）が通る

### 運用

- [ ] Conventional Commitsに従っている (`feat:`, `fix:`, `chore:`, etc)
- [ ] 必要に応じて `.changeset/*.md` を作成した
- [ ] ドキュメントを更新した（README, docs/, .agent/rules等）
- [ ] 破壊的変更がある場合は明記した

### セキュリティ

- [ ] 機密情報（トークン、パスワード等）を含んでいない
- [ ] 新しい依存関係は `pnpm audit` で確認した

## スクリーンショット / ログ

<!-- 必要に応じて -->

## 補足

<!-- レビュアーへの補足、注意点など -->
