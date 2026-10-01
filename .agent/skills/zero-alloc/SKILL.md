---
name: zero-alloc
description: ホットパスでのゼロアロケーションを守る実装スキル。getPlayersIterable、encode once、head indexリング、Map再利用パターン。
---

# Zero-Alloc — ホットパスでGCを出さないスキル

> 出典: cod-web `arena/01a0b161-cod-web` 最新arenaブランチの `zero-alloc/SKILL.md` を汎用化
> 正本: `docs/arch/engineering.md`（ゼロアロケ、あれば）、`docs/arch/server.md`

## 原則

- `doTick` / `frame` / `render` / `step` のようなホットパス（60-120Hz）内で `new`、`[]`/`{}` リテラル、`.slice/.map/.filter`、クロージャ生成、ベクトルの都度オブジェクト返却をしない
- 送信は `subarray()`（コピーしない）、毎送信 `buffer.slice()` はGCを生むので置換対象
- GCはフレームドロップの原因。ゼロアロケーションで安定したフレームレートを維持

## 違反パターンと修正（cod-web EM01実績を汎用化）

| # | 場所 | 違反 | 修正 | 効果 |
|---|---|---|---|---|
| B4 | `Room.getPlayers()` | 毎tick `[...players.values()]` 配列確保 | `getPlayersIterable()` 追加、Iterableを返す | `for...of` で回す、GC削減 |
| B5 | `Broadcaster.maybeSend` | `for(peer)` 内で毎回 `encode` | ループ外1回 encode + per-peer patch | n回 → 1回 |
| B6 | `Simulation.queues` | `shift()` O(n), `splice(0,excess)` O(n) | `Queue {buf,head}` リング、head index | 60Hz xN人でO(n)解消 |
| B9 | `interpolation.ts` | `samples.shift()` O(n) | `head` index | 補間履歴数十件だがゼロアロケ観点で改善 |
| B10 | `lagcomp-store.ts` | `shift()` で古いサンプル削除 | `HistoryBuffer` リング | 最大30件だが違反解消 |
| B11 | `GameClient.remotes` | 毎フレーム `new Map` | `remotes` Map再利用、`clear()` + `set()`、out Map再利用 | 60-120HzでMap newは予算超過 |
| B12 | `packer.ts` | `players.map` 毎スナップショット配列確保 | `for` ループで直接書く、map廃止 | Snapshot 30HzでのGC削減 |
| B13 | `prediction.ts` | `filter` 毎回新配列確保 | in-place削除、head index | 60HzでGC削減 |

## 実装パターン

### getPlayersIterable（配列を作らない）

```ts
// Room.ts
getPlayersIterable(): Iterable<Player> {
  return this.players.values(); // 配列を作らない
}
getPeersIterable(): Iterable<Peer> {
  return this.peers.values();
}

// 使用側
for (const player of room.getPlayersIterable()) {
  // hot path、配列確保なし
}
```

### Snapshot encode once（ループ外で1回）

```ts
// snapshot.ts
const payloadBytes = this.writeSnapshot(world, viewer, writer); // ループ外1回
for (const peer of room.getPeersIterable()) {
  // per-peer patch: lastAckSeqのみ書き換え
  writer.view.setUint32(offset, peer.lastAckSeq, true);
  peer.sendBinary(writer.subarray()); // コピーなし
}
```

### InputQueue head indexリング（shift()のO(n)を解消）

```ts
class InputQueue {
  buf: DecodedInput[] = new Array(32);
  head = 0;
  tail = 0;
  len = 0;
  push(input: DecodedInput) {
    if (this.len >= 32) { this.head = (this.head+1)%32; this.len--; } // overflowは破棄
    this.buf[this.tail] = input;
    this.tail = (this.tail+1)%32;
    this.len++;
  }
  shift(): DecodedInput | undefined {
    if (this.len===0) return undefined;
    const v = this.buf[this.head];
    this.head = (this.head+1)%32;
    this.len--;
    return v;
  }
}
```

### GameClient remotes再利用（毎フレームnew Mapしない）

```ts
// interpolation.ts が out Mapを受け取る形
sample(out: Map<number, Pose>, now: number, renderDelay: number): void {
  out.clear();
  // ... fill
}

// GameClient
private remotes = new Map<number, Pose>();
frame() {
  this.interpolator.sample(this.remotes, now, renderDelay); // new Mapしない
}
```

### ベクトル再利用

```ts
// ❌ 毎フレーム new Vector3
function update() {
  const pos = new Vector3(x, y, z); // GC
}

// ✅ 再利用
private pos = new Vector3();
function update() {
  this.pos.set(x, y, z); // 既存オブジェクトを再利用
}
```

## 監査コマンド

```bash
# getPlayers() が残っていないか（getPlayersIterableに置換済みか）
grep -R "getPlayers()" src --include="*.ts" | grep -v "getPlayersIterable\|getPeersIterable"

# shift() がホットパスに残っていないか
grep -R "\.shift()" src --include="*.ts" | grep -v test | grep -v ".d.ts"

# slice がコピーになっていないか（subarrayを使うべき）
grep -R "\.slice(" src --include="*.ts" | grep -v "subarray\|test\|spec"

# new Map/Set/map がホットパスにないか
grep -R "new Map\|new Set\|\.map(" src/game/net --include="*.ts" | head -n 20

# new の頻度を計測（簡易）
grep -R "new " src/engine --include="*.ts" | wc -l
```

- cod-web EM01後は hot pathで `getPlayers()` 0件、`shift()` 0件、`slice` は互換1件のみ（hot path外）

## パフォーマンス測定

```ts
// 簡易GC測定
let gcCount = 0;
if (global.gc) {
  global.gc();
  const before = process.memoryUsage().heapUsed;
  for (let i = 0; i < 1000; i++) {
    doTick(); // 測定対象
  }
  global.gc();
  const after = process.memoryUsage().heapUsed;
  console.log(`heap diff: ${(after - before) / 1024} KB`);
}
```

## 関連

- `docs/arch/engineering.md` ゼロアロケ（あれば）
- `docs/arch/server.md` Room（あれば）
- `.agent/skills/memory-leak/SKILL.md` メモリリーク防止スキル
- `.agent/skills/determinism/SKILL.md` 決定論スキル（ホットパスの純粋性と関連）
- cod-web `arena/01a0b161-cod-web` の `zero-alloc/SKILL.md`（元出典）
