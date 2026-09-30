import { render } from "ink"
import React from "react"
import { SetupTUI } from "./tui.tsx"
import type { SetupAnswers } from "./types.ts"

export function runTUI(cwd = process.cwd()): Promise<SetupAnswers | null> {
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
