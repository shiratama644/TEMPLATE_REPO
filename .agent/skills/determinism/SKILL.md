---
name: determinism
description: 純粋関数・決定論ロジックの決定論を守るスキル。Math.random/Date.now禁止、same-inputテスト、smoke vs heavy分離、LCG、監査コマンド。
---

# Determinism — 決定論を守る実装スキル

> 出典: cod-web `arena/01a0b161-cod-web` 最新arenaブランチの `deterministic-sim/SKILL.md` を汎用化
> 正本: `docs/arch/`（あれば、決定論・禁止API）、`AGENTS.md §6`

## なぜ決定論が重要か

- サーバーとクライアントで同じ入力から同じ結果を再現する必要がある場合、非決定論的APIが混入すると同期が崩れる
- リプレイ、テスト、デバッグ、チート検出、予測補間等で決定論が前提になる
- ゲーム以外でも、純粋関数・reducer・state machineでは決定論が重要（例: Redux reducerに `Date.now()` を書かない）

## 禁止事項（純粋関数・SimProfile.step・reducer内）

- `Math.random()` / `Date.now()` / `performance.now()` / `setTimeout` / `setInterval` / I/O / `fetch` / `console.log` を書かない
- 環境依存のAPI（`fs`, `Bun.file`, `Bun.write`, `process.env` の直接参照等）を書かない
- 上位レイヤーのtype分岐（`if (type === 'fps')`）を下位の純粋層に書かない

## 実装パターン

### 1. LCGで決定論的乱数が必要な場合

```ts
function createLCG(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
}

// 使用例: RoomCtx.random / randomInt は welcomeで配布されたseedから作る
const rng = createLCG(seed);
const randomValue = rng(); // 0..1
```

- 直接 `Math.random()` を呼ばない。seedから作ったrngを使う
- seedはサーバーから配布、または `createLCG(12345)` のように固定

### 2. 軽量smoke vs heavy分離（cod-web PH2-Eで確立を汎用化）

| 層 | 配置 | 内容 | 時間 |
|---|---|---|---|
| smoke | `tests/.../determinism.test.ts` unit | 100ticks x10 scenarios、purity、factory isolation | 20-50ms |
| heavy | `scripts/determinism-heavy.ts` | 1000ticks x100 scenarios、tolerance 1e-10、LCG | 0.8-0.9s |

- smokeは常時 `test:unit` で実行、heavyは `pnpm check:determinism:heavy` でCI/手動実行
- 軽いworld（例: 平面のみ）を使えば heavyでも軽い。重い依存（BVH等）を含むworldだと重くなるため、seamで差し替え

```ts
// 軽量worldのseam例
function createProfile({ createWorld }: { createWorld: () => World }) {
  // createWorldを外から注入、テストでは軽いplane worldを注入
}
```

### 3. Same-inputテスト（server vs client、汎用）

```ts
// @vitest-environment node
const room = new Room({ profile: createProfile({ createWorld: createPlaneWorld }) });
const peer = { id: 'test', send: vi.fn() } as unknown as Peer;
room.join(peer);
const player = room.getPlayer(peer.id);

// 同じ入力列を2回実行して同じ結果になるか
const inputs = generateInputs(seed, 100);
const stateA = runWithInputs(profile, world, inputs);
const stateB = runWithInputs(profile, world, inputs);
expect(stateA.x).toBeCloseTo(stateB.x, 10);
```

- `Room` は `addPlayer` ではなく `join(Peer)` APIの場合、mock Peerを作成
- `Simulation.receiveInput` は seq巻き戻りガードあり、FIFOキューで入力消費
- 検証: 120ticks exact `toBeCloseTo(2)` + per-tick error <許容値

### 4. 監査コマンド（禁止API検出）

```bash
# SimProfile / pure層での禁止API検出
grep -R "Math\.random\|Date\.now\|performance\.now\|setTimeout\|setInterval\|fetch(" packages/*/src --include="*.ts" | grep -v test | grep -v ".d.ts"

# L1でのtype分岐検出
grep -R "if.*type.*===" packages/engine-core/src --include="*.ts"

# 自動スクリプト
pnpm check:determinism
```

## check-determinism.ts スクリプト（本テンプレート用）

```ts
// scripts/check-determinism.ts 概要
const forbidden = [
  /Math\.random\s*\(/,
  /Date\.now\s*\(/,
  /performance\.now\s*\(/,
  /setTimeout\s*\(/,
  /setInterval\s*\(/,
  /fetch\s*\(/,
];

for (const file of glob('src/**/*.{ts,tsx}')) {
  const lines = readFile(file).split('\n');
  lines.forEach((line, idx) => {
    for (const re of forbidden) {
      if (re.test(line) && !line.trim().startsWith('//')) {
        violations.push({ file, line: idx+1, pattern: re.source });
      }
    }
  });
}
```

- biomeでは検出できないパターンを補完
- CIの `static-checks` で実行、失敗時は exit 1

## よくある失敗

- `Math.random()` を純粋層で使う → LCGに置換
- `Date.now()` でタイムスタンプを取る → 外から注入、または純粋層では使わない
- `setTimeout` で遅延処理 → 純粋層ではtickベースで管理、外側でsetTimeout
- `console.log` を純粋層で使う → 副作用なので外側でログ、純粋層は値を返すだけ

## 関連

- `scripts/check-determinism.ts` 禁止API検出スクリプト
- `scripts/determinism-heavy.ts` heavy determinismテスト（あれば）
- `.agent/skills/import-boundaries/SKILL.md` レイヤー境界スキル
- `.agent/skills/ci-quality-gates/SKILL.md` CIスキル
- `docs/arch/` 決定論・禁止API文書（あれば）
- cod-web `arena/01a0b161-cod-web` の `deterministic-sim/SKILL.md`（元出典）
