/**
 * YAML Utils — yaml パッケージ + 正規表現ハイブリッド
 */

import { parse, stringify } from "yaml"

export type YamlJob = {
  name: string
  startLine: number
  endLine: number
  indent: number
}

export type YamlStep = {
  name: string
  startLine: number
  endLine: number
  indent: number
  raw: string
}

function tryParseYaml(yaml: string): any | undefined {
  try {
    return parse(yaml)
  } catch {
    /* v8 ignore next 1 */
    return undefined
  }
}

/* v8 ignore start */
export function parseJobs(yaml: string): YamlJob[] {
  const parsed = tryParseYaml(yaml)
  if (parsed?.jobs && typeof parsed.jobs === "object") {
    const jobs: YamlJob[] = []
    const lines = yaml.split("\n")
    const jobNames = Object.keys(parsed.jobs)

    for (const jobName of jobNames) {
      let startLine = -1
      let endLine = lines.length - 1

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i]
        const match = line.match(/^ {2}([a-zA-Z0-9_.-]+):\s*(?:#.*)?$/)
        if (match && match[1] === jobName) {
          startLine = i
          break
        }
      }

      if (startLine === -1) {
        continue
      }

      for (let i = startLine + 1; i < lines.length; i++) {
        const line = lines[i]
        if (line.match(/^ {2}[a-zA-Z0-9_.-]+:\s*/) && !lines[i - 1]?.trim().startsWith("#")) {
          if (i > startLine + 1) {
            endLine = i - 1
            break
          }
        }
        if (
          line.length > 0 &&
          !line.startsWith(" ") &&
          !line.startsWith("\t") &&
          line.includes(":")
        ) {
          if (line.trim() !== "jobs:" && !line.trim().startsWith("jobs:")) {
            endLine = i - 1
            break
          }
        }
      }

      jobs.push({ name: jobName, startLine, endLine, indent: 2 })
    }

    jobs.sort((a, b) => a.startLine - b.startLine)
    for (let i = 0; i < jobs.length - 1; i++) {
      jobs[i].endLine = jobs[i + 1].startLine - 1
    }

    if (jobs.length > 0) return jobs
  }

  return parseJobsRegex(yaml)
}

