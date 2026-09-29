# リポジトリ活動調査レポート
作成日: 2026-09-26 (基準: 1ヶ月 = 2026-08-26 以降)
対象ユーザー: shiratama644
取得方法: `gh api /users/shiratama644/repos` + `gh search repos --owner shiratama644` + `gh repo view`

## サマリー
- 取得可能なリポジトリ総数: 18件 (public)
- 1ヶ月以内に push 活動あり: 11件
- 境界線 (30-40日前): 2件 (M2D, PalmIDE)
- 1ヶ月以上活動なし: 5件

## 全リポジトリ一覧 (pushedAt 降順)

| # | リポジトリ | 説明 | 主言語 | pushedAt | updatedAt | URL |
|---|---|---|---|---|---|---|
| 1 | cod-web | (CoD Mobile FPS research) | TypeScript | 2026-09-26T05:05:36Z | 2026-09-17T21:49:55Z | https://github.com/shiratama644/cod-web |
| 2 | arsenal-io | - | none | 2026-09-26T05:01:07Z | 2026-09-26T05:01:10Z | https://github.com/shiratama644/arsenal-io |
| 3 | urbex-hunter | - | none | 2026-09-23T22:25:01Z | 2026-09-22T12:01:41Z | https://github.com/shiratama644/urbex-hunter |
| 4 | ytdl | YouTube DL | JavaScript | 2026-09-23T01:14:09Z | 2026-09-21T10:36:20Z | https://github.com/shiratama644/ytdl |
| 5 | m3-expressive | - | none | 2026-09-12T09:18:56Z | 2026-09-12T03:12:20Z | https://github.com/shiratama644/m3-expressive |
| 6 | MyServer | - | none | 2026-09-09T08:03:32Z | 2025-11-06T07:12:46Z | https://github.com/shiratama644/MyServer |
| 7 | TEMPLATE_REPO | テンプレート | Shell | 2026-09-01T22:20:24Z | 2026-09-01T22:25:14Z | https://github.com/shiratama644/TEMPLATE_REPO |
| 8 | DropMod | - | TypeScript | 2026-09-01T21:40:36Z | 2026-09-01T08:01:07Z | https://github.com/shiratama644/DropMod |
| 9 | MTG | Minecraft Terrain Generator | none | 2026-09-01T17:52:49Z | 2026-09-01T06:38:01Z | https://github.com/shiratama644/MTG |
| 10 | flashcard | - | TypeScript | 2026-09-01T04:10:39Z | 2026-09-01T04:11:57Z | https://github.com/shiratama644/flashcard |
| 11 | rustcraft | Minecraft game clone written in Rust. | Rust | 2026-08-31T16:07:26Z | 2026-06-29T15:54:12Z | https://github.com/shiratama644/rustcraft |
| 12 | M2D | Minecraft Mod Downloader | TypeScript | 2026-08-20T11:43:18Z | 2026-08-20T11:45:48Z | https://github.com/shiratama644/M2D |
| 13 | PalmIDE | - | Shell | 2026-08-19T22:39:55Z | 2026-08-19T22:40:03Z | https://github.com/shiratama644/PalmIDE |
| 14 | pve-container-demo | ProxmoxVEコンテナの専用管理画面 | TypeScript | 2026-07-01T08:41:46Z | 2026-07-01T08:42:02Z | https://github.com/shiratama644/pve-container-demo |
| 15 | Nite-Practice | Note practice app | Kotlin | 2026-06-14T23:02:07Z | 2026-06-14T23:02:11Z | https://github.com/shiratama644/Nite-Practice |
| 16 | portfolio | - | CSS | 2026-05-29T13:17:31Z | 2026-05-29T13:17:35Z | https://github.com/shiratama644/portfolio |
| 17 | applejp-bot | - | TypeScript | 2026-05-18T21:59:30Z | 2026-05-18T21:59:34Z | https://github.com/shiratama644/applejp-bot |
| 18 | MRCA | Minecraft Redstone CPU Assembler | Vue | 2026-02-04T06:44:53Z | 2026-01-28T09:44:15Z | https://github.com/shiratama644/MRCA |

---

## 1ヶ月以内に活動があったリポジトリ詳細 (11件)

### 1. cod-web (最活発)
- **最終push**: 2026-09-26T05:05:36Z (本日)
- **ブランチ**: main + 8 arena branches (arena/01a0b161, 01a05c0d, 01a06b5e, 01a06d13, 01a06efa, 01a06f8b, 01a062ac, 01a0748a)
- **直近コミット (main)**:
  - 2026-09-17 Merge PR #8 from arena/01a0748a
  - 2026-09-16 feat(PH2-D): inject profile into web prediction
  - 2026-09-16 feat(PH2-C): inject sim profile into gameserver
  - 2026-09-16 feat(PH2-B): add fps sim profile
- **arena/01a0b161 最新**: 2026-09-26 research(R0): revise to hybrid reference baseline
- **内容推定**: CoD MobileのFPSモノレポ、Babylon.js, Socket.IO, Colyseus, 予測シム

### 2. arsenal-io (本日作成)
- **最終push**: 2026-09-26T05:01:07Z
- **コミット**: 
  - 2026-09-26 Add files via upload
  - 2026-09-26 Initial commit
- **状態**: できたて、詳細不明

