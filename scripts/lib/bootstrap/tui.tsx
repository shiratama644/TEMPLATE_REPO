/** @jsxImportSource react */
import { execSync } from "node:child_process"
import { existsSync, readFileSync } from "node:fs"
import { basename } from "node:path"
import { Box, Text, useApp, useInput } from "ink"
import SelectInput from "ink-select-input"
import TextInput from "ink-text-input"
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

type SelectItem = { label: string; value: string }

function PromptLine({ question, hint }: { question: string; hint?: string }) {
  return (
    <Box>
      <Text color="cyan" bold>
        ?{" "}
      </Text>
      <Text bold>{question}</Text>
      {hint ? (
        <>
          <Text> </Text>
          <Text dimColor>{hint}</Text>
        </>
      ) : null}
    </Box>
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
    <Box flexDirection="column">
      <PromptLine question={question} hint={hint} />
      {error ? (
        <Box marginLeft={2}>
          <Text color="red"> {error}</Text>
        </Box>
      ) : null}
      <Box marginLeft={2}>
        <Text dimColor>{">"} </Text>
        <TextInput
          value={value}
          onChange={onChange}
          onSubmit={onSubmit}
          placeholder={placeholder}
        />
      </Box>
    </Box>
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
  return (
    <Box flexDirection="column">
      <PromptLine question={question} hint={hint} />
      <Box marginLeft={2} flexDirection="column" marginTop={1}>
        <SelectInput
          items={items}
          onSelect={onSelect as any}
          indicatorComponent={({ isSelected }) => (
            <Text color={isSelected ? "cyan" : undefined}>{isSelected ? ">" : " "} </Text>
          )}
          itemComponent={({ isSelected, label }) => (
            <Text color={isSelected ? "cyan" : undefined} bold={isSelected}>
              {label}
            </Text>
          )}
        />
      </Box>
    </Box>
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

  useInput((input, key) => {
    if (key.upArrow) {
      setCursor((c) => (c > 0 ? c - 1 : items.length - 1))
    } else if (key.downArrow) {
      setCursor((c) => (c < items.length - 1 ? c + 1 : 0))
    } else if (input === " ") {
      const it = items[cursor]
      setSelected((prev) => {
        const next = new Set(prev)
        if (next.has(it.value)) next.delete(it.value)
        else next.add(it.value)
        return next
      })
    } else if (key.return) {
      onSubmit(Array.from(selected))
    }
  })

  return (
    <Box flexDirection="column">
      <PromptLine question={question} hint={hint} />
      <Box marginLeft={2} flexDirection="column" marginTop={1}>
        {items.map((it, idx) => {
          const isSel = selected.has(it.value)
          const isCur = idx === cursor
          return (
            <Box key={it.value}>
              <Text color={isCur ? "cyan" : undefined} bold={isCur}>
                {isCur ? ">" : " "} {isSel ? "[x]" : "[ ]"} {it.label}
              </Text>
              {it.description ? <Text dimColor> - {it.description}</Text> : null}
            </Box>
          )
        })}
      </Box>
      <Box marginLeft={2} marginTop={1}>
        <Text dimColor>Space to toggle, Enter to confirm, Up/Down to navigate</Text>
      </Box>
      <Box marginLeft={2}>
        <Text dimColor>
          Selected {selected.size}/{items.length}: {Array.from(selected).join(", ") || "none"}
        </Text>
      </Box>
    </Box>
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
  const { exit } = useApp()

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

  useInput((_, key) => {
    if (key.escape) {
      onCancel()
      exit()
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
          <Box flexDirection="column">
            <Box>
              <Text bold>Review your configuration:</Text>
            </Box>
            <Box marginTop={1} flexDirection="column">
              <Text>
                <Text dimColor>Name:</Text> {answers.projectName}
              </Text>
              <Text>
                <Text dimColor>Description:</Text> {answers.projectDescription}
              </Text>
              <Text>
                <Text dimColor>Owner:</Text> {answers.githubOwner}
              </Text>
              <Text>
                <Text dimColor>Type:</Text> {answers.projectType}
              </Text>
              {answers.preset ? (
                <Text>
                  <Text dimColor>Preset:</Text> {answers.preset}
                </Text>
              ) : null}
              <Text>
                <Text dimColor>Enabled ({enabled.length}):</Text> {enabled.join(", ") || "none"}
              </Text>
              <Text>
                <Text dimColor>Disabled ({disabled.length}):</Text> {disabled.join(", ") || "none"}
              </Text>
              <Text dimColor>Will modify files in: {cwd} (backup auto-created)</Text>
            </Box>
            <Box marginTop={1} flexDirection="column">
              <PromptLine question="Ready to execute?" />
              <Box marginLeft={2} marginTop={1}>
                <SelectInput
                  items={[
                    { label: "Yes, execute setup", value: "yes" },
                    { label: "No, cancel", value: "no" },
                  ]}
                  onSelect={(item) => {
                    if (item.value === "yes") {
                      onComplete(answers)
                      exit()
                    } else {
                      onCancel()
                      exit()
                    }
                  }}
                  indicatorComponent={({ isSelected }) => (
                    <Text color={isSelected ? "cyan" : undefined}>{isSelected ? ">" : " "} </Text>
                  )}
                  itemComponent={({ isSelected, label }) => (
                    <Text color={isSelected ? "cyan" : undefined} bold={isSelected}>
                      {label}
                    </Text>
                  )}
                />
              </Box>
            </Box>
          </Box>
        )
      }
    }
  }

  return (
    <Box flexDirection="column" padding={1}>
      <Box>
        <Text bold>create-template-app</Text>
        <Text dimColor> v2.0.0 - Template Bootstrap</Text>
      </Box>
      <Box marginTop={1} flexDirection="column">
        <Text dimColor>AI Agent software development template</Text>
        <Text dimColor>
          Press ESC to cancel | {dirName} | {step}
        </Text>
      </Box>
      <Box marginTop={1}>{renderStep()}</Box>
    </Box>
  )
}
