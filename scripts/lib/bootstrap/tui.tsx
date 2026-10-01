/** @jsxImportSource @opentui/react */
import { execSync } from "node:child_process"
import { existsSync, readFileSync } from "node:fs"
import { basename } from "node:path"
import { useKeyboard, useRenderer } from "@opentui/react"
import React, { useMemo, useState } from "react"
import { FEATURES, PROJECT_TYPES } from "./manifest.ts"
import { getPreset, getPresetChoices } from "./presets.ts"
import type { FeatureId, PresetId, ProjectTypeId, SetupAnswers } from "./types.ts"
import { resolveFeatureDependencies } from "./validator.ts"

function inferGithubOwner(cwd: string): string {
  try {
    const remote = execSync("git remote get-url origin", {
      cwd,
      encoding: "utf8",
      stdio: "pipe",
    })
      .toString()
      .trim()
    const m = remote.match(/github\.com[:/]([^/]+)\/([^/.]+)(?:\.git)?/)
    if (m) return m[1]
  } catch {}
  try {
    const pkgPath = `${cwd}/package.json`
    if (existsSync(pkgPath)) {
      const pkg = JSON.parse(readFileSync(pkgPath, "utf8"))
      const repo = pkg.repository
      const url = typeof repo === "string" ? repo : repo?.url || ""
      const mm = url.match(/github\.com[:/]([^/]+)\/([^/.]+)/)
      if (mm) return mm[1]
    }
  } catch {}
  return "your-github-username"
}

function isTermuxEnvironment(): boolean {
  try {
    if (process.env.TERMUX_VERSION) return true
    if (process.env.PREFIX?.includes("com.termux")) return true
    if (existsSync("/data/data/com.termux")) return true
    if (process.platform === "android") return true
  } catch {}
  return false
}

type Step =
  | "projectName"
  | "recommended"
  | "githubOwner"
  | "description"
  | "projectType"
  | "devInfra"
  | "termuxMode"
  | "testing"
  | "git"
  | "release"
  | "confirm"

type SelectItem = { label: string; value: string; description?: string }

function PromptLine({ question, hint }: { question: string; hint?: string }) {
  return (
    <box flexDirection="row">
      <text>
        <span fg="#00FFFF">
          <b>? </b>
        </span>
        <b>{question}</b>
        {hint ? <span fg="#888888"> {hint}</span> : null}
      </text>
    </box>
  )
}

function QuestionInput({
  question,
  hint,
  value,
  onChange,
  onSubmit,
  placeholder,
  error,
}: {
  question: string
  hint?: string
  value: string
  onChange: (v: string) => void
  onSubmit: (v: string) => void
  placeholder?: string
  error?: string
}) {
  return (
    <box flexDirection="column" gap={1}>
      <PromptLine question={question} hint={hint} />
      {error ? (
        <box marginLeft={2}>
          <text fg="#FF0000"> {error}</text>
        </box>
      ) : null}
      <box marginLeft={2} flexDirection="row" gap={1}>
        <text fg="#888888">{">"} </text>
        <input
          placeholder={placeholder || value}
          value={value}
          focused
          width={40}
          onInput={onChange}
          onSubmit={() => onSubmit(value)}
        />
      </box>
    </box>
  )
}

function QuestionSelect({
  question,
  hint,
  items,
  onSelect,
}: {
  question: string
  hint?: string
  items: SelectItem[]
  onSelect: (item: SelectItem) => void
}) {
  const options = useMemo(
    () =>
      items.map((it) => ({
        name: it.label,
        description: it.description || "",
        value: it.value,
      })),
    [items],
  )

  return (
    <box flexDirection="column" gap={1}>
      <PromptLine question={question} hint={hint} />
      <box
        marginLeft={2}
        marginTop={1}
        height={Math.min(options.length + 2, 12)}
        width={80}
        border
        borderStyle="rounded"
      >
        <select
          focused
          options={options}
          width={78}
          height={Math.min(options.length, 10)}
          onChange={(_idx: number, option: any) => {
            if (option) {
              onSelect({ label: option.name, value: option.value, description: option.description })
            }
          }}
        />
      </box>
    </box>
  )
}

