import { mkdtempSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { bench, describe } from "vitest"
import {
  checkLicenseCompatibility,
  scanFileForSecrets,
  severityToNumber,
} from "../scripts/lib/security.ts"

describe("Security benchmark", () => {
  const tmpDir = mkdtempSync(join(tmpdir(), "bench-sec-"))
  const testFile = join(tmpDir, "test.ts")
  writeFileSync(
    testFile,
    "const x = 1;\n".repeat(1000) + "const key = 'ghp_1234567890abcdefghijklmnopqrstuvwxyz';\n",
  )

  bench("scanFileForSecrets 1k lines", () => {
    scanFileForSecrets(testFile)
  })

  bench("checkLicenseCompatibility", () => {
    for (let i = 0; i < 1000; i++) {
      checkLicenseCompatibility("MIT")
      checkLicenseCompatibility("GPL-3.0")
      checkLicenseCompatibility("Apache-2.0")
    }
  })

  bench("severityToNumber", () => {
    for (let i = 0; i < 10000; i++) {
      severityToNumber("critical")
      severityToNumber("high")
      severityToNumber("moderate")
      severityToNumber("low")
    }
  })

  // cleanup after
  try {
    rmSync(tmpDir, { recursive: true, force: true })
  } catch {}
})
