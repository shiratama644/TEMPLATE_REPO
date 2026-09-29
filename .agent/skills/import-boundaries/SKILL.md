---
name: import-boundaries
description: レイヤー間のimport境界を守り、循環参照と責務混在を防ぐスキル。biome no-restricted-imports + アーキテクチャテスト + L1にtype分岐を書かない原則。
---

# Import Boundaries — レイヤー境界を守るスキル

> 出典: cod-web `arena/01a0b161-cod-web` 最新arenaブランチの `import-boundaries/SKILL.md` を汎用化
> 正本: `docs/arch/`（あれば）、`biome.json` の `no-restricted-imports`、`AGENTS.md §6`

## 原則

- レイヤー間のimportは一方向のみ。下位が上位をimportしない
- L1（engine-core / core）に `if (type === 'fps' | 'voxel')` のような上位type分岐を書かない
- UI層（hub/store/components）から直接 Engine / Babylon / Three をimportしない（facade経由）
- 循環参照を作らない。`a -> b -> a` は禁止

## レイヤー例（汎用テンプレート用）

```
L0: protocol / types / constants（依存なし、純粋）
  ↓
L1: engine-core / core（L0のみ依存、決定論・純粋ロジック）
  ↓
L2: profiles / features（L0+L1依存、モード別・機能別）
  ↓
L3: apps / server / client（L0+L1+L2依存、配線・副作用・I/O）
  ↓
L4: UI / hub / components（L3経由でL2を読む、直接L1の重い依存を読まない）
```

### 禁止例

```ts
// ❌ L1 (engine-core) で L2 (profile-fps) をimport
import { createFpsProfile } from '@cod/profile-fps';

// ❌ L1でtype分岐
if (type === 'fps') { /* fps固有処理 */ }
if (type === 'voxel') { /* voxel固有処理 */ }

// ❌ UI層でBabylonを直接import
import { Engine } from '@babylonjs/core';
```

### 許可例

```ts
// ✅ L2がL1をimport
import { Room } from '@cod/engine-core';

// ✅ L3がL1+L2をimport
import { Room } from '@cod/engine-core';
import { createFpsProfile } from '@cod/profile-fps';

// ✅ UIはfacade経由
import { createEngine } from '../game/engineDeps';
```

## biome.jsonでの強制（no-restricted-imports）

```json
{
  "linter": {
    "rules": {
      "nursery": {
        "noRestrictedImports": {
          "level": "error",
          "options": {
            "paths": {
              "@cod/profile-fps": "L1からL2をimportしない。L1は純粋であるべき",
              "@babylonjs/core": "UI層から直接importしない。engineDepsファサード経由",
              "three": "profile-fps以外から直接importしない"
            }
          }
        }
      }
    }
  }
}
```

- biomeの `no-restricted-imports` は `nursery` にある場合あり。`recommended` presetでは有効にならないことがあるため、明示的に有効化
- 公式: https://biomejs.dev/linter/rules/no-restricted-imports/

## アーキテクチャテスト（Vitestで境界をテスト）

```ts
// _tests_/import-boundaries.test.ts
import { readFileSync } from 'node:fs';
import { glob } from 'glob';

test('L1 does not import L2', async () => {
  const files = await glob('packages/engine-core/src/**/*.{ts,tsx}');
  for (const file of files) {
    const content = readFileSync(file, 'utf8');
    expect(content).not.toMatch(/from ['\"]@cod\/profile-/);
    expect(content).not.toMatch(/if\s*\(\s*type\s*===/);
  }
});

test('UI does not import Babylon directly', async () => {
  const files = await glob('apps/web/src/components/**/*.{ts,tsx}');
  for (const file of files) {
    const content = readFileSync(file, 'utf8');
    expect(content).not.toMatch(/from ['\"]@babylonjs\/core/);
  }
});
```

## よくある失敗と対処

- `three` / `three-mesh-bvh` は衝突判定用にL1で使うが、描画用ではない → 衝突用はL1で許可、描画用はfacade経由に分離
- `type` 分岐が必要 → L1では `type` を持たず、L2のfactoryで分岐。L1は `createWorld` のようなseamを受け取る
- 循環参照 → `a.ts` が `b.ts` をimportし、`b.ts` が `a.ts` をimport → 共通部分を `c.ts` (L0)に抽出

## 監査コマンド

```bash
# L1がL2をimportしていないか
grep -R "from ['\"]@.*profile-" packages/engine-core/src --include="*.ts" | grep -v test | grep -v ".d.ts"

# type分岐がL1にないか
grep -R "if.*type.*===" packages/engine-core/src --include="*.ts"

# UI層が重い依存を直接importしていないか
grep -R "from ['\"]@babylonjs" apps/web/src/components --include="*.ts"
grep -R "from ['\"]three" apps/web/src --include="*.ts" | grep -v profile-fps | grep -v world.ts

# biomeでチェック
pnpm lint
```

## 関連

- `biome.json` no-restricted-imports設定
- `docs/arch/` アーキテクチャ文書（あれば）
- `AGENTS.md §6` プロジェクト固有ルール
- `.agent/skills/determinism/SKILL.md` 決定論スキル（L1の純粋性と関連）
- cod-web `arena/01a0b161-cod-web` の `import-boundaries/SKILL.md`（元出典）
