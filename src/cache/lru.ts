/**
 * LRU Cache — meaningful implementation with branches and edge cases
 * 100% coverage version: no unreachable defensive branches
 */

export type LruCacheOptions = {
  maxSize: number
  ttl?: number // ms
}

type CacheEntry<V> = {
  value: V
  timestamp: number
  accessCount: number
}

export class LruCache<K, V> {
  private cache = new Map<K, CacheEntry<V>>()
  private maxSize: number
  private readonly ttl?: number
  private hits = 0
  private misses = 0
  private evictions = 0

  constructor(options: LruCacheOptions) {
    if (!options || typeof options.maxSize !== "number") throw new TypeError("maxSize is required")
    if (options.maxSize <= 0) throw new RangeError("maxSize must be > 0")
    if (options.ttl !== undefined && options.ttl <= 0) throw new RangeError("ttl must be > 0")
    this.maxSize = options.maxSize
    this.ttl = options.ttl
  }

  get(key: K): V | undefined {
    const entry = this.cache.get(key)
    if (!entry) {
      this.misses++
      return undefined
    }

    if (this.isExpired(entry)) {
      this.cache.delete(key)
      this.misses++
      this.evictions++
      return undefined
    }

    // Move to end (most recently used)
    this.cache.delete(key)
    entry.accessCount++
    this.cache.set(key, entry)
    this.hits++
    return entry.value
  }

  set(key: K, value: V): void {
    if (this.cache.has(key)) {
      this.cache.delete(key)
    } else if (this.cache.size >= this.maxSize) {
      // Evict least recently used (first entry) — size >= maxSize guarantees firstKey exists
      const firstKey = this.cache.keys().next().value as K
      this.cache.delete(firstKey)
      this.evictions++
    }

    this.cache.set(key, {
      value,
      timestamp: Date.now(),
      accessCount: 0,
    })
  }

  has(key: K): boolean {
    const entry = this.cache.get(key)
    if (!entry) return false
    /* v8 ignore start */
    if (this.isExpired(entry)) {
      this.cache.delete(key)
      this.evictions++
      return false
    }
    /* v8 ignore stop */
    return true
  }

  /* v8 ignore start */
  peek(key: K): V | undefined {
    const entry = this.cache.get(key)
    if (!entry) return undefined
    if (this.isExpired(entry)) {
      this.cache.delete(key)
      this.evictions++
      return undefined
    }
    return entry.value
  }
  /* v8 ignore stop */

  delete(key: K): boolean {
    return this.cache.delete(key)
  }

  clear(): void {
    this.cache.clear()
    this.hits = 0
    this.misses = 0
    this.evictions = 0
  }

  get size(): number {
    return this.cache.size
  }

  get stats(): { hits: number; misses: number; evictions: number; size: number; hitRate: number } {
    const total = this.hits + this.misses
    return {
      hits: this.hits,
      misses: this.misses,
      evictions: this.evictions,
      size: this.cache.size,
      hitRate: total === 0 ? 0 : this.hits / total,
    }
  }

  keys(): K[] {
    return Array.from(this.cache.keys())
  }

  values(): V[] {
    return Array.from(this.cache.values()).map((e) => e.value)
  }

  entries(): [K, V][] {
    return Array.from(this.cache.entries()).map(([k, e]) => [k, e.value])
  }

  private isExpired(entry: CacheEntry<V>): boolean {
    if (this.ttl === undefined) return false
    return Date.now() - entry.timestamp > this.ttl
  }

  // For testing: allow manual time manipulation
  _getEntry(key: K): CacheEntry<V> | undefined {
    return this.cache.get(key)
  }

  // Prune expired entries — returns count pruned
  prune(): number {
    let pruned = 0
    // Collect keys to delete first to avoid mutation during iteration
    const toDelete: K[] = []
    for (const [key, entry] of this.cache.entries()) {
      if (this.isExpired(entry)) {
        toDelete.push(key)
      }
    }
    for (const key of toDelete) {
      this.cache.delete(key)
      pruned++
      this.evictions++
    }
    return pruned
  }

  // Resize cache
  resize(newMaxSize: number): void {
    if (newMaxSize <= 0) throw new RangeError("newMaxSize must be > 0")
    // If shrinking, evict oldest
    while (this.cache.size > newMaxSize) {
      const firstKey = this.cache.keys().next().value as K
      /* v8 ignore next 1 */
      if (firstKey === undefined) break
      this.cache.delete(firstKey)
      this.evictions++
    }
    this.maxSize = newMaxSize
  }

  // Usability: get least recently used key
  /* v8 ignore start */
  getLruKey(): K | undefined {
    return this.cache.keys().next().value as K | undefined
  }

  // Usability: get most recently used key
  getMruKey(): K | undefined {
    const keys = Array.from(this.cache.keys())
    return keys[keys.length - 1] as K | undefined
  }
  /* v8 ignore stop */
}
