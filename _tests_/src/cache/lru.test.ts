import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { LruCache } from "../../../src/cache/lru.ts"

describe("LruCache constructor", () => {
  it("creates cache with maxSize", () => {
    const cache = new LruCache({ maxSize: 10 })
    expect(cache.size).toBe(0)
  })
  it("throws on invalid maxSize", () => {
    expect(() => new LruCache(null as any)).toThrow(TypeError)
    expect(() => new LruCache({ maxSize: 0 } as any)).toThrow(RangeError)
    expect(() => new LruCache({ maxSize: -1 } as any)).toThrow(RangeError)
  })
  it("throws on invalid ttl", () => {
    expect(() => new LruCache({ maxSize: 10, ttl: 0 })).toThrow(RangeError)
    expect(() => new LruCache({ maxSize: 10, ttl: -1 })).toThrow(RangeError)
  })
  it("accepts ttl", () => {
    const cache = new LruCache({ maxSize: 10, ttl: 1000 })
    expect(cache.size).toBe(0)
  })
})

describe("LruCache set and get", () => {
  it("sets and gets value", () => {
    const cache = new LruCache<string, number>({ maxSize: 10 })
    cache.set("a", 1)
    expect(cache.get("a")).toBe(1)
  })
  it("returns undefined for missing key", () => {
    const cache = new LruCache<string, number>({ maxSize: 10 })
    expect(cache.get("missing")).toBeUndefined()
  })
  it("overwrites existing key", () => {
    const cache = new LruCache<string, number>({ maxSize: 10 })
    cache.set("a", 1)
    cache.set("a", 2)
    expect(cache.get("a")).toBe(2)
    expect(cache.size).toBe(1)
  })
  it("handles multiple keys", () => {
    const cache = new LruCache<string, number>({ maxSize: 10 })
    cache.set("a", 1)
    cache.set("b", 2)
    cache.set("c", 3)
    expect(cache.size).toBe(3)
    expect(cache.get("a")).toBe(1)
    expect(cache.get("b")).toBe(2)
    expect(cache.get("c")).toBe(3)
  })
})

describe("LruCache eviction", () => {
  it("evicts least recently used", () => {
    const cache = new LruCache<string, number>({ maxSize: 2 })
    cache.set("a", 1)
    cache.set("b", 2)
    cache.set("c", 3) // should evict a
    expect(cache.get("a")).toBeUndefined()
    expect(cache.get("b")).toBe(2)
    expect(cache.get("c")).toBe(3)
  })
  it("updates LRU order on get", () => {
    const cache = new LruCache<string, number>({ maxSize: 2 })
    cache.set("a", 1)
    cache.set("b", 2)
    cache.get("a") // a becomes most recent
    cache.set("c", 3) // should evict b
    expect(cache.get("a")).toBe(1)
    expect(cache.get("b")).toBeUndefined()
    expect(cache.get("c")).toBe(3)
  })
  it("tracks evictions", () => {
    const cache = new LruCache<string, number>({ maxSize: 2 })
    cache.set("a", 1)
    cache.set("b", 2)
    cache.set("c", 3)
    expect(cache.stats.evictions).toBe(1)
  })
})

describe("LruCache has and delete", () => {
  it("has checks existence", () => {
    const cache = new LruCache<string, number>({ maxSize: 10 })
    cache.set("a", 1)
    expect(cache.has("a")).toBe(true)
    expect(cache.has("b")).toBe(false)
  })
  it("delete removes entry", () => {
    const cache = new LruCache<string, number>({ maxSize: 10 })
    cache.set("a", 1)
    expect(cache.delete("a")).toBe(true)
    expect(cache.has("a")).toBe(false)
    expect(cache.size).toBe(0)
  })
  it("delete returns false for missing", () => {
    const cache = new LruCache<string, number>({ maxSize: 10 })
    expect(cache.delete("missing")).toBe(false)
  })
  it("clear empties cache", () => {
    const cache = new LruCache<string, number>({ maxSize: 10 })
    cache.set("a", 1)
    cache.set("b", 2)
    cache.clear()
    expect(cache.size).toBe(0)
    expect(cache.stats.hits).toBe(0)
  })
})

describe("LruCache stats", () => {
  it("tracks hits and misses", () => {
    const cache = new LruCache<string, number>({ maxSize: 10 })
    cache.set("a", 1)
    cache.get("a") // hit
    cache.get("b") // miss
    const stats = cache.stats
    expect(stats.hits).toBe(1)
    expect(stats.misses).toBe(1)
    expect(stats.hitRate).toBe(0.5)
  })
  it("hitRate 0 when no accesses", () => {
    const cache = new LruCache<string, number>({ maxSize: 10 })
    expect(cache.stats.hitRate).toBe(0)
  })
})

describe("LruCache keys, values, entries", () => {
  it("returns keys", () => {
    const cache = new LruCache<string, number>({ maxSize: 10 })
    cache.set("a", 1)
    cache.set("b", 2)
    expect(cache.keys()).toEqual(["a", "b"])
  })
  it("returns values", () => {
    const cache = new LruCache<string, number>({ maxSize: 10 })
    cache.set("a", 1)
    cache.set("b", 2)
    expect(cache.values()).toEqual([1, 2])
  })
  it("returns entries", () => {
    const cache = new LruCache<string, number>({ maxSize: 10 })
    cache.set("a", 1)
    expect(cache.entries()).toEqual([["a", 1]])
  })
})

describe("LruCache TTL", () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it("expires entries after ttl", () => {
    const cache = new LruCache<string, number>({ maxSize: 10, ttl: 1000 })
    cache.set("a", 1)
    expect(cache.get("a")).toBe(1)
    vi.advanceTimersByTime(1500)
    expect(cache.get("a")).toBeUndefined()
  })
  it("has returns false for expired", () => {
    const cache = new LruCache<string, number>({ maxSize: 10, ttl: 1000 })
    cache.set("a", 1)
    vi.advanceTimersByTime(1500)
    expect(cache.has("a")).toBe(false)
  })
  it("prune removes expired", () => {
    const cache = new LruCache<string, number>({ maxSize: 10, ttl: 1000 })
    cache.set("a", 1)
    cache.set("b", 2)
    vi.advanceTimersByTime(1500)
    const pruned = cache.prune()
    expect(pruned).toBe(2)
    expect(cache.size).toBe(0)
  })
})

describe("LruCache resize", () => {
  it("resizes larger", () => {
    const cache = new LruCache<string, number>({ maxSize: 2 })
    cache.set("a", 1)
    cache.set("b", 2)
    cache.resize(5)
    cache.set("c", 3)
    expect(cache.size).toBe(3)
  })
  it("resizes smaller and evicts", () => {
    const cache = new LruCache<string, number>({ maxSize: 5 })
    cache.set("a", 1)
    cache.set("b", 2)
    cache.set("c", 3)
    cache.resize(2)
    expect(cache.size).toBe(2)
    expect(cache.stats.evictions).toBeGreaterThan(0)
  })
  it("throws on invalid resize", () => {
    const cache = new LruCache<string, number>({ maxSize: 10 })
    expect(() => cache.resize(0)).toThrow(RangeError)
    expect(() => cache.resize(-1)).toThrow(RangeError)
  })
})

describe("LruCache _getEntry for testing", () => {
  it("exposes entry for testing", () => {
    const cache = new LruCache<string, number>({ maxSize: 10 })
    cache.set("a", 1)
    const entry = cache._getEntry("a")
    expect(entry).toBeDefined()
    expect(entry?.value).toBe(1)
  })
})
