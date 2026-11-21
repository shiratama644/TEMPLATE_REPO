import { z } from "zod"
import {
  featureNames,
  type Language,
  type Preset,
  presets,
  type Template,
  templates,
} from "./setup_manifest.ts"

const preset = z.enum(Object.keys(presets) as [Preset, ...Preset[]])
const language = z.enum(Object.keys(templates) as [Language, ...Language[]])
const template = z.enum(Object.values(templates).flat() as [Template, ...Template[]])
const feature = z.enum(featureNames)
export const nameSchema = z
  .string()
  .max(64)
  .regex(/^[a-z](?:[a-z0-9]|-(?=[a-z0-9]))*$/)
const configSchema = z.strictObject({
  preset: preset.optional(),
  language: language.optional(),
  template: template.optional(),
  name: nameSchema.optional(),
  description: z.string().optional(),
  features: z.array(feature).optional(),
})
const choicesSchema = configSchema.superRefine((o, ctx) => {
  if (o.language && o.template && !templates[o.language].includes(o.template))
    ctx.addIssue({
      code: "custom",
      path: ["template"],
      message: `${o.template} は ${o.language} に対応しません`,
    })
})

export function validateConfig(input: unknown): void {
  validateSchema(input, configSchema)
}
export function validateChoices(input: unknown): void {
  validateSchema(input, choicesSchema)
}
function validateSchema(input: unknown, schema: typeof configSchema | typeof choicesSchema): void {
  const result = schema.safeParse(input)
  if (result.success) return
  const issue = result.error.issues[0]
  if (issue.code === "unrecognized_keys")
    throw new Error(`設定ファイルに不明な項目があります: ${issue.keys.join(", ")}`)
  const key = issue.path[0]
  const value =
    input && typeof input === "object" ? (input as Record<string, unknown>)[String(key)] : undefined
  if (issue.code === "custom") throw new Error(issue.message)
  if (key === "preset") throw new Error(`不明なプリセット: ${value}`)
  if (key === "language") throw new Error(`不明な言語: ${value}`)
  if (key === "template") throw new Error(`不明なテンプレート: ${value}`)
  if (key === "features")
    throw new Error(`機能に不明な値または配列以外が指定されました: ${JSON.stringify(value)}`)
  if (key === "name")
    throw new Error("プロジェクト名は英小文字で始まる kebab-case（最大 64 文字）にしてください")
  if (key === "description") throw new Error("説明は文字列で指定してください")
  throw new Error(`設定ファイルが不正です: ${issue.message}`)
}
