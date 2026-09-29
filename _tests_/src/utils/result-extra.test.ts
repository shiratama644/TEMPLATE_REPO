import { describe, expect, it } from "vitest"
import { Err, err, fromPromise, fromThrowable, Ok, ok } from "../../../src/utils/result.ts"

describe("Result extra branches", () => {
  it("map catches non-Error", () => {
    const result = new Ok(2).map(() => {
      throw "string error"
    })
    expect(result.isErr()).toBe(true)
  })
  it("flatMap catches non-Error", () => {
    const result = new Ok(2).flatMap(() => {
      throw "string error"
    })
    expect(result.isErr()).toBe(true)
  })
  it("mapErr catches non-Error", () => {
    const result = new Err("original" as any).mapErr(() => {
      throw "string error"
    })
    expect(result.isErr()).toBe(true)
  })
  it("unwrap throws non-Error", () => {
    expect(() => new Err("string" as any).unwrap()).toThrow()
  })
  it("fromThrowable handles non-Error", () => {
    const result = fromThrowable(() => {
      throw "string"
    })
    expect(result.isErr()).toBe(true)
  })
  it("fromPromise handles non-Error rejection", async () => {
    const result = await fromPromise(Promise.reject("string"))
    expect(result.isErr()).toBe(true)
  })
})
