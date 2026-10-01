import type { SetupAnswers } from "./types.ts"

export async function runTUI(cwd = process.cwd()): Promise<SetupAnswers | null> {
  console.log("  Loading setup wizard (OpenTUI)...")

  try {
    const { createCliRenderer } = await import("@opentui/core")
    const { createRoot } = await import("@opentui/react")
    const { SetupTUI } = await import("./tui.tsx")
    const React = await import("react")

    return new Promise((resolve) => {
      let result: SetupAnswers | null = null

      const onComplete = (answers: SetupAnswers) => {
        result = answers
      }

      const onCancel = () => {
        result = null
      }

      createCliRenderer({
        exitOnCtrlC: true,
      }).then((renderer: any) => {
        const root = createRoot(renderer)
        root.render(
          React.createElement(SetupTUI, {
            cwd,
            onComplete,
            onCancel,
          }),
        )

        renderer.on("destroy", () => {
          resolve(result)
        })
      })
    })
  } catch (e) {
    console.warn(
      `  OpenTUI failed to load (${e instanceof Error ? e.message : String(e)}), falling back to simple prompts`,
    )
    const { promptSetup } = await import("./prompts.ts")
    const answers = await promptSetup(false, cwd)
    return answers
  }
}