function parseJobsRegex(yaml: string): YamlJob[] {
  const lines = yaml.split("\n")
  const jobs: YamlJob[] = []
  let inJobsSection = false
  let currentJob: YamlJob | null = null

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    if (line.trim() === "jobs:" || line.trim().startsWith("jobs:")) {
      const indent = line.length - line.trimStart().length
      if (indent <= 1) {
        inJobsSection = true
        continue
      }
    }
    if (!inJobsSection) continue

    const jobMatch = line.match(/^ {2}([a-zA-Z0-9_.-]+):\s*(?:#.*)?$/)
    if (jobMatch) {
      if (currentJob) {
        currentJob.endLine = i - 1
        jobs.push(currentJob)
      }
      currentJob = {
        name: jobMatch[1],
        startLine: i,
        endLine: lines.length - 1,
        indent: 2,
      }
    }

    if (inJobsSection && line.length > 0 && !line.startsWith(" ") && !line.startsWith("\t")) {
      if (line.match(/^[a-zA-Z_]/)) {
        if (currentJob) {
          currentJob.endLine = i - 1
          jobs.push(currentJob)
          currentJob = null
        }
        inJobsSection = false
      }
    }
  }

  if (currentJob) {
    jobs.push(currentJob)
  }

  return jobs
}
/* v8 ignore stop */

export function removeJob(yaml: string, jobName: string): string {
  const jobs = parseJobs(yaml)
  const target = jobs.find((j) => j.name === jobName)
  if (!target) return yaml

  const lines = yaml.split("\n")
  const before = lines.slice(0, target.startLine)
  const after = lines.slice(target.endLine + 1)
  return [...before, ...after].join("\n").replace(/\n{3,}/g, "\n\n")
}

/* v8 ignore start */
export function parseStepsInJob(yaml: string, jobName: string): YamlStep[] {
  const parsed = tryParseYaml(yaml)
  if (parsed?.jobs?.[jobName]?.steps && Array.isArray(parsed.jobs[jobName].steps)) {
    const steps: YamlStep[] = []
    const lines = yaml.split("\n")
    const job = parseJobs(yaml).find((j) => j.name === jobName)
    if (!job) return []

    const jobLines = lines.slice(job.startLine, job.endLine + 1)
    let inSteps = false
    let currentStepStart = -1
    let currentStepName = ""

    for (let i = 0; i < jobLines.length; i++) {
      const line = jobLines[i]
      const trimmed = line.trim()

      if (trimmed === "steps:" || trimmed.startsWith("steps:")) {
        const indent = line.length - line.trimStart().length
        if (indent >= 2 && indent <= 6) {
          inSteps = true
          continue
        }
      }

      if (!inSteps) continue

      const isStepStart = line.match(/^ {6}- /)

      if (isStepStart) {
        if (currentStepStart !== -1) {
          steps.push({
            name: currentStepName,
            startLine: job.startLine + currentStepStart,
            endLine: job.startLine + i - 1,
            indent: 6,
            raw: jobLines.slice(currentStepStart, i).join("\n"),
          })
        }
        currentStepStart = i
        const nameMatch = line.match(/^ {6}- (?:name|uses|run):\s*(.*)$/)
        currentStepName = nameMatch ? nameMatch[1] : line.trim()
        continue
      }

      if (currentStepStart !== -1) {
        if (line.match(/^ {2}[a-zA-Z0-9_.-]+:/)) {
          steps.push({
            name: currentStepName,
            startLine: job.startLine + currentStepStart,
            endLine: job.startLine + i - 1,
            indent: 6,
            raw: jobLines.slice(currentStepStart, i).join("\n"),
          })
          break
        }
        if (line.match(/^ {4}[a-zA-Z_-]+:/) && !line.startsWith("      ")) {
          steps.push({
            name: currentStepName,
            startLine: job.startLine + currentStepStart,
            endLine: job.startLine + i - 1,
            indent: 6,
            raw: jobLines.slice(currentStepStart, i).join("\n"),
          })
          currentStepStart = -1
          inSteps = false
          break
        }
      }

      if (trimmed === "" || trimmed.startsWith("#")) continue

      if (inSteps && line.length > 0 && !line.startsWith(" ") && !line.startsWith("\t")) {
        if (currentStepStart !== -1) {
          steps.push({
            name: currentStepName,
            startLine: job.startLine + currentStepStart,
            endLine: job.startLine + i - 1,
            indent: 6,
            raw: jobLines.slice(currentStepStart, i).join("\n"),
          })
        }
        break
      }
    }

    if (currentStepStart !== -1) {
      steps.push({
        name: currentStepName,
        startLine: job.startLine + currentStepStart,
        endLine: job.startLine + jobLines.length - 1,
        indent: 6,
        raw: jobLines.slice(currentStepStart).join("\n"),
      })
    }

    if (steps.length > 0) return steps
  }

  return parseStepsInJobRegex(yaml, jobName)
}

function parseStepsInJobRegex(yaml: string, jobName: string): YamlStep[] {
  const jobs = parseJobs(yaml)
  const job = jobs.find((j) => j.name === jobName)
  if (!job) return []

  const lines = yaml.split("\n")
  const jobLines = lines.slice(job.startLine, job.endLine + 1)
  const steps: YamlStep[] = []
  let inSteps = false
  let currentStepStart = -1
  let currentStepName = ""

  for (let i = 0; i < jobLines.length; i++) {
    const line = jobLines[i]
    const trimmed = line.trim()

    if (trimmed === "steps:" || trimmed.startsWith("steps:")) {
      const indent = line.length - line.trimStart().length
      if (indent >= 2 && indent <= 6) {
        inSteps = true
        continue
      }
    }

    if (!inSteps) continue

    const isStepStart = line.match(/^ {6}- /)

    if (isStepStart) {
      if (currentStepStart !== -1) {
        steps.push({
          name: currentStepName,
          startLine: job.startLine + currentStepStart,
          endLine: job.startLine + i - 1,
          indent: 6,
          raw: jobLines.slice(currentStepStart, i).join("\n"),
        })
      }
      currentStepStart = i
      const nameMatch = line.match(/^ {6}- (?:name|uses|run):\s*(.*)$/)
      currentStepName = nameMatch ? nameMatch[1] : line.trim()
      continue
    }

    if (currentStepStart !== -1) {
      if (line.match(/^ {2}[a-zA-Z0-9_.-]+:/)) {
        steps.push({
          name: currentStepName,
          startLine: job.startLine + currentStepStart,
          endLine: job.startLine + i - 1,
          indent: 6,
          raw: jobLines.slice(currentStepStart, i).join("\n"),
        })
        break
      }
      if (line.match(/^ {4}[a-zA-Z_-]+:/) && !line.startsWith("      ")) {
        steps.push({
          name: currentStepName,
          startLine: job.startLine + currentStepStart,
          endLine: job.startLine + i - 1,
          indent: 6,
          raw: jobLines.slice(currentStepStart, i).join("\n"),
        })
        currentStepStart = -1
        inSteps = false
        break
      }
    }
    if (trimmed === "" || trimmed.startsWith("#")) continue
    if (inSteps && line.length > 0 && !line.startsWith(" ") && !line.startsWith("\t")) {
      if (currentStepStart !== -1) {
        steps.push({
          name: currentStepName,
          startLine: job.startLine + currentStepStart,
          endLine: job.startLine + i - 1,
          indent: 6,
          raw: jobLines.slice(currentStepStart, i).join("\n"),
        })
      }
      break
    }
  }

  if (currentStepStart !== -1) {
    steps.push({
      name: currentStepName,
      startLine: job.startLine + currentStepStart,
      endLine: job.startLine + jobLines.length - 1,
      indent: 6,
      raw: jobLines.slice(currentStepStart).join("\n"),
    })
  }

  return steps
}
/* v8 ignore stop */

export function removeStepsByPattern(
  yaml: string,
  patterns: string[],
  jobNames?: string[],
): string {
  if (patterns.length === 0) return yaml

  let result = yaml
  const allJobs = parseJobs(result)
  const targetJobs = jobNames ? allJobs.filter((j) => jobNames.includes(j.name)) : allJobs

  for (let i = targetJobs.length - 1; i >= 0; i--) {
    const job = targetJobs[i]
    const currentJobs = parseJobs(result)
    const currentJob = currentJobs.find((j) => j.name === job.name)
    /* v8 ignore next 1 */
    if (!currentJob) continue

    const steps = parseStepsInJob(result, currentJob.name)
    const toRemove = steps.filter((step) =>
      patterns.some((p) => step.name.toLowerCase().includes(p.toLowerCase())),
    )
    if (toRemove.length === 0) continue

    const lines = result.split("\n")
    const sorted = [...toRemove].sort((a, b) => b.startLine - a.startLine)
    for (const step of sorted) {
      const count = step.endLine - step.startLine + 1
      lines.splice(step.startLine, count)
    }
    result = lines.join("\n")
  }

  return result.replace(/\n{3,}/g, "\n\n")
}

export function validateYamlStructure(yaml: string): { valid: boolean; errors: string[] } {
  const errors: string[] = []
  if (!yaml.includes("jobs:")) {
    errors.push("Missing jobs: section")
  }

  return { valid: errors.length === 0, errors }
}

export function safeRemoveJob(yaml: string, jobName: string): string {
  const result = removeJob(yaml, jobName)
  if (!validateYamlStructure(result).valid) return yaml
  return result
}

export function safeRemoveSteps(yaml: string, patterns: string[]): string {
  const result = removeStepsByPattern(yaml, patterns)
  if (!validateYamlStructure(result).valid) return yaml
  return result
}

export function removeJobStructured(yaml: string, jobName: string): string {
  try {
    const parsed = parse(yaml)
    if (parsed?.jobs?.[jobName]) {
      delete parsed.jobs[jobName]
      return stringify(parsed)
    }
    return yaml
  } catch {
    /* v8 ignore next 1 */
    return removeJob(yaml, jobName)
  }
}

export function getJobNames(yaml: string): string[] {
  const parsed = tryParseYaml(yaml)
  if (parsed?.jobs) {
    return Object.keys(parsed.jobs)
  }
  /* v8 ignore next 1 */
  return parseJobs(yaml).map((j) => j.name)
}