function MultiSelect({
  question,
  hint,
  items,
  initialSelected,
  onSubmit,
}: {
  question: string
  hint?: string
  items: { label: string; value: string; description?: string }[]
  initialSelected: string[]
  onSubmit: (selected: string[]) => void
}) {
  const [selected, setSelected] = useState<Set<string>>(() => new Set(initialSelected))
  const [cursor, setCursor] = useState(0)

  useKeyboard((key) => {
    if (key.name === "up" || key.name === "k") {
      setCursor((c) => (c > 0 ? c - 1 : items.length - 1))
    } else if (key.name === "down" || key.name === "j") {
      setCursor((c) => (c < items.length - 1 ? c + 1 : 0))
    } else if (key.name === "space") {
      const it = items[cursor]
      setSelected((prev) => {
        const next = new Set(prev)
        if (next.has(it.value)) next.delete(it.value)
        else next.add(it.value)
        return next
      })
    } else if (key.name === "return" || key.name === "enter") {
      onSubmit(Array.from(selected))
    }
  })

  return (
    <box flexDirection="column" gap={1}>
      <PromptLine question={question} hint={hint} />
      <box
        marginLeft={2}
        flexDirection="column"
        marginTop={1}
        border
        borderStyle="rounded"
        padding={1}
        width={80}
      >
        {items.map((it, idx) => {
          const isSel = selected.has(it.value)
          const isCur = idx === cursor
          return (
            <box key={it.value} flexDirection="row">
              <text>
                <span fg={isCur ? "#00FFFF" : undefined}>
                  <b>{isCur ? ">" : " "} </b>
                </span>
                <span fg={isSel ? "#00FF00" : "#FFFFFF"}>
                  {isSel ? "[x]" : "[ ]"} {it.label}
                </span>
                {it.description ? <span fg="#888888"> - {it.description}</span> : null}
              </text>
            </box>
          )
        })}
      </box>
      <box marginLeft={2} flexDirection="column">
        <text fg="#888888">Space to toggle, Enter to confirm, Up/Down or j/k to navigate</text>
        <text fg="#888888">
          Selected {selected.size}/{items.length}: {Array.from(selected).join(", ") || "none"}
        </text>
      </box>
    </box>
  )
}

