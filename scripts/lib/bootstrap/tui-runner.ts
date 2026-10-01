import { render } from "ink"
import React from "react"
import type { SetupAnswers } from "./types.ts"

export async function runTUI(cwd = process.cwd()): Promise<SetupAnswers | null> {
  // Immediate feedback for fast perceived opening
  // eslint-disable-next-line no-console
  console.log("  Loading setup wizard...")

  const { SetupTUI } = await import("./tui.tsx")

  return new Promise((resolve) => {
    let result: SetupAnswers | null = null

    const onComplete = (answers: SetupAnswers) => {
      result = answers
    }

    const onCancel = () => {
      result = null
    }

    const { waitUntilExit } = render(
      React.createElement(SetupTUI, {
        cwd,
        onComplete,
        onCancel,
      }),
    )

    waitUntilExit().then(() => {
      resolve(result)
    })
  })
}