### 3. ytdl
- **最終push**: 2026-09-23
- **ブランチ**: main + 4 arena
- **直近コミット**:
  - 2026-09-23 docs(DOC-4): メタデータ取得を youtubei.js へ改訂
  - 2026-09-23 docs(DOC-3): server-first restructure
  - 2026-09-21 Merge PR #3 from arena/01a094ec
  - 2026-09-16 docs: full documentation cleanup
  - 2026-09-15 V1 verification COMPLETE (v1f): stream URLs = signatureCipher
- **内容**: YouTubeダウンローダー、youtubei.js, yt-dlp将来担当

### 4. urbex-hunter
- **最終push**: 2026-09-23T22:25:01Z
- **コミット**: 2026-09-22 uploaded zip, Initial commit
- **arena/01a0c903 最新**: 2026-09-23 feat(m3-expressive): spring motion + Material Symbols / chore(husky, typescript)
- **内容**: 新規リポジトリ、zipアップロード起点

### 5. m3-expressive
- **最終push**: 2026-09-12
- **コミット**: 2026-09-12 Initial commit + arena/01a0939c ブランチで活発
  - 2026-09-12 test(coverage): M1+M3 175 tests, 90% coverage gate
  - 2026-09-12 feat(scripts): port executer/buildEnv from DropMod
- **内容**: Material 3 Expressive, spring motion, Material Symbols, webpack/turbopack切替

### 6. MyServer
- **最終push**: 2026-09-09 (arenaブランチ作成による)
- **master最終コミット**: 2025-11-06 Last Sync (Mobile)
- **arena/01a077b4**: 2026-09-09 docs: restructure and modernize server documentation
- **PR**: #1 docs: restructure and modernize server documentation (open, 2026-09-09)
- **注意**: masterは古いがarenaブランチでドキュメント再構築活動あり

### 7. MTG (Minecraft Terrain Generator)
- **最終push**: 2026-09-01
- **コミット**: Initial commit 2026-09-01
- **arena/01a05baf**:
  - 2026-09-01 feat(experiments): ブラウザ実行デモ（ノイズビューア）と TeaVM PoC スケルトン
  - 2026-09-01 fix(hooks): デコンパイルソース取得にリトライとタールボールフォールバック
- **内容**: 地形生成、ブラウザデモ、TeaVM

### 8. DropMod
- **最終push**: 2026-09-01
- **直近コミット**:
  - 2026-09-01 Update
  - 2026-09-01 Merge PR #7 from arena/01a0533e-dropmod
  - 2026-09-01 docs(ARCH-3): Go 承認に基づき完了記録
- **内容**: Minecraft Mod関連、TypeScript

### 9. flashcard
- **最終push**: 2026-09-01
- **直近コミット**:
  - 2026-09-01 Merge PR #32, #31 (Devin)
  - 2026-06-08 fix: Webhook の Supabase エラー修正 + Stripe Webhook で users.tier を更新
- **内容**: Stripe Checkout/Webhook, Supabase, 学習カード

### 10. TEMPLATE_REPO (本リポジトリ)
- **最終push**: 2026-09-01
- **直近コミット**:
  - 2026-09-01 Merge PR #1 from arena/01a05ef1
  - 2026-09-01 docs: フォルダ構造を復元
  - 2026-09-01 docs: ドキュメント規約追加
  - 2026-09-01 refactor: テンプレートリポジトリ化
- **内容**: AI Agent用テンプレート

### 11. rustcraft
- **最終push**: 2026-08-31 (arenaブランチ)
- **main最終コミット**: 2025-10-02 (AudranTourneur, MizKyosia)
- **arena/01a0587d**:
  - 2026-08-31 Arena Agent docs: Add issues.md cataloguing 55 known bugs
- **内容**: Rust製Minecraftクローン、Bevy? blocks.rs, 55件既知バグカタログあり

---

## 境界線 (1ヶ月ギリギリ外)

- **M2D**: 2026-08-20 push, TypeScript, Minecraft Mod Downloader, PR #93, #92, GitHub Actions更新
- **PalmIDE**: 2026-08-19 push, Shell, .agent/構成、最初のコミット

## 1ヶ月以上活動なし (5件)

- pve-container-demo (2026-07-01)
- Nite-Practice (2026-06-14)
- portfolio (2026-05-29)
- applejp-bot (2026-05-18)
- MRCA (2026-02-04)

---

## 所感・次のアクション候補

1. **最活発は cod-web**: 本日も arena/01a0b161 で research(R0) が動いている。FPSモノレポの基盤構築フェーズ。PH2-A〜Dのsim profile注入が完了。
2. **新規は arsenal-io, urbex-hunter**: どちらも2026-09-22〜26に作成されたばかり。arsenal-ioは中身未確認、urbex-hunterはzip起点でm3-expressive要素を含む。
3. **ytdl, m3-expressive, MyServer**: Arena Agentによるドキュメント再構築・カバレッジ強化が進む。ytdlはV1検証完了→サーバーファースト再構築へ。
4. **MyServer, rustcraft**: pushedAtは新しいがmainは古い。arenaブランチでのドキュメント/バグカタログ活動が実態。
5. **MTG, DropMod, flashcard, TEMPLATE_REPO**: 2026-09-01に一斉に活動。TEMPLATE_REPO化の流れと連動。

次に深掘りするなら、cod-web, ytdl, urbex-hunterあたりが直近で意思決定が必要なホットスポットと思われます。
