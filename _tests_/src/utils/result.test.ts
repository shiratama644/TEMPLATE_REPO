import { describe, expect, it } from "vitest"
import {
  combine,
  Err,
  err,
  fromPromise,
  fromThrowable,
  isResult,
  Ok,
  ok,
} from "../../../src/utils/result.ts"

describe("Ok", () => {
  it("creates Ok", () => {
    const result = new Ok(42)
    expect(result.ok).toBe(true)
    expect(result.err).toBe(false)
    expect(result.value).toBe(42)
    expect(result.isOk()).toBe(true)
    expect(result.isErr()).toBe(false)
  })

  it("map transforms value", () => {
    const result = new Ok(2).map((x) => x * 2)
    expect(result.isOk()).toBe(true)
    expect((result as Ok<number>).value).toBe(4)
  })

  it("map catches error", () => {
    const result = new Ok(2).map(() => {
      throw new Error("fail")
    })
    expect(result.isErr()).toBe(true)
  })

  it("flatMap chains", () => {
    const result = new Ok(2).flatMap((x) => new Ok(x * 3))
    expect((result as Ok<number>).value).toBe(6)
  })

  it("flatMap catches error", () => {
    const result = new Ok(2).flatMap(() => {
      throw new Error("fail")
    })
    expect(result.isErr()).toBe(true)
  })

  it("mapErr does nothing for Ok", () => {
    const result = new Ok(42).mapErr()
    expect(result.isOk()).toBe(true)
  })

  it("unwrap returns value", () => {
    expect(new Ok(42).unwrap()).toBe(42)
  })

  it("unwrapOr returns value", () => {
    expect(new Ok(42).unwrapOr(0)).toBe(42)
  })

  it("unwrapOrElse returns value", () => {
    expect(new Ok(42).unwrapOrElse(() => 0)).toBe(42)
  })

  it("match calls ok", () => {
    const result = new Ok(42).match({
      ok: (v) => `ok: ${v}`,
      err: () => "err",
    })
    expect(result).toBe("ok: 42")
  })
})

describe("Err", () => {
  it("creates Err", () => {
    const error = new Error("fail")
    const result = new Err(error)
    expect(result.ok).toBe(false)
    expect(result.err).toBe(true)
    expect(result.error).toBe(error)
    expect(result.isOk()).toBe(false)
    expect(result.isErr()).toBe(true)
  })

  it("map does nothing for Err", () => {
    const result = new Err(new Error("fail")).map((x: number) => x * 2)
    expect(result.isErr()).toBe(true)
  })

  it("flatMap does nothing for Err", () => {
    const result = new Err(new Error("fail")).flatMap(() => new Ok(42))
    expect(result.isErr()).toBe(true)
  })

  it("mapErr transforms error", () => {
    const result = new Err(new Error("fail")).mapErr((e) => new Error(`wrapped: ${e.message}`))
    expect(result.isErr()).toBe(true)
    expect((result as Err<Error>).error.message).toBe("wrapped: fail")
  })

  it("mapErr catches error", () => {
    const result = new Err(new Error("fail")).mapErr(() => {
      throw new Error("mapErr fail")
    })
    expect(result.isErr()).toBe(true)
  })

  it("unwrap throws", () => {
    expect(() => new Err(new Error("fail")).unwrap()).toThrow("fail")
  })

  it("unwrap with non-Error", () => {
    expect(() => new Err("string error" as any).unwrap()).toThrow("string error")
  })

  it("unwrapOr returns default", () => {
    expect(new Err(new Error("fail")).unwrapOr(42)).toBe(42)
  })

  it("unwrapOrElse calls fn", () => {
    expect(new Err(new Error("fail")).unwrapOrElse(() => 42)).toBe(42)
  })

  it("match calls err", () => {
    const result = new Err(new Error("fail")).match({
      ok: () => "ok",
      err: (e) => `err: ${e.message}`,
    })
    expect(result).toBe("err: fail")
  })
})

describe("ok and err helpers", () => {
  it("ok creates Ok", () => {
    const result = ok(42)
    expect(result.isOk()).toBe(true)
  })
  it("err creates Err", () => {
    const result = err(new Error("fail"))
    expect(result.isErr()).toBe(true)
  })
})

describe("fromThrowable", () => {
  it("returns Ok on success", () => {
    const result = fromThrowable(() => 42)
    expect(result.isOk()).toBe(true)
  })
  it("returns Err on throw", () => {
    const result = fromThrowable(() => {
      throw new Error("fail")
    })
    expect(result.isErr()).toBe(true)
  })
  it("handles non-Error throw", () => {
    const result = fromThrowable(() => {
      throw "string error"
    })
    expect(result.isErr()).toBe(true)
  })
})

describe("fromPromise", () => {
  it("returns Ok on resolved promise", async () => {
    const result = await fromPromise(Promise.resolve(42))
    expect(result.isOk()).toBe(true)
    expect((result as Ok<number>).value).toBe(42)
  })
  it("returns Err on rejected promise", async () => {
    const result = await fromPromise(Promise.reject(new Error("fail")))
    expect(result.isErr()).toBe(true)
  })
  it("handles non-Error rejection", async () => {
    const result = await fromPromise(Promise.reject("string error"))
    expect(result.isErr()).toBe(true)
  })
})

describe("combine", () => {
  it("combines Ok results", () => {
    const result = combine([ok(1), ok(2), ok(3)])
    expect(result.isOk()).toBe(true)
    expect((result as Ok<number[]>).value).toEqual([1, 2, 3])
  })
  it("returns first Err", () => {
    const result = combine([ok(1), err(new Error("fail")), ok(3)])
    expect(result.isErr()).toBe(true)
  })
  it("handles empty array", () => {
    const result = combine([])
    expect(result.isOk()).toBe(true)
    expect((result as Ok<unknown[]>).value).toEqual([])
  })
})

describe("isResult", () => {
  it("checks if value is Result", () => {
    expect(isResult(ok(42))).toBe(true)
    expect(isResult(err(new Error("fail")))).toBe(true)
    expect(isResult(42)).toBe(false)
    expect(isResult(null)).toBe(false)
    expect(isResult({})).toBe(false)
  })
})
