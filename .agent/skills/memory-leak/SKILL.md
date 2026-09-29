---
name: memory-leak
description: Room leave時やリソース解放時のメモリリークを防ぐスキル。clear/removeパターン、回帰テスト、監査コマンド。
---

# Memory Leak — リークを防ぐスキル

> 出典: cod-web `arena/01a0b161-cod-web` 最新arenaブランチの `memory-leak/SKILL.md` を汎用化
> 正本: `docs/arch/server.md`（あれば、Roomライフサイクル）、`docs/arch/engineering.md`

## 潜在リーク箇所（cod-web EM01発見を汎用化）

| # | 場所 | リーク内容 | 影響 |
|---|---|---|---|
| B1 | `Store` | `leave` 時に `store.clear(id)` しないと `Map<id, History>` が残留 | プレイヤー出入りで無限増加 |
| B2 | `Room.queues` | `leave` 時に queue削除しないと `Map<id, Queue>` 残留 | 同上 |
| B3 | `Broadcaster.paused` | backpressureで `paused` Setに追加後、leave時に削除しないと残留 | pausedが増え続け送信が止まる |
| B14 | `RateLimiter` | `leave` 時に `remove(id)` しないとトークンバケット残留 | 同上 |

### 汎用的なリークパターン

- **Map/Setの残留**: `join` で追加したものを `leave` で削除しない
- **EventListener残留**: `addEventListener` したものを `removeEventListener` しない
- **Interval/Timeout残留**: `setInterval` したものを `clearInterval` しない
- **Observer残留**: `ResizeObserver`, `IntersectionObserver` 等を `disconnect` しない
- **WebGLリソース残留**: `dispose()` しない

## 修正パターン

### Room.leaveで全削除（汎用）

```ts
class Room {
  leave(peerId: string) {
    this.players.delete(peerId);
    this.peers.delete(peerId);
    this.simulation.removePlayer(peerId); // queues削除
    this.store.clear(peerId); // history削除
    this.broadcaster.removePlayer(peerId); // paused削除
    this.rateLimiter.remove(peerId);
  }
}
```

### Simulation.removePlayer

```ts
removePlayer(playerId: string) {
  this.queues.delete(playerId);
  // pending inputsもクリア
}
```

### Broadcaster.removePlayer

```ts
removePlayer(peerId: string) {
  this.paused.delete(peerId);
  this.lastAckSeq.delete(peerId);
}
```

### Store.clear

```ts
clear(playerId: string) {
  this.histories.delete(playerId);
}
```

### EventListener / Interval の解放（ブラウザ汎用）

```ts
class Game {
  start() {
    window.addEventListener('resize', this.onResize);
    this.interval = setInterval(() => this.tick(), 1000);
    this.observer = new ResizeObserver(this.onResize);
    this.observer.observe(this.canvas);
  }
  dispose() {
    window.removeEventListener('resize', this.onResize);
    clearInterval(this.interval);
    this.observer.disconnect();
    this.engine?.dispose();
  }
}
```

## 回帰テスト（汎用）

```ts
test('leave clears all stores', () => {
  room.join(peer);
  expect(room.getPlayers()).toHaveLength(1);
  room.leave(peer.id);
  expect(room.getPlayers()).toHaveLength(0);
  expect((room as any).simulation.queues.has(peer.id)).toBe(false);
  expect((room as any).store.histories.has(peer.id)).toBe(false);
  expect((room as any).broadcaster.paused.has(peer.id)).toBe(false);
});

test('dispose clears listeners and intervals', () => {
  const game = new Game();
  game.start();
  expect(game.interval).toBeDefined();
  game.dispose();
  expect(game.interval).toBeUndefined();
  // listenersが削除されたことを確認（実装依存）
});
```

## 監査コマンド

```bash
# remove/clearがleave/close/disposeで呼ばれているか
grep -R "removePlayer\|clear\|dispose\|disconnect\|removeEventListener\|clearInterval" src --include="*.ts" | grep -E "leave|close|dispose"

# paused / Map の残留チェック
grep -R "paused\|players\|peers" src --include="*.ts" | grep -E "add|delete|clear"

# addEventListenerに対応するremoveEventListenerがあるか
grep -R "addEventListener" src --include="*.ts" -A 2 -B 2
grep -R "removeEventListener" src --include="*.ts" -A 2 -B 2

# setIntervalに対応するclearIntervalがあるか
grep -R "setInterval" src --include="*.ts"
grep -R "clearInterval" src --include="*.ts"
```

## 関連

- `docs/arch/server.md` Roomライフサイクル（あれば）
- `.agent/skills/zero-alloc/SKILL.md` ゼロアロケーションスキル（GC削減と関連）
- `AGENTS.md §6` プロジェクト固有ルール
- cod-web `arena/01a0b161-cod-web` の `memory-leak/SKILL.md`（元出典）
