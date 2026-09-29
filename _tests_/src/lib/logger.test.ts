import { describe, expect, it } from "vitest"
import {
  createTaggedLogger,
  formatBytes,
  formatDuration,
  logBox,
  logErrorBox,
  logGroup,
  logger,
  loggers,
  logProgress,
  logSection,
  logSuccessBox,
} from "../../../scripts/lib/logger.ts"

describe("logger", () => {
  it("formatDuration", () => {
    expect(formatDuration(500)).toBe("500ms")
    expect(formatDuration(1500)).toBe("1.5s")
    expect(formatDuration(65000)).toBe("1m 5s")
  })
  it("formatBytes", () => {
    expect(formatBytes(500)).toBe("500B")
    expect(formatBytes(1500)).toContain("KB")
    expect(formatBytes(1024 * 1024 * 2)).toContain("MB")
    expect(formatBytes(1024 * 1024 * 1024 * 2)).toContain("GB")
  })
  it("createTaggedLogger", () => {
    const tagged = createTaggedLogger("TEST")
    expect(tagged.log).toBeDefined()
    expect(tagged.info).toBeDefined()
    expect(tagged.warn).toBeDefined()
    expect(tagged.error).toBeDefined()
    expect(tagged.debug).toBeDefined()
    expect(tagged.success).toBeDefined()
    expect(tagged.fail).toBeDefined()
    expect(tagged.ready).toBeDefined()
    expect(tagged.start).toBeDefined()
    expect(tagged.box).toBeDefined()
    expect(tagged.time).toBeDefined()
    expect(tagged.timeEnd).toBeDefined()
    expect(tagged.step).toBeDefined()
    expect(tagged.table).toBeDefined()
  })
  it("tagged logger methods work", () => {
    const tagged = createTaggedLogger("TEST2")
    expect(() => tagged.log("msg")).not.toThrow()
    expect(() => tagged.info("msg")).not.toThrow()
    expect(() => tagged.warn("msg")).not.toThrow()
    expect(() => tagged.error("msg")).not.toThrow()
    expect(() => tagged.success("msg")).not.toThrow()
    expect(() => tagged.fail("msg")).not.toThrow()
    expect(() => tagged.ready("msg")).not.toThrow()
    expect(() => tagged.start("msg")).not.toThrow()
    expect(() => tagged.box("msg")).not.toThrow()
    expect(() => tagged.debug("msg")).not.toThrow()
    expect(() => tagged.step(1, 2, "step")).not.toThrow()
    expect(() => tagged.table({ a: 1, b: 2 })).not.toThrow()
  })
  it("tagged logger timing", () => {
    const tagged = createTaggedLogger("TIMING")
    tagged.time("test-op")
    expect(tagged.timeEnd("test-op")).toBeGreaterThanOrEqual(0)
    expect(tagged.timeEnd("nonexistent")).toBe(0)
  })
  it("logBox and logProgress", () => {
    expect(() => logBox("Title", ["msg"])).not.toThrow()
    expect(() => logProgress(5, 10, "test")).not.toThrow()
    expect(() => logProgress(10, 10)).not.toThrow()
  })
  it("logSuccessBox and logErrorBox", () => {
    expect(() => logSuccessBox("Success", ["detail1", "detail2"])).not.toThrow()
    expect(() => logErrorBox("Error", ["err1"], ["hint1"])).not.toThrow()
    expect(() => logErrorBox("Error", ["err1"])).not.toThrow()
  })
  it("logGroup and logSection", () => {
    expect(() => logGroup("Group", ["item1", "item2"])).not.toThrow()
    expect(() => logGroup("Group", ["item1"], "🔍")).not.toThrow()
    expect(() => logSection("Section")).not.toThrow()
  })
  it("loggers object", () => {
    expect(loggers.build).toBeDefined()
    expect(loggers.dev).toBeDefined()
    expect(loggers.cache).toBeDefined()
    expect(loggers.detect).toBeDefined()
    expect(loggers.env).toBeDefined()
    expect(loggers.termux).toBeDefined()
    expect(loggers.check).toBeDefined()
    expect(loggers.setup).toBeDefined()
    expect(loggers.bootstrap).toBeDefined()
    expect(loggers.verify).toBeDefined()
  })
  it("logger methods exist", () => {
    expect(logger.info).toBeDefined()
    expect(logger.log).toBeDefined()
  })
})
