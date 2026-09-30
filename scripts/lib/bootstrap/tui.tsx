/** @jsxImportSource react */

import { execSync } from "node:child_process"
import { existsSync, readFileSync } from "node:fs"
import { basename } from "node:path"
import { Box, Text, useApp, useInput } from "ink"
import SelectInput from "ink-select-input"
import TextInput from "ink-text-input"
import React, { useEffect, useState } from "react"
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

type SelectItem = { label: string; value: string; hint?: string }

function MultiSelect({
  items,
  initialSelected,
  onSubmit,
}: {
  items: SelectItem[]
  initialSelected: string[]
  onSubmit: (selected: string[]) => void
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
      <Text>🔧 スペースで切替、Enterで確定、↑↓で移動</Text>
      {items.map((item, idx) => {
        const isSelected = selected.has(item.value)
        const isCursor = idx === cursor
        return (
          <Box key={item.value}>
            <Text color={isCursor ? "cyan" : undefined}>
              {isCursor ? "➡️ " : "  "}
              {isSelected ? "✅" : "⬜"} {item.label}
              {item.hint ? ` - ${item.hint}` : ""}
            </Text>
          </Box>
        )
      })}
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
      label: `${p.label} - ${p.hint || ""}`,
      value: p.value,
    })),
    { label: "🎨 Custom - 手動で選択", value: "custom" },
  ]

  const projectTypeItems = Object.entries(PROJECT_TYPES).map(([id, def]) => ({
    label: `${def.icon || "📦"} ${def.name} - ${def.description}`,
    value: id,
  }))

  const devInfraItems = Object.entries(FEATURES)
    .filter(([, def]) => def.group === "dev-infra")
    .map(([id, def]) => ({
      label: `${def.icon || "🔹"} ${def.name}`,
      value: id,
      hint: def.description,
    }))

  const testingItems = Object.entries(FEATURES)
    .filter(([, def]) => def.group === "testing-quality")
    .map(([id, def]) => ({
      label: `${def.icon || "🔹"} ${def.name}`,
      value: id,
      hint: def.description,
    }))

  const gitItems = Object.entries(FEATURES)
    .filter(([, def]) => def.group === "git-workflow")
    .map(([id, def]) => ({
      label: `${def.icon || "🔹"} ${def.name}`,
      value: id,
      hint: def.description,
    }))

  const releaseItems = Object.entries(FEATURES)
    .filter(([, def]) => def.group === "release")
    .map(([id, def]) => ({
      label: `${def.icon || "🔹"} ${def.name}`,
      value: id,
      hint: def.description,
    }))

  const validateProjectName = (value: string): string | undefined => {
    if (!value) return "❌ プロジェクト名は必須です (例: my-awesome-app)"
    if (value !== value.toLowerCase()) return "❌ 小文字のみ - npmは小文字を要求します"
    if (!/^[a-z0-9-_@/]+$/.test(value))
      return "❌ 小文字、数字、ダッシュ、アンダースコア、@、/ のみ"
    if (value.length > 214) return "❌ 名前が長すぎます - 最大214文字"
    if (value.startsWith("-") || value.startsWith("_"))
      return "❌ ダッシュやアンダースコアで開始できません"
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
      case "preset":
        return (
          <Box flexDirection="column">
            <Text color="cyan" bold>
              🚀 Template Bootstrap - プリセットを選択
            </Text>
            {termuxDetected && <Text>📱 Termux環境を検出 - 最適化を有効化します</Text>}
            <Box marginTop={1}>
              <SelectInput
                items={presetChoices}
                onSelect={(item) => {
                  setPresetId(item.value as PresetId | "custom")
                  setStep("projectName")
                }}
              />
            </Box>
            <Box marginTop={1}>
              <Text dimColor>ESCでキャンセル</Text>
            </Box>
          </Box>
        )

      case "projectName":
        return (
          <Box flexDirection="column">
            <Text bold>📦 プロジェクト名?</Text>
            <Text dimColor>デフォルト: {defaultProjectName}</Text>
            {error && <Text color="red">{error}</Text>}
            <Box>
              <Text>➡️ </Text>
              <TextInput
                value={projectName}
                onChange={setProjectName}
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
            </Box>
          </Box>
        )

      case "githubOwner":
        return (
          <Box flexDirection="column">
            <Text bold>👤 GitHubオーナー名?</Text>
            <Text dimColor>デフォルト: {inferredOwner}</Text>
            <Box>
              <Text>➡️ </Text>
              <TextInput
                value={githubOwner}
                onChange={setGithubOwner}
                onSubmit={() => setStep("description")}
              />
            </Box>
          </Box>
        )

      case "description":
        return (
          <Box flexDirection="column">
            <Text bold>📝 プロジェクト説明?</Text>
            <Box>
              <Text>➡️ </Text>
              <TextInput
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
            </Box>
          </Box>
        )

      case "projectType":
        return (
          <Box flexDirection="column">
            <Text bold>🏗️ プロジェクトタイプ?</Text>
            <SelectInput
              items={projectTypeItems}
              onSelect={(item) => {
                setProjectType(item.value as ProjectTypeId)
                // Initialize defaults based on type
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
        )

      case "devInfra":
        return (
          <Box flexDirection="column">
            <Text bold>🔧 Dev & Infra機能を選択</Text>
            <MultiSelect
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
          </Box>
        )

      case "termuxMode":
        return (
          <Box flexDirection="column">
            <Text bold>📱 Termux最適化モード?</Text>
            <SelectInput
              items={[
                { label: "🤖 Auto - 自動検出（推奨）", value: "auto" },
                { label: "✅ Yes - 常に有効", value: "yes" },
                { label: "❌ No - 無効", value: "no" },
              ]}
              onSelect={(item) => {
                setTermuxMode(item.value as any)
                setStep("testing")
              }}
            />
          </Box>
        )

      case "testing":
        return (
          <Box flexDirection="column">
            <Text bold>🧪 テスト & 品質機能を選択</Text>
            <MultiSelect
              items={testingItems}
              initialSelected={testing}
              onSubmit={(s) => {
                setTesting(s as FeatureId[])
                setStep("git")
              }}
            />
          </Box>
        )

      case "git":
        return (
          <Box flexDirection="column">
            <Text bold>🌿 Git & Workflow機能を選択</Text>
            <MultiSelect
              items={gitItems}
              initialSelected={gitFeatures}
              onSubmit={(s) => {
                setGitFeatures(s as FeatureId[])
                setStep("release")
              }}
            />
          </Box>
        )

      case "release":
        return (
          <Box flexDirection="column">
            <Text bold>🚀 リリース機能を選択</Text>
            <MultiSelect
              items={releaseItems}
              initialSelected={release}
              onSubmit={(s) => {
                setRelease(s as FeatureId[])
                setStep("confirm")
              }}
            />
          </Box>
        )

      case "confirm": {
        const answers = buildAnswers()
        return (
          <Box flexDirection="column">
            <Text bold color="green">
              ✅ 設定確認
            </Text>
            <Box flexDirection="column" marginTop={1}>
              <Text>📦 プロジェクト: {answers.projectName}</Text>
              <Text>📝 説明: {answers.projectDescription}</Text>
              <Text>👤 オーナー: {answers.githubOwner}</Text>
              <Text>🏗️ タイプ: {answers.projectType}</Text>
              {answers.preset && <Text>🎨 プリセット: {answers.preset}</Text>}
              <Text>
                🔧 有効機能:{" "}
                {Object.entries(answers.features)
                  .filter(([, v]) => v)
                  .map(([k]) => k)
                  .join(", ") || "なし"}
              </Text>
            </Box>
            <Box marginTop={1}>
              <SelectInput
                items={[
                  { label: "✅ 実行する", value: "yes" },
                  { label: "❌ キャンセル", value: "no" },
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
        )
      }
    }
  }

  return (
    <Box flexDirection="column" padding={1}>
      <Box marginBottom={1}>
        <Text color="cyan" bold>
          🚀 Template Bootstrap TUI v2.0.0
        </Text>
        <Text> - {step} </Text>
        <Text dimColor>({Object.keys(FEATURES).length}機能)</Text>
      </Box>
      {renderStep()}
    </Box>
  )
}