export function SetupTUI({
  cwd,
  onComplete,
  onCancel,
}: {
  cwd: string
  onComplete: (answers: SetupAnswers) => void
  onCancel: () => void
}) {
  const renderer = useRenderer()

  const [dirName] = useState(() => basename(cwd))
  const [defaultProjectName] = useState(
    () =>
      basename(cwd)
        .replace(/[^a-z0-9-]/gi, "-")
        .toLowerCase() || "my-app",
  )
  const [inferredOwner] = useState(() => inferGithubOwner(cwd))
  const [termuxDetected] = useState(() => isTermuxEnvironment())

  const [step, setStep] = useState<Step>("projectName")
  const [presetId, setPresetId] = useState<PresetId | "custom">("recommended")
  const [projectName, setProjectName] = useState(defaultProjectName)
  const [githubOwner, setGithubOwner] = useState(inferredOwner)
  const [description, setDescription] = useState("My awesome project")
  const [projectType, setProjectType] = useState<ProjectTypeId>("plain")
  const [devInfra, setDevInfra] = useState<FeatureId[]>([])
  const [testing, setTesting] = useState<FeatureId[]>([])
  const [gitFeatures, setGitFeatures] = useState<FeatureId[]>([])
  const [release, setRelease] = useState<FeatureId[]>([])
  const [termuxMode, setTermuxMode] = useState<"auto" | "yes" | "no">("auto")
  const [error, setError] = useState("")

  React.useEffect(() => {
    if (termuxDetected) setTermuxMode("yes")
  }, [termuxDetected])

  useKeyboard((key) => {
    if (key.name === "escape") {
      onCancel()
      renderer.destroy()
    }
  })

  const presetChoices = useMemo<SelectItem[]>(
    () => [
      {
        label: "Yes, use recommended defaults - TypeScript, ESLint, Vitest, Husky, Changesets",
        value: "recommended",
      },
      {
        label: "No, use minimal defaults - bare minimum",
        value: "minimal",
      },
      ...getPresetChoices().map((p) => ({
        label: `${p.label} - ${p.value}`,
        value: p.value,
      })),
      { label: "No, customize settings - Choose your own preferences", value: "custom" },
    ],
    [],
  )

  const projectTypeItems = useMemo<SelectItem[]>(
    () =>
      Object.entries(PROJECT_TYPES).map(([id, def]) => ({
        label: `${def.icon} ${def.name} - ${def.description}`,
        value: id,
        description: def.description,
      })),
    [],
  )

  const devInfraItems = useMemo(
    () =>
      Object.entries(FEATURES)
        .filter(([, def]) => def.group === "dev-infra")
        .map(([id, def]) => ({
          label: def.name,
          value: id,
          description: def.description,
        })),
    [],
  )

  const testingItems = useMemo(
    () =>
      Object.entries(FEATURES)
        .filter(([, def]) => def.group === "testing-quality")
        .map(([id, def]) => ({
          label: def.name,
          value: id,
          description: def.description,
        })),
    [],
  )

  const gitItems = useMemo(
    () =>
      Object.entries(FEATURES)
        .filter(([, def]) => def.group === "git-workflow")
        .map(([id, def]) => ({
          label: def.name,
          value: id,
          description: def.description,
        })),
    [],
  )

  const releaseItems = useMemo(
    () =>
      Object.entries(FEATURES)
        .filter(([, def]) => def.group === "release")
        .map(([id, def]) => ({
          label: def.name,
          value: id,
          description: def.description,
        })),
    [],
  )

  const validateProjectName = (value: string): string | undefined => {
    if (!value) return "Project name is required"
    if (value !== value.toLowerCase()) return "Must be lowercase"
    if (!/^[a-z0-9-_@/]+$/.test(value)) return "Only lowercase, numbers, dash, underscore, @, /"
    if (value.length > 214) return "Max 214 chars"
    if (value.startsWith("-") || value.startsWith("_")) return "Cannot start with - or _"
    return undefined
  }

  const buildAnswers = (): SetupAnswers => {
    if (presetId !== "custom") {
      const preset = getPreset(presetId as PresetId)
      if (preset) {
        return {
          projectName: projectName || defaultProjectName,
          projectDescription: description,
          githubOwner: githubOwner || inferredOwner,
          projectType: preset.projectType,
          features: { ...preset.features },
          termuxMode: preset.termuxMode,
          preset: preset.id,
        }
      }
    }

    const allSelected = new Set([...devInfra, ...testing, ...gitFeatures, ...release])
    let features = Object.fromEntries(
      Object.keys(FEATURES).map((id) => [id, allSelected.has(id as FeatureId)]),
    ) as Record<FeatureId, boolean>
    features = resolveFeatureDependencies(features)
    if (termuxMode === "no") features.termux = false

    return {
      projectName: projectName || defaultProjectName,
      projectDescription: description,
      githubOwner: githubOwner || inferredOwner,
      projectType,
      features,
      termuxMode,
    }
  }

  const renderStep = () => {
    switch (step) {
      case "projectName":
        return (
          <QuestionInput
            question="What is your project named?"
            hint={`(${defaultProjectName})`}
            value={projectName}
            onChange={setProjectName}
            error={error}
            onSubmit={(v) => {
              const err = validateProjectName(v)
              if (err) {
                setError(err)
                return
              }
              setError("")
              setStep("recommended")
            }}
          />
        )

      case "recommended":
        return (
          <QuestionSelect
            question="Would you like to use the recommended defaults?"
            hint={termuxDetected ? "(Termux detected)" : undefined}
            items={presetChoices}
            onSelect={(item) => {
              const val = item.value as PresetId | "custom"
              setPresetId(val)
              setStep("githubOwner")
            }}
          />
        )

      case "githubOwner":
        return (
          <QuestionInput
            question="What is your GitHub owner?"
            hint={`(${inferredOwner}) Used for CODEOWNERS, funding`}
            value={githubOwner}
            onChange={setGithubOwner}
            onSubmit={() => setStep("description")}
          />
        )

      case "description":
        return (
          <QuestionInput
            question="What is your project description?"
            hint="(max 200 chars)"
            value={description}
            onChange={setDescription}
            onSubmit={() => {
              if (presetId !== "custom") setStep("confirm")
              else setStep("projectType")
            }}
          />
        )

      case "projectType":
        return (
          <QuestionSelect
            question="What is your project type?"
            items={projectTypeItems}
            onSelect={(item) => {
              const id = item.value as ProjectTypeId
              setProjectType(id)
              const typeDef = PROJECT_TYPES[id]
              const defaults = Object.entries(FEATURES)
                .filter(([, def]) => {
                  if (typeDef.defaultFeatures && id in typeDef.defaultFeatures) {
                    return (typeDef.defaultFeatures as any)[id as FeatureId]
                  }
                  return def.defaultEnabled
                })
                .map(([fid]) => fid as FeatureId)
              setDevInfra(defaults.filter((fid) => FEATURES[fid].group === "dev-infra"))
              setTesting(defaults.filter((fid) => FEATURES[fid].group === "testing-quality"))
              setGitFeatures(defaults.filter((fid) => FEATURES[fid].group === "git-workflow"))
              setRelease(defaults.filter((fid) => FEATURES[fid].group === "release"))
              setStep("devInfra")
            }}
          />
        )

      case "devInfra":
        return (
          <MultiSelect
            question="Would you like to use dev & infra features?"
            hint="Docker, devcontainer, termux etc."
            items={devInfraItems}
            initialSelected={devInfra}
            onSubmit={(sel) => {
              setDevInfra(sel as FeatureId[])
              if (sel.includes("termux")) setStep("termuxMode")
              else setStep("testing")
            }}
          />
        )

      case "termuxMode":
        return (
          <QuestionSelect
            question="How to handle Termux environment?"
            items={[
              { label: "Auto - Detect automatically (recommended)", value: "auto" },
              { label: "Yes - Always enable optimizations", value: "yes" },
              { label: "No - Disable, keep files", value: "no" },
            ]}
            onSelect={(item) => {
              setTermuxMode(item.value as any)
              setStep("testing")
            }}
          />
        )

      case "testing":
        return (
          <MultiSelect
            question="Would you like to use testing & quality features?"
            hint="Vitest, Playwright, cspell, knip, coverage"
            items={testingItems}
            initialSelected={testing}
            onSubmit={(s) => {
              setTesting(s as FeatureId[])
              setStep("git")
            }}
          />
        )

      case "git":
        return (
          <MultiSelect
            question="Would you like to use git & workflow features?"
            hint="Husky, commitlint, templates, renovate"
            items={gitItems}
            initialSelected={gitFeatures}
            onSubmit={(s) => {
              setGitFeatures(s as FeatureId[])
              setStep("release")
            }}
          />
        )

      case "release":
        return (
          <MultiSelect
            question="Would you like to use release features?"
            hint="Changesets, size-limit, publint"
            items={releaseItems}
            initialSelected={release}
            onSubmit={(s) => {
              setRelease(s as FeatureId[])
              setStep("confirm")
            }}
          />
        )

      case "confirm": {
        const answers = buildAnswers()
        const enabled = Object.entries(answers.features)
          .filter(([, v]) => v)
          .map(([k]) => k)
        const disabled = Object.entries(answers.features)
          .filter(([, v]) => !v)
          .map(([k]) => k)

        return (
          <box flexDirection="column" gap={1}>
            <box>
              <text>
                <b>Review your configuration:</b>
              </text>
            </box>
            <box flexDirection="column" border borderStyle="rounded" padding={1} width={80}>
              <text>
                <span fg="#888888">Name:</span> {answers.projectName}
              </text>
              <text>
                <span fg="#888888">Description:</span> {answers.projectDescription}
              </text>
              <text>
                <span fg="#888888">Owner:</span> {answers.githubOwner}
              </text>
              <text>
                <span fg="#888888">Type:</span> {answers.projectType}
              </text>
              {answers.preset ? (
                <text>
                  <span fg="#888888">Preset:</span> {answers.preset}
                </text>
              ) : null}
              <text>
                <span fg="#888888">Enabled ({enabled.length}):</span> {enabled.join(", ") || "none"}
              </text>
              <text>
                <span fg="#888888">Disabled ({disabled.length}):</span>{" "}
                {disabled.join(", ") || "none"}
              </text>
              <text fg="#888888">Will modify files in: {cwd} (backup auto-created)</text>
            </box>
            <box flexDirection="column" gap={1}>
              <PromptLine question="Ready to execute?" />
              <box marginLeft={2} width={40} border borderStyle="rounded">
                <select
                  focused
                  options={[
                    { name: "Yes, execute setup", description: "Execute", value: "yes" },
                    { name: "No, cancel", description: "Cancel", value: "no" },
                  ]}
                  onChange={(_idx: number, option: any) => {
                    if (option?.value === "yes") {
                      onComplete(answers)
                      renderer.destroy()
                    } else {
                      onCancel()
                      renderer.destroy()
                    }
                  }}
                />
              </box>
            </box>
          </box>
        )
      }
    }
  }

  return (
    <box flexDirection="column" padding={1} gap={1}>
      <box flexDirection="column">
        <text>
          <b>create-template-app</b>
          <span fg="#888888"> v2.0.0 - Template Bootstrap (OpenTUI)</span>
        </text>
        <text fg="#888888">AI Agent software development template</text>
        <text fg="#888888">
          Press ESC to cancel | {dirName} | {step}
        </text>
      </box>
      <box>{renderStep()}</box>
    </box>
  )
}
