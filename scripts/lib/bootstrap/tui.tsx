/** @jsxImportSource react */
import { execSync } from "node:child_process"
import { existsSync, readFileSync } from "node:fs"
import { basename } from "node:path"
import { Box, Text, useApp, useInput } from "ink"
import SelectInput from "ink-select-input"
import TextInput from "ink-text-input"
import React, { useState } from "react"
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
    }).trim()
    const match = remote.match(/github\.com[:/]([^/]+)\/([^/.]+)(?:\.git)?/)
    if (match) return match[1]
  } catch {}
  try {
    const pkgPath = `${cwd}/package.json`
    if (existsSync(pkgPath)) {
      const pkg = JSON.parse(readFileSync(pkgPath, "utf8"))
      const repo = pkg.repository
      const url = typeof repo === "string" ? repo : repo?.url || ""
      const match = url.match(/github\.com[:/]([^/]+)\/([^/.]+)/)
      if (match) return match[1]
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
  | "preset"
  | "projectName"
  | "githubOwner"
  | "description"
  | "projectType"
  | "devInfra"
  | "termuxMode"
  | "testing"
  | "git"
  | "release"
  | "confirm"

const STEP_ORDER: Step[] = [
  "preset",
  "projectName",
  "githubOwner",
  "description",
  "projectType",
  "devInfra",
  "termuxMode",
  "testing",
  "git",
  "release",
  "confirm",
]

const STEP_LABELS: Record<Step, string> = {
  preset: "Preset",
  projectName: "Name",
  githubOwner: "Owner",
  description: "Desc",
  projectType: "Type",
  devInfra: "Infra",
  termuxMode: "Termux",
  testing: "Quality",
  git: "Git",
  release: "Release",
  confirm: "Confirm",
}

type SelectItem = { label: string; value: string; hint?: string }

function ProgressBar({ currentStep }: { currentStep: Step }) {
  const currentIdx = STEP_ORDER.indexOf(currentStep)
  return (
    <Box flexDirection="column" marginBottom={1}>
      <Box flexDirection="row" flexWrap="wrap" gap={1}>
        {STEP_ORDER.map((s, idx) => {
          const isActive = s === currentStep
          const isPast = idx < currentIdx
          return (
            <Box key={s} marginRight={1}>
              <Text
                color={isActive ? "cyan" : isPast ? "green" : "gray"}
                bold={isActive}
                dimColor={idx > currentIdx}
              >
                {isPast ? "[x]" : isActive ? "[*]" : "[ ]"} {idx + 1}. {STEP_LABELS[s]}
              </Text>
            </Box>
          )
        })}
      </Box>
      <Box marginTop={1}>
        <Text dimColor>
          Progress: {currentIdx + 1}/{STEP_ORDER.length} (
          {Math.round(((currentIdx + 1) / STEP_ORDER.length) * 100)}%)
        </Text>
        <Text> </Text>
        <Text color="cyan">{"=".repeat(currentIdx + 1)}</Text>
        <Text dimColor>{"-".repeat(STEP_ORDER.length - currentIdx - 1)}</Text>
      </Box>
    </Box>
  )
}

function ModernMultiSelect({
  items,
  initialSelected,
  onSubmit,
  title,
  description,
}: {
  items: SelectItem[]
  initialSelected: string[]
  onSubmit: (selected: string[]) => void
  title: string
  description?: string
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set(initialSelected))
  const [cursor, setCursor] = useState(0)

  useInput((input, key) => {
    if (key.upArrow) {
      setCursor((c) => (c > 0 ? c - 1 : items.length - 1))
    } else if (key.downArrow) {
      setCursor((c) => (c < items.length - 1 ? c + 1 : 0))
    } else if (input === " ") {
      const item = items[cursor]
      setSelected((prev) => {
        const next = new Set(prev)
        if (next.has(item.value)) next.delete(item.value)
        else next.add(item.value)
        return next
      })
    } else if (key.return) {
      onSubmit(Array.from(selected))
    }
  })

  return (
    <Box flexDirection="column">
      <Box
        borderStyle="round"
        borderColor="cyan"
        paddingX={1}
        paddingY={0}
        marginBottom={1}
        flexDirection="column"
      >
        <Text bold color="cyan">
          {title}
        </Text>
        {description && <Text dimColor>{description}</Text>}
      </Box>

      <Box
        flexDirection="column"
        borderStyle="round"
        borderColor="white"
        paddingX={1}
        paddingY={1}
        marginBottom={1}
      >
        {items.map((item, idx) => {
          const isSelected = selected.has(item.value)
          const isCursor = idx === cursor
          return (
            <Box key={item.value}>
              <Text
                backgroundColor={isCursor ? "blue" : undefined}
                color={isCursor ? "white" : isSelected ? "green" : undefined}
                bold={isCursor}
              >
                {isCursor ? "> " : "  "}
                {isSelected ? "[x]" : "[ ]"} {item.label}
              </Text>
              {item.hint && (
                <Text dimColor>
                  {"  "}-- {item.hint}
                </Text>
              )}
            </Box>
          )
        })}
      </Box>

      <Box borderStyle="round" borderColor="gray" paddingX={1} flexDirection="column">
        <Text bold>Controls:</Text>
        <Text dimColor> [Up/Down] Navigate | [Space] Toggle | [Enter] Confirm | [ESC] Cancel</Text>
        <Text>
          <Text color="green">
            Selected: {selected.size}/{items.length}
          </Text>
          <Text dimColor> | </Text>
          <Text dimColor>{selected.size > 0 ? Array.from(selected).join(", ") : "none"}</Text>
        </Text>
      </Box>
    </Box>
  )
}

function InputField({
  label,
  hint,
  value,
  onChange,
  onSubmit,
  error,
}: {
  label: string
  hint?: string
  value: string
  onChange: (v: string) => void
  onSubmit: (v: string) => void
  error?: string
}) {
  return (
    <Box flexDirection="column">
      <Box
        borderStyle="round"
        borderColor="cyan"
        paddingX={1}
        marginBottom={1}
        flexDirection="column"
      >
        <Text bold>{label}</Text>
        {hint && <Text dimColor>{hint}</Text>}
      </Box>
      {error && (
        <Box borderStyle="round" borderColor="red" paddingX={1} marginBottom={1}>
          <Text color="red">! {error}</Text>
        </Box>
      )}
      <Box borderStyle="round" borderColor="white" paddingX={1} paddingY={1}>
        <Text color="cyan" bold>
          {">"}{" "}
        </Text>
        <TextInput value={value} onChange={onChange} onSubmit={onSubmit} />
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
  const dirName = basename(cwd)
  const defaultProjectName = dirName.replace(/[^a-z0-9-]/gi, "-").toLowerCase() || "my-app"
  const inferredOwner = inferGithubOwner(cwd)
  const termuxDetected = isTermuxEnvironment()

  const [step, setStep] = useState<Step>("preset")
  const [presetId, setPresetId] = useState<PresetId | "custom">("recommended")
  const [projectName, setProjectName] = useState(defaultProjectName)
  const [githubOwner, setGithubOwner] = useState(inferredOwner)
  const [description, setDescription] = useState("My awesome project")
  const [projectType, setProjectType] = useState<ProjectTypeId>("plain")
  const [devInfra, setDevInfra] = useState<FeatureId[]>([])
  const [testing, setTesting] = useState<FeatureId[]>([])
  const [gitFeatures, setGitFeatures] = useState<FeatureId[]>([])
  const [release, setRelease] = useState<FeatureId[]>([])
  const [termuxMode, setTermuxMode] = useState<"auto" | "yes" | "no">(
    termuxDetected ? "yes" : "auto",
  )
  const [error, setError] = useState<string>("")

  const { exit } = useApp()

  useInput((input, key) => {
    if (key.escape) {
      onCancel()
      exit()
    }
  })

  const presetChoices: SelectItem[] = [
    ...getPresetChoices().map((p) => ({
      label: p.label,
      value: p.value,
    })),
    { label: "Custom - Manual selection", value: "custom" },
  ]

  const projectTypeItems = Object.entries(PROJECT_TYPES).map(([id, def]) => ({
    label: `${def.name} - ${def.description}`,
    value: id,
  }))

  const devInfraItems = Object.entries(FEATURES)
    .filter(([, def]) => def.group === "dev-infra")
    .map(([id, def]) => ({
      label: def.name,
      value: id,
      hint: def.description,
    }))

  const testingItems = Object.entries(FEATURES)
    .filter(([, def]) => def.group === "testing-quality")
    .map(([id, def]) => ({
      label: def.name,
      value: id,
      hint: def.description,
    }))

  const gitItems = Object.entries(FEATURES)
    .filter(([, def]) => def.group === "git-workflow")
    .map(([id, def]) => ({
      label: def.name,
      value: id,
      hint: def.description,
    }))

  const releaseItems = Object.entries(FEATURES)
    .filter(([, def]) => def.group === "release")
    .map(([id, def]) => ({
      label: def.name,
      value: id,
      hint: def.description,
    }))

  const validateProjectName = (value: string): string | undefined => {
    if (!value) return "Project name is required (e.g. my-awesome-app)"
    if (value !== value.toLowerCase()) return "Must be lowercase - npm requires it"
    if (!/^[a-z0-9-_@/]+$/.test(value))
      return "Only lowercase, numbers, dash, underscore, @, / allowed"
    if (value.length > 214) return "Name too long - max 214 chars"
    if (value.startsWith("-") || value.startsWith("_"))
      return "Cannot start with dash or underscore"
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

  const Header = () => (
    <Box
      borderStyle="double"
      borderColor="cyan"
      paddingX={2}
      paddingY={1}
      flexDirection="column"
      marginBottom={1}
    >
      <Box>
        <Text bold color="cyan">
          TEMPLATE BOOTSTRAP TUI
        </Text>
        <Text> </Text>
        <Text color="white" bold>
          v2.0.0
        </Text>
        <Text dimColor> | Ink + React | Modern</Text>
      </Box>
      <Box marginTop={1}>
        <Text dimColor>AI Agent software development template - Interactive setup wizard</Text>
      </Box>
      <Box marginTop={1}>
        <Text dimColor>Use keyboard to navigate, ESC to cancel at any time</Text>
      </Box>
    </Box>
  )

  const Footer = () => (
    <Box borderStyle="round" borderColor="gray" paddingX={1} marginTop={1} flexDirection="column">
      <Text dimColor>
        [ESC] Cancel | [Enter] Confirm | [Up/Down] Navigate | [Space] Toggle (multi-select)
      </Text>
      <Text dimColor>
        Current: {STEP_LABELS[step]} ({STEP_ORDER.indexOf(step) + 1}/{STEP_ORDER.length}) | CWD:{" "}
        {dirName}
      </Text>
    </Box>
  )

  const renderStep = () => {
    switch (step) {
      case "preset":
        return (
          <Box flexDirection="column">
            <Box
              borderStyle="round"
              borderColor="cyan"
              paddingX={1}
              marginBottom={1}
              flexDirection="column"
            >
              <Text bold color="cyan">
                Step 1/11: Select Preset
              </Text>
              <Text dimColor>
                Choose a preset or customize manually - Presets provide balanced defaults
              </Text>
            </Box>
            {termuxDetected && (
              <Box
                marginBottom={1}
                paddingX={1}
                borderStyle="round"
                borderColor="yellow"
                flexDirection="column"
              >
                <Text color="yellow" bold>
                  ! Termux detected
                </Text>
                <Text color="yellow">
                  Will optimize for Termux environment (memory limits, webpack fallback)
                </Text>
              </Box>
            )}
            <Box borderStyle="round" borderColor="white" padding={1} flexDirection="column">
              <Box marginBottom={1}>
                <Text bold>Available presets:</Text>
              </Box>
              <SelectInput
                items={presetChoices}
                onSelect={(item) => {
                  setPresetId(item.value as PresetId | "custom")
                  setStep("projectName")
                }}
              />
            </Box>
          </Box>
        )

      case "projectName":
        return (
          <InputField
            label="Step 2/11: Project Name"
            hint={`Default: ${defaultProjectName} | Lowercase, dash separated, max 214 chars`}
            value={projectName}
            onChange={setProjectName}
            error={error}
            onSubmit={(value) => {
              const err = validateProjectName(value)
              if (err) {
                setError(err)
                return
              }
              setError("")
              setStep("githubOwner")
            }}
          />
        )

      case "githubOwner":
        return (
          <InputField
            label="Step 3/11: GitHub Owner"
            hint={`Default: ${inferredOwner} | Used for CODEOWNERS, funding, security policy`}
            value={githubOwner}
            onChange={setGithubOwner}
            onSubmit={() => setStep("description")}
          />
        )

      case "description":
        return (
          <InputField
            label="Step 4/11: Description"
            hint="Max 200 chars, concise, describes purpose"
            value={description}
            onChange={setDescription}
            onSubmit={() => {
              if (presetId !== "custom") {
                setStep("confirm")
              } else {
                setStep("projectType")
              }
            }}
          />
        )

      case "projectType":
        return (
          <Box flexDirection="column">
            <Box
              borderStyle="round"
              borderColor="cyan"
              paddingX={1}
              marginBottom={1}
              flexDirection="column"
            >
              <Text bold>Step 5/11: Project Type</Text>
              <Text dimColor>Select the type of project you are creating</Text>
            </Box>
            <Box borderStyle="round" borderColor="white" padding={1} flexDirection="column">
              <Box marginBottom={1}>
                <Text bold>Types:</Text>
              </Box>
              <SelectInput
                items={projectTypeItems}
                onSelect={(item) => {
                  setProjectType(item.value as ProjectTypeId)
                  const typeDef = PROJECT_TYPES[item.value as ProjectTypeId]
                  const defaults = Object.entries(FEATURES)
                    .filter(([, def]) => {
                      if (typeDef.defaultFeatures && item.value in typeDef.defaultFeatures) {
                        return (typeDef.defaultFeatures as any)[item.value as FeatureId]
                      }
                      return def.defaultEnabled
                    })
                    .map(([id]) => id as FeatureId)
                  setDevInfra(defaults.filter((id) => FEATURES[id].group === "dev-infra"))
                  setTesting(defaults.filter((id) => FEATURES[id].group === "testing-quality"))
                  setGitFeatures(defaults.filter((id) => FEATURES[id].group === "git-workflow"))
                  setRelease(defaults.filter((id) => FEATURES[id].group === "release"))
                  setStep("devInfra")
                }}
              />
            </Box>
          </Box>
        )

      case "devInfra":
        return (
          <ModernMultiSelect
            title="Step 6/11: Dev & Infra"
            description="Docker, devcontainer, termux, etc."
            items={devInfraItems}
            initialSelected={devInfra}
            onSubmit={(selected) => {
              setDevInfra(selected as FeatureId[])
              if (selected.includes("termux")) {
                setStep("termuxMode")
              } else {
                setStep("testing")
              }
            }}
          />
        )

      case "termuxMode":
        return (
          <Box flexDirection="column">
            <Box
              borderStyle="round"
              borderColor="cyan"
              paddingX={1}
              marginBottom={1}
              flexDirection="column"
            >
              <Text bold>Step 7/11: Termux Mode</Text>
              <Text dimColor>How to handle Termux environment optimizations</Text>
            </Box>
            <Box borderStyle="round" borderColor="white" padding={1} flexDirection="column">
              <Box marginBottom={1}>
                <Text bold>Select mode:</Text>
              </Box>
              <SelectInput
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
            </Box>
          </Box>
        )

      case "testing":
        return (
          <ModernMultiSelect
            title="Step 8/11: Testing & Quality"
            description="Vitest, Playwright, cspell, knip, coverage, determinism"
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
          <ModernMultiSelect
            title="Step 9/11: Git & Workflow"
            description="Husky, commitlint, templates, renovate, stale-bot"
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
          <ModernMultiSelect
            title="Step 10/11: Release"
            description="Changesets, size-limit, publint"
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
        const enabled = Object.entries(answers.features).filter(([, v]) => v)
        const disabled = Object.entries(answers.features).filter(([, v]) => !v)
        return (
          <Box flexDirection="column">
            <Box
              borderStyle="double"
              borderColor="green"
              paddingX={1}
              paddingY={1}
              marginBottom={1}
              flexDirection="column"
            >
              <Text bold color="green">
                Step 11/11: Confirm & Execute
              </Text>
              <Text dimColor>Review your configuration before applying</Text>
            </Box>

            <Box
              borderStyle="round"
              borderColor="white"
              paddingX={1}
              paddingY={1}
              flexDirection="column"
              gap={1}
            >
              <Box flexDirection="column">
                <Text bold color="cyan">
                  -- Project Info --
                </Text>
                <Box paddingLeft={2} flexDirection="column">
                  <Text>
                    <Text bold>Name:</Text> {answers.projectName}
                  </Text>
                  <Text>
                    <Text bold>Description:</Text> {answers.projectDescription}
                  </Text>
                  <Text>
                    <Text bold>Owner:</Text> {answers.githubOwner}
                  </Text>
                  <Text>
                    <Text bold>Type:</Text> {answers.projectType}
                  </Text>
                  {answers.preset && (
                    <Text>
                      <Text bold>Preset:</Text> {answers.preset}
                    </Text>
                  )}
                </Box>
              </Box>

              <Box flexDirection="column">
                <Text bold color="green">
                  -- Enabled ({enabled.length}) --
                </Text>
                <Box paddingLeft={2}>
                  <Text color="green">{enabled.map(([k]) => k).join(", ") || "none"}</Text>
                </Box>
              </Box>

              <Box flexDirection="column">
                <Text bold color="gray">
                  -- Disabled ({disabled.length}) --
                </Text>
                <Box paddingLeft={2}>
                  <Text dimColor>{disabled.map(([k]) => k).join(", ") || "none"}</Text>
                </Box>
              </Box>

              <Box
                borderStyle="round"
                borderColor="yellow"
                paddingX={1}
                marginTop={1}
                flexDirection="column"
              >
                <Text bold color="yellow">
                  ! This will modify files in: {cwd}
                </Text>
                <Text dimColor>Backup will be created automatically, use --no-backup to skip</Text>
              </Box>
            </Box>

            <Box
              marginTop={1}
              borderStyle="round"
              borderColor="green"
              padding={1}
              flexDirection="column"
            >
              <Text bold>Ready to execute?</Text>
              <Box marginTop={1}>
                <SelectInput
                  items={[
                    { label: "[*] Execute setup", value: "yes" },
                    { label: "[ ] Cancel", value: "no" },
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
      <Header />
      <ProgressBar currentStep={step} />
      <Box marginY={1}>{renderStep()}</Box>
      <Footer />
    </Box>
  )
}
