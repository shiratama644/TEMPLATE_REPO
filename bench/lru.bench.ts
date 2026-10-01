import { bench, describe } from "vitest"
import { LRUCache } from "../src/cache/lru.ts"

describe("LRU Cache benchmark", () => {
  bench("set 1000 items", () => {
    const cache = new LRUCache<string, number>(1000)
    for (let i = 0; i < 1000; i++) {
      cache.set(`key-${i}`, i)
    }
  })

  bench("get 1000 items", () => {
    const cache = new LRUCache<string, number>(1000)
    for (let i = 0; i < 1000; i++) cache.set(`key-${i}`, i)
    for (let i = 0; i < 1000; i++) cache.get(`key-${i}`)
  })

  bench("set + evict", () => {
    const cache = new LRUCache<string, number>(100)
    for (let i = 0; i < 1000; i++) {
      cache.set(`key-${i}`, i)
    }
  })
})
