import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { LruCache } from "../../../src/cache/lru.ts"

describe("LruCache extra 100%", () => {
  it("hitRate 0 when no accesses", () => {
    const cache = new LruCache<string, number>({ maxSize: 10 })
    expect(cache.stats.hitRate).toBe(0)
    expect(cache.stats.hits).toBe(0)
    expect(cache.stats.misses).toBe(0)
  })

  it("hitRate 0 when only misses", () => {
    const cache = new LruCache<string, number>({ maxSize: 10 })
    cache.get("missing")
    expect(cache.stats.hitRate).toBe(0)
    expect(cache.stats.misses).toBe(1)
  })

  it("hitRate 1 when only hits", () => {
    const cache = new LruCache<string, number>({ maxSize: 10 })
    cache.set("a", 1)
    cache.get("a")
    expect(cache.stats.hitRate).toBe(1)
  })

  it("hitRate 0.5", () => {
    const cache = new LruCache<string, number>({ maxSize: 10 })
    cache.set("a", 1)
    cache.get("a") // hit
    cache.get("b") // miss
    expect(cache.stats.hitRate).toBe(0.5)
  })

  it("has returns false for missing", () => {
    const cache = new LruCache<string, number>({ maxSize: 10 })
    expect(cache.has("missing")).toBe(false)
  })

  it("has returns true for existing", () => {
    const cache = new LruCache<string, number>({ maxSize: 10 })
    cache.set("a", 1)
    expect(cache.has("a")).toBe(true)
  })

  it("isExpired false when ttl undefined", () => {
    const cache = new LruCache<string, number>({ maxSize: 10 })
    cache.set("a", 1)
    expect(cache.has("a")).toBe(true)
    expect(cache.get("a")).toBe(1)
  })

  it("isExpired true when expired", () => {
    vi.useFakeTimers()
    try {
      const cache = new LruCache<string, number>({ maxSize: 10, ttl: 1000 })
      cache.set("a", 1)
      expect(cache.has("a")).toBe(true)
      vi.advanceTimersByTime(1500)
      expect(cache.has("a")).toBe(false)
      expect(cache.get("a")).toBeUndefined()
    } finally {
      vi.useRealTimers()
    }
  })

  it("prune with no expired", () => {
    const cache = new LruCache<string, number>({ maxSize: 10 })
    cache.set("a", 1)
    expect(cache.prune()).toBe(0)
  })

  it("prune with expired", () => {
    vi.useFakeTimers()
    try {
      const cache = new LruCache<string, number>({ maxSize: 10, ttl: 1000 })
      cache.set("a", 1)
      cache.set("b", 2)
      vi.advanceTimersByTime(1500)
      expect(cache.prune()).toBe(2)
    } finally {
      vi.useRealTimers()
    }
  })

  it("resize larger", () => {
    const cache = new LruCache<string, number>({ maxSize: 2 })
    cache.set("a", 1)
    cache.set("b", 2)
    cache.resize(5)
    expect(cache.size).toBe(2)
    cache.set("c", 3)
    expect(cache.size).toBe(3)
  })

  it("resize smaller", () => {
    const cache = new LruCache<string, number>({ maxSize: 5 })
    cache.set("a", 1)
    cache.set("b", 2)
    cache.set("c", 3)
    cache.resize(2)
    expect(cache.size).toBe(2)
  })

  it("resize to same size", () => {
    const cache = new LruCache<string, number>({ maxSize: 2 })
    cache.set("a", 1)
    cache.resize(2)
    expect(cache.size).toBe(1)
  })

  it("eviction on set", () => {
    const cache = new LruCache<string, number>({ maxSize: 2 })
    cache.set("a", 1)
    cache.set("b", 2)
    cache.set("c", 3) // evicts a
    expect(cache.has("a")).toBe(false)
    expect(cache.has("b")).toBe(true)
    expect(cache.has("c")).toBe(true)
    expect(cache.stats.evictions).toBe(1)
  })

  it("update existing key", () => {
    const cache = new LruCache<string, number>({ maxSize: 2 })
    cache.set("a", 1)
    cache.set("a", 2)
    expect(cache.get("a")).toBe(2)
    expect(cache.size).toBe(1)
  })

  it("delete and clear", () => {
    const cache = new LruCache<string, number>({ maxSize: 10 })
    cache.set("a", 1)
    expect(cache.delete("a")).toBe(true)
    expect(cache.delete("missing")).toBe(false)
    cache.set("b", 2)
    cache.clear()
    expect(cache.size).toBe(0)
    expect(cache.stats.hits).toBe(0)
  })

  it("keys values entries", () => {
    const cache = new LruCache<string, number>({ maxSize: 10 })
    cache.set("a", 1)
    cache.set("b", 2)
    expect(cache.keys()).toEqual(["a", "b"])
    expect(cache.values()).toEqual([1, 2])
    expect(cache.entries()).toEqual([
      ["a", 1],
      ["b", 2],
    ])
  })

  it("constructor throws", () => {
    expect(() => new LruCache(null as any)).toThrow(TypeError)
    expect(() => new LruCache({ maxSize: 0 } as any)).toThrow(RangeError)
    expect(() => new LruCache({ maxSize: -1 } as any)).toThrow(RangeError)
    expect(() => new LruCache({ maxSize: 10, ttl: 0 } as any)).toThrow(RangeError)
  })

  it("resize throws", () => {
    const cache = new LruCache<string, number>({ maxSize: 10 })
    expect(() => cache.resize(0)).toThrow(RangeError)
    expect(() => cache.resize(-1)).toThrow(RangeError)
  })
})
