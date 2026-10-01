import { bench, describe } from "vitest"
import { detectAll } from "../scripts/lib/detector.ts"

describe("Project Detector benchmark", () => {
  bench("detectAll", () => {
    detectAll()
  })

  bench("detectAll x100", () => {
    for (let i = 0; i < 100; i++) detectAll()
  })
})
